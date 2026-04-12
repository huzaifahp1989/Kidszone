'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/stories';
import { WeeklyWinnerDisplay } from '@/components/WeeklyWinnerDisplay';
import { Mic, Square, RotateCcw, ArrowLeft, Send, Play, Pause, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function StoryRecordingPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [storyId, setStoryId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fetchStory = useCallback(async (id: string) => {
    console.log('Fetching story with ID:', id);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Supabase error fetching story:', error);
        throw error;
      }
      console.log('Story fetched:', data);
      setStory(data);
    } catch (error) {
      console.error('Error fetching story:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Handle params whether it's a Promise or object
    Promise.resolve(params).then((resolvedParams) => {
      setStoryId(resolvedParams.id);
    });
  }, [params]);

  useEffect(() => {
    if (storyId) {
      fetchStory(storyId);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [storyId, fetchStory]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      const supportedType = preferredTypes.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
      mediaRecorderRef.current = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
        if (mediaRecorderRef.current?.state === 'inactive') {
          const blobType = mediaRecorderRef.current.mimeType || chunksRef.current[0]?.type || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.onstop = () => {
        return;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (typeof mediaRecorderRef.current.requestData === 'function') {
        mediaRecorderRef.current.requestData();
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSubmit = async () => {
    if (!audioBlob || !story) return;

    if (!user) {
      alert('Please sign in to submit recordings and earn points!');
      router.push('/signin');
      return;
    }

    if (recordingTime < 30) {
      alert('Recording is too short! Please record at least 30 seconds.');
      return;
    }
    if (recordingTime > 180) { // 3 minutes
      alert('Recording is too long! Please keep it under 3 minutes.');
      return;
    }

    setUploading(true);
    try {
      // 0. Check daily limit (Client-side check)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count, error: countError } = await supabase
        .from('recordings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (countError) throw countError;
      
      if (count !== null && count >= 3) {
        alert('You have reached your daily limit of 3 recordings. Please come back tomorrow!');
        setUploading(false);
        return;
      }

      // 1. Upload to Storage
      const blobType = audioBlob.type || 'audio/webm';
      const extension = blobType.includes('mp4')
        ? 'm4a'
        : blobType.includes('mpeg')
          ? 'mp3'
          : blobType.includes('ogg')
            ? 'ogg'
            : 'webm';
      const filename = `${user.id}/${Date.now()}_${story.id}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('story-recordings')
        .upload(filename, audioBlob, { contentType: blobType });

      if (uploadError) throw uploadError;

      // 2. Insert into DB
      const { data: insertedRecord, error: dbError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          story_id: story.id,
          audio_path: filename,
          duration: recordingTime,
          status: 'submitted'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Send Email Notification (Non-blocking)
      fetch('/api/stories/submit-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childName: user.email?.split('@')[0] || 'Kid', // Fallback name
          storyTitle: story.title,
          duration: recordingTime,
          audioPath: filename,
          recordingId: insertedRecord.id
        })
      }).catch(err => console.error('Failed to send notification:', err));

      alert('JazakAllah Khair! Your recording has been sent for review. Points will be added after approval.');
      router.push('/my-recordings');

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to submit recording. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-primary"></div></div>;
  if (!story) return <div className="text-center py-20">Story not found</div>;

  return (
    <div className="min-h-screen bg-islamic-light py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <WeeklyWinnerDisplay />
        <Link href="/stories" className="inline-flex items-center text-gray-600 hover:text-islamic-primary mb-6 transition">
          <ArrowLeft size={20} className="mr-2" /> Back to Stories
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Story Content */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{story.title}</h1>
            <div className="prose prose-lg text-gray-600 mb-6">
              <p>{story.summary}</p>
              {story.content && <div className="mt-6 pt-6 border-t border-gray-100">{story.content}</div>}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="font-bold text-yellow-800 mb-3 flex items-center">
                <AlertCircle size={20} className="mr-2" /> Recording Tips
              </h3>
              <ul className="space-y-2 text-sm text-yellow-900">
                <li>• Find a quiet place without background noise</li>
                <li>• Speak clearly and slowly</li>
                <li>• No background music please</li>
                <li>• Keep it between 30 seconds and 3 minutes</li>
              </ul>
            </div>
          </div>

          {/* Recorder Interface */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col justify-center items-center text-center">
            
            {/* Timer */}
            <div className="mb-8">
              <div className={`text-6xl font-mono font-bold ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
                {formatTime(recordingTime)}
              </div>
              <p className="text-gray-400 text-sm mt-2">Max 3:00</p>
            </div>

            {/* Controls */}
            {!audioBlob ? (
              <div className="space-y-6 w-full">
                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 mx-auto"
                  >
                    <Mic size={40} />
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 mx-auto"
                  >
                    <Square size={32} fill="currentColor" />
                  </button>
                )}
                <p className="text-gray-500 font-medium">
                  {isRecording ? 'Recording in progress...' : 'Tap mic to start'}
                </p>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="bg-gray-100 rounded-xl p-4 w-full">
                  <audio controls src={audioUrl!} className="w-full" />
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={resetRecording}
                    className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition flex items-center"
                  >
                    <RotateCcw size={20} className="mr-2" /> Re-record
                  </button>
                  
                  <button 
                    onClick={handleSubmit}
                    disabled={uploading || recordingTime < 30 || recordingTime > 180}
                    className="px-8 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Sending...' : 'Submit Recording'} <Send size={20} className="ml-2" />
                  </button>
                </div>
                
                {(recordingTime < 30) && (
                  <p className="text-red-500 text-sm">Recording is too short (min 30s)</p>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
