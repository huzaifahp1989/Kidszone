'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, BookOpen, Megaphone, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

const QUESTION_CATEGORIES = [
  'Quran Basics',
  'Duas',
  'Salah & Wudu',
  'Seerah',
  'Islamic Manners',
  'Hadith',
  'Prophets',
  'Quran Stories',
  'Akhlaq',
];

type QuestionRow = {
  id: string;
  category: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  explanation: string;
  difficulty: string;
};

type StoryRow = {
  id: string;
  title: string;
  summary: string;
  content: string;
  age_min: number;
  age_max: number;
  is_active: boolean;
};

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

export default function AdminContentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'questions' | 'stories'>('questions');
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [qForm, setQForm] = useState({
    category: 'Quran Basics',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer_index: 0,
    explanation: '',
    difficulty: 'Medium',
  });

  const [sForm, setSForm] = useState({
    title: '',
    summary: '',
    content: '',
    age_min: 5,
    age_max: 12,
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/admin/questions', { headers: { 'x-admin-auth': 'true' }, cache: 'no-store' }),
        fetch('/api/admin/stories', { headers: { 'x-admin-auth': 'true' }, cache: 'no-store' }),
      ]);
      const qJson = await qRes.json();
      const sJson = await sRes.json();
      if (qRes.ok) setQuestions(qJson.questions || []);
      if (sRes.ok) setStories(sJson.stories || []);
    } catch {
      setMessage('Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addQuestion = async () => {
    setMessage(null);
    const options = qForm.options.map((o) => o.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ ...qForm, options }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add question');
      setQuestions((prev) => [json.question, ...prev]);
      setQForm({ ...qForm, question_text: '', options: ['', '', '', ''], explanation: '' });
      setMessage('Question added.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add question');
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!window.confirm('Delete this question?')) return;
    const res = await fetch(`/api/admin/questions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-auth': 'true' },
    });
    if (res.ok) setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addStory = async () => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(sForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to add story');
      setStories((prev) => [...prev, json.story].sort((a, b) => a.title.localeCompare(b.title)));
      setSForm({ title: '', summary: '', content: '', age_min: 5, age_max: 12, is_active: true });
      setMessage('Story added.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add story');
    }
  };

  const deleteStory = async (id: string) => {
    if (!window.confirm('Delete this story?')) return;
    const res = await fetch(`/api/admin/stories?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-auth': 'true' },
    });
    if (res.ok) setStories((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <button type="button" onClick={() => router.push('/admin')} className="rounded-full bg-white p-2 shadow-sm hover:bg-gray-100">
            <ArrowLeftIcon size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content CMS</h1>
            <p className="text-gray-500">Manage quiz questions and stories without code</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('questions')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'questions' ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            Quiz questions
          </button>
          <button
            type="button"
            onClick={() => setTab('stories')}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === 'stories' ? 'bg-violet-600 text-white' : 'bg-white text-gray-700 border'}`}
          >
            Stories
          </button>
          <Link
            href="/admin/announcements"
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            <Megaphone size={16} />
            Announcements →
          </Link>
        </div>

        {message ? <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm">{message}</div> : null}

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500">Loading…</div>
        ) : tab === 'questions' ? (
          <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Plus size={18} />
                Add question
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={qForm.category}
                  onChange={(e) => setQForm({ ...qForm, category: e.target.value })}
                  className="rounded-lg border px-3 py-2"
                >
                  {QUESTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={qForm.difficulty}
                  onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value })}
                  className="rounded-lg border px-3 py-2"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <textarea
                value={qForm.question_text}
                onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                placeholder="Question text"
                className="mt-3 w-full rounded-lg border px-3 py-2"
                rows={2}
              />
              {qForm.options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => {
                    const options = [...qForm.options];
                    options[i] = e.target.value;
                    setQForm({ ...qForm, options });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="mt-2 w-full rounded-lg border px-3 py-2"
                />
              ))}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-sm font-medium">Correct option #</label>
                <select
                  value={qForm.correct_answer_index}
                  onChange={(e) => setQForm({ ...qForm, correct_answer_index: Number(e.target.value) })}
                  className="rounded-lg border px-2 py-1"
                >
                  {qForm.options.map((_, i) => (
                    <option key={i} value={i}>{i + 1}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={qForm.explanation}
                onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                placeholder="Explanation (optional)"
                className="mt-3 w-full rounded-lg border px-3 py-2"
                rows={2}
              />
              <button type="button" onClick={addQuestion} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500">
                Save question
              </button>
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-5 py-3 font-bold">{questions.length} questions in database</div>
              <div className="divide-y max-h-[480px] overflow-y-auto">
                {questions.map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{q.question_text}</p>
                      <p className="text-xs text-gray-500">{q.category} · {q.difficulty}</p>
                    </div>
                    <button type="button" onClick={() => deleteQuestion(q.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <BookOpen size={18} />
                Add story
              </h2>
              <input
                value={sForm.title}
                onChange={(e) => setSForm({ ...sForm, title: e.target.value })}
                placeholder="Title"
                className="mb-2 w-full rounded-lg border px-3 py-2"
              />
              <textarea
                value={sForm.summary}
                onChange={(e) => setSForm({ ...sForm, summary: e.target.value })}
                placeholder="Short summary"
                className="mb-2 w-full rounded-lg border px-3 py-2"
                rows={2}
              />
              <textarea
                value={sForm.content}
                onChange={(e) => setSForm({ ...sForm, content: e.target.value })}
                placeholder="Full story content"
                className="mb-2 w-full rounded-lg border px-3 py-2"
                rows={6}
              />
              <div className="flex flex-wrap gap-3">
                <input
                  type="number"
                  value={sForm.age_min}
                  onChange={(e) => setSForm({ ...sForm, age_min: Number(e.target.value) })}
                  className="w-24 rounded-lg border px-3 py-2"
                  min={1}
                />
                <input
                  type="number"
                  value={sForm.age_max}
                  onChange={(e) => setSForm({ ...sForm, age_max: Number(e.target.value) })}
                  className="w-24 rounded-lg border px-3 py-2"
                  min={1}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sForm.is_active} onChange={(e) => setSForm({ ...sForm, is_active: e.target.checked })} />
                  Active
                </label>
              </div>
              <button type="button" onClick={addStory} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500">
                Save story
              </button>
            </section>

            <section className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="border-b px-5 py-3 font-bold">{stories.length} stories</div>
              <div className="divide-y max-h-[480px] overflow-y-auto">
                {stories.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{s.title}</p>
                      <p className="text-xs text-gray-500">{s.summary.slice(0, 80)}{s.summary.length > 80 ? '…' : ''}</p>
                    </div>
                    <button type="button" onClick={() => deleteStory(s.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
