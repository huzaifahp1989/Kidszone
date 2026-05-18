'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRecording } from '@/types/admin';
import { formatDate } from '@/lib/utils';
import { ArrowLeftIcon, PlayIcon, PauseIcon, CheckIcon, XIcon, TrashIcon, AlertTriangleIcon, Loader2, DownloadIcon } from 'lucide-react';

export default function AdminRecordingDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [recording, setRecording] = useState<AdminRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Form State
  const [points, setPoints] = useState(10);
  const [feedback, setFeedback] = useState('');
  const [publish, setPublish] = useState(true);
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    Promise.resolve(params).then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    const url = recording?.audio_url;
    if (!url) return;

    // Setup audio context for waveform analysis
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, [recording?.audio_url, audioContext]);

  const fetchRecording = useCallback(async (recordingId: string) => {
    try {
      const res = await fetch(`/api/admin/recordings/${recordingId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecording(data);
      setAudioError(null);
      setIsPlaying(false);
      if (audio) {
        audio.pause();
        setAudio(null);
      }
      if (typeof data.points_awarded === 'number') setPoints(data.points_awarded);
      if (typeof data.admin_notes === 'string' && data.admin_notes.length > 0) setFeedback(data.admin_notes);
      else if (typeof data.admin_feedback === 'string' && data.admin_feedback.length > 0) setFeedback(data.admin_feedback);
      if (data.is_published !== undefined) setPublish(data.is_published);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [audio]);

  useEffect(() => {
    if (id) {
      fetchRecording(id);
    }
  }, [fetchRecording, id]);

  const togglePlay = () => {
    if (!recording?.audio_url) return;

    if (!audio) {
      const newAudio = new Audio(recording.audio_url);
      newAudio.onloadedmetadata = () => {
        setDuration(newAudio.duration);
      };
      newAudio.ontimeupdate = () => {
        setCurrentTime(newAudio.currentTime);
      };
      newAudio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      newAudio.onerror = () => {
        setIsPlaying(false);
        setAudioError('Audio failed to load. Try downloading it instead.');
      };
      setAudio(newAudio);
      newAudio
        .play()
        .then(() => {
          setAudioError(null);
          setIsPlaying(true);
          // Setup analyser for waveform
          if (audioContext && !analyser) {
            const source = audioContext.createMediaElementSource(newAudio);
            const analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 256;
            source.connect(analyserNode);
            analyserNode.connect(audioContext.destination);
            setAnalyser(analyserNode);

            // Generate waveform data
            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const updateWaveform = () => {
              if (isPlaying) {
                analyserNode.getByteFrequencyData(dataArray);
                const waveform = Array.from(dataArray).map(val => val / 255);
                setWaveformData(waveform);
                requestAnimationFrame(updateWaveform);
              }
            };
            updateWaveform();
          }
        })
        .catch(() => {
          setIsPlaying(false);
          setAudioError('Playback was blocked. Click download to open the file directly.');
        });
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio
          .play()
          .then(() => {
            setAudioError(null);
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(false);
            setAudioError('Playback was blocked. Click download to open the file directly.');
          });
      }
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to approve this recording and award points?')) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/recordings/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points,
          feedback,
          publish,
          admin_id: 'admin' // In real app, get current admin ID
        })
      });

      if (!res.ok) throw new Error('Failed to approve');

      // Send notification to user
      if (recording?.profile?.email) {
        try {
          await fetch('/api/notify-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recordingId: id,
              status: 'approved',
              points,
              feedback,
              childName: recording.profile.name || recording.child_name,
              childEmail: recording.profile.email
            })
          });
        } catch (notifyError) {
          console.error('Failed to send approval notification:', notifyError);
          // Don't fail the approval if notification fails
        }
      }

      alert('Recording approved successfully! User has been notified.');
      fetchRecording(id);
    } catch (error) {
      alert('Error approving recording');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to REJECT this recording? No points will be awarded.')) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/recordings/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });

      if (!res.ok) throw new Error('Failed to reject');

      // Send notification to user
      if (recording?.profile?.email) {
        try {
          await fetch('/api/notify-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recordingId: id,
              status: 'rejected',
              points: 0,
              feedback,
              childName: recording.profile.name || recording.child_name,
              childEmail: recording.profile.email
            })
          });
        } catch (notifyError) {
          console.error('Failed to send rejection notification:', notifyError);
          // Don't fail the rejection if notification fails
        }
      }

      alert('Recording rejected. User has been notified.');
      fetchRecording(id);
    } catch (error) {
      alert('Error rejecting recording');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to DELETE this recording? This action cannot be undone.')) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/admin/recordings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) throw new Error('Failed to delete');
      
      alert('Recording deleted successfully!');
      router.push('/admin');
    } catch (error) {
      alert('Error deleting recording');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const seekTo = (time: number) => {
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = async () => {
    if (!recording?.audio_url) return;
    try {
      const response = await fetch(recording.audio_url);
      const blob = await response.blob();
      const ext = recording.audio_path?.split('.').pop() || 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${recording.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setAudioError('Download failed. Try opening the audio URL directly.');
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-500">Loading...</div>;
  if (!recording) return <div className="flex justify-center items-center min-h-screen text-gray-500">Recording not found</div>;
  const durationSeconds = recording.duration ?? recording.duration_seconds ?? 0;
  const submittedAt = recording.submitted_at || recording.created_at;
  const extension = (recording.audio_path?.split('.').pop() || 'webm').toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => router.push('/admin/recordings')}
          className="mb-6 flex items-center text-gray-500 hover:text-gray-800 transition"
        >
          <ArrowLeftIcon size={18} className="mr-1" /> Back to List
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Header Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {recording.story?.title || recording.title || <span className="text-islamic-primary italic">Studio Recording</span>}
                  </h1>
                  <p className="text-gray-500">By {recording.profile?.name || recording.child_name || 'Unknown Kid'}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border capitalize ${
                  recording.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                  recording.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-yellow-100 text-yellow-800 border-yellow-200'
                }`}>
                  {recording.status}
                </div>
              </div>
              
              {(recording.story?.summary || recording.description) && (
                <div className="bg-gray-50 p-4 rounded-xl mb-4">
                  <p className="text-sm text-gray-600 italic">
                    "{recording.story?.summary || recording.description}"
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>📅 {formatDate(submittedAt)}</span>
                <span>⏱️ {Math.floor(durationSeconds / 60)}:{(durationSeconds % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Audio Player Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Recording Audio</h3>

              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl p-6">
                {/* Waveform Visualization */}
                <div className="mb-4 h-16 flex items-end justify-center gap-1">
                  {waveformData.length > 0 ? (
                    waveformData.slice(0, 64).map((amplitude, index) => (
                      <div
                        key={index}
                        className="bg-islamic-primary rounded-sm transition-all duration-75"
                        style={{
                          width: '3px',
                          height: `${Math.max(4, amplitude * 60)}px`,
                          opacity: isPlaying ? 1 : 0.6
                        }}
                      />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-gray-400 border-t-islamic-primary rounded-full animate-spin mx-auto mb-2"></div>
                        <span className="text-xs">Loading waveform...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div
                    className="h-2 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      seekTo(percentage * duration);
                    }}
                  >
                    <div
                      className="h-full bg-islamic-primary transition-all duration-300 rounded-full"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={!recording.audio_url}
                    className="w-14 h-14 rounded-full bg-islamic-primary hover:bg-islamic-primary/80 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isPlaying ? <PauseIcon size={24} fill="currentColor" /> : <PlayIcon size={24} fill="currentColor" className="ml-1" />}
                  </button>

                  {recording.audio_url && (
                    <button
                      onClick={handleDownload}
                      className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition shadow-lg"
                      title="Download Audio"
                    >
                      <DownloadIcon size={20} />
                    </button>
                  )}
                </div>
              </div>

              {recording.audio_url && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-1">Native player (use if play button above fails):</p>
                  <audio
                    src={recording.audio_url}
                    controls
                    preload="auto"
                    onError={() => setAudioError('Audio failed to load. Try downloading it instead.')}
                    className="w-full"
                  />
                </div>
              )}

              {audioError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-700 text-sm flex items-center">
                    <AlertTriangleIcon size={16} className="mr-2" />
                    {audioError}
                  </div>
                </div>
              )}

              {!recording.audio_url && !audioError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-700 text-sm flex items-center">
                    <AlertTriangleIcon size={16} className="mr-2" />
                    Audio file missing or unavailable
                  </div>
                </div>
              )}
            </div>

            {/* Admin Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Review & Feedback</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points to Award (0-20)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="20"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-primary outline-none"
                    disabled={recording.status !== 'submitted'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (Feedback)</label>
                  <textarea 
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-primary outline-none"
                    placeholder="Great job! Try to speak a bit louder next time."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="publish"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                    className="w-4 h-4 text-islamic-primary rounded focus:ring-islamic-primary"
                  />
                  <label htmlFor="publish" className="text-sm text-gray-700">Publish to public gallery</label>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Actions */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <h3 className="font-bold text-gray-900 mb-4">Actions</h3>
              
              <div className="space-y-3">
                {recording.status === 'submitted' ? (
                  <>
                    <button 
                      onClick={handleApprove}
                      disabled={processing}
                      className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="animate-spin" /> : <CheckIcon size={18} />}
                      Approve & Award
                    </button>
                    
                    <button 
                      onClick={handleReject}
                      disabled={processing}
                      className="w-full py-3 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing ? <Loader2 className="animate-spin" /> : <XIcon size={18} />}
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg text-gray-500 text-sm">
                    This recording has been {recording.status}.
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <button 
                    onClick={handleDelete}
                    disabled={processing}
                    className="w-full py-3 px-4 text-gray-500 hover:text-red-600 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <TrashIcon size={16} />
                    Delete Recording
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
