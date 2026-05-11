'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@/components';
import { TrashIcon, PlusIcon, TrophyIcon, Users, Edit, Search, Loader2, ClipboardCheck, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserProgressMonth = {
  key: string;
  label: string;
  quizAttempts: number;
  pledgeLogs: number;
  pledgeRecitations: number;
  gameSessions: number;
  totalActivities: number;
  certificateQualified: boolean;
};

type UserProgressResponse = {
  user?: { uid: string; name?: string; email?: string };
  totals?: {
    quizAttempts: number;
    pledgeLogs: number;
    pledgeRecitations: number;
    gameSessions: number;
    certificateMonths: number;
  };
  monthlyBreakdown?: UserProgressMonth[];
};

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  points: number;
}

interface Surah {
  id: string;
  number: number;
  englishName: string;
}

interface Hadith {
  id: string;
  english: string;
  topic: string;
}

interface User {
  uid: string;
  name: string;
  email: string;
  parent_email?: string | null;
  parentEmail?: string | null;
  contactnumber?: string | null;
  contact_number?: string | null;
  contactNumber?: string | null;
  madrasahname?: string | null;
  madrasah_name?: string | null;
  madrasahName?: string | null;
  winner_note?: string | null;
  winner_notes?: string | null;
  about_me?: string | null;
  about_text?: string | null;
  contactNumberNormalized?: string;
  parentEmailNormalized?: string;
  madrasahNameNormalized?: string;
  winnerAboutNormalized?: string;
  winnerFormSubmittedAtNormalized?: string;
  winnerTick?: boolean;
  points: number;
  weeklypoints: number;
  monthlypoints: number;
  role: string;
  quizAttempts?: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'winner-contacts' | 'competitions' | 'questions' | 'surahs' | 'hadiths' | 'system' | 'rewards' | 'claims'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [pickingWinner, setPickingWinner] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', password: '', points: 0, weeklypoints: 0, monthlypoints: 0, winnerTick: false });

  // Pending Claims State
  type PendingClaim = {
    id: string;
    user_id: string;
    user_name: string | null;
    claim_type: string;
    claim_label: string;
    points_requested: number;
    status: string;
    notes: string | null;
    created_at: string;
    reviewed_at: string | null;
  };
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsFilter, setClaimsFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [claimsSetupRequired, setClaimsSetupRequired] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [processingClaim, setProcessingClaim] = useState<string | null>(null);

  // Competition (Masjid Al-Aqsa) submissions scoring
  type CompetitionSubmission = {
    id: string;
    competition_key: string;
    full_name: string;
    email: string;
    status: string;
    question_marks: number[];
    bonus_marks: number;
    main_score: number;
    total_score: number;
    admin_notes?: string | null;
    reviewed_at?: string | null;
    created_at?: string;
  };
  const [competitionKey, setCompetitionKey] = useState('masjid-al-aqsa-quiz-2026');
  const [competitionFilter, setCompetitionFilter] = useState<'submitted' | 'approved' | 'rejected' | 'all'>('submitted');
  const [competitionLoading, setCompetitionLoading] = useState(false);
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  const [competitionSetupRequired, setCompetitionSetupRequired] = useState(false);
  const [competitionSubmissions, setCompetitionSubmissions] = useState<CompetitionSubmission[]>([]);
  const [editingCompetition, setEditingCompetition] = useState<CompetitionSubmission | null>(null);
  const [competitionEdit, setCompetitionEdit] = useState<{
    questionMarks: number[];
    bonusMarks: number;
    status: 'submitted' | 'approved' | 'rejected';
    adminNotes: string;
  }>({ questionMarks: Array.from({ length: 10 }, () => 0), bonusMarks: 0, status: 'submitted', adminNotes: '' });

  // Email Reminder State
  const [sendingReminder, setSendingReminder] = useState<string | null>(null); // userId or 'all'
  const [reminderSent, setReminderSent] = useState<Record<string, boolean>>({});
  const [progressUser, setProgressUser] = useState<User | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressData, setProgressData] = useState<UserProgressResponse | null>(null);
  
  // Add User State
  const [newUser, setNewUser] = useState({ name: '', points: 0, weeklypoints: 0, monthlypoints: 0 });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    // Check authentication
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
    }
  }, [router]);

  useEffect(() => {
    if (activeTab === 'rewards') {
      fetchCurrentWinner();
    } else if (activeTab === 'users' || activeTab === 'winner-contacts') {
      fetchUsers();
    } else if (activeTab === 'claims') {
      fetchClaims();
    } else if (activeTab === 'competitions') {
      fetchCompetitionSubmissions();
    }
  }, [activeTab]);

  const fetchCompetitionSubmissions = async (
    status = competitionFilter,
    key = competitionKey
  ) => {
    setCompetitionLoading(true);
    setCompetitionError(null);
    setCompetitionSetupRequired(false);
    try {
      const res = await fetch(
        `/api/admin/competition-submissions?competitionKey=${encodeURIComponent(key)}&status=${encodeURIComponent(status)}`,
        { headers: { 'x-admin-auth': 'true' }, cache: 'no-store' }
      );
      const data = await res.json();
      if (data.setupRequired) {
        setCompetitionSetupRequired(true);
        setCompetitionSubmissions([]);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load submissions');
      setCompetitionSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
    } catch (err: any) {
      setCompetitionError(err?.message || 'Could not load competition submissions');
    } finally {
      setCompetitionLoading(false);
    }
  };

  const openCompetitionEditor = (submission: CompetitionSubmission) => {
    setEditingCompetition(submission);
    setCompetitionEdit({
      questionMarks: Array.isArray(submission.question_marks) && submission.question_marks.length === 10
        ? submission.question_marks.map((x) => (Number(x) >= 1 ? 1 : 0))
        : Array.from({ length: 10 }, () => 0),
      bonusMarks: Number(submission.bonus_marks ?? 0),
      status: (submission.status as any) || 'submitted',
      adminNotes: String(submission.admin_notes || ''),
    });
  };

  const saveCompetitionEditor = async () => {
    if (!editingCompetition) return;
    try {
      const res = await fetch('/api/admin/competition-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({
          id: editingCompetition.id,
          questionMarks: competitionEdit.questionMarks,
          bonusMarks: competitionEdit.bonusMarks,
          status: competitionEdit.status,
          adminNotes: competitionEdit.adminNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      const updated = data.submission;
      setCompetitionSubmissions((prev) => prev.map((s) => (s.id === updated?.id ? updated : s)));
      setEditingCompetition(null);
      alert('Scores updated.');
    } catch (err: any) {
      alert(err?.message || 'Failed to update scores');
    }
  };

  const fetchClaims = async (status = claimsFilter) => {
    setClaimsLoading(true);
    setClaimsError(null);
    setClaimsSetupRequired(false);
    try {
      const res = await fetch(`/api/admin/pending-claims?status=${status}`, {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.setupRequired) {
        setClaimsSetupRequired(true);
        setClaims([]);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load claims');
      setClaims(Array.isArray(data.claims) ? data.claims : []);
    } catch (err: any) {
      setClaimsError(err?.message || 'Could not load claims');
    } finally {
      setClaimsLoading(false);
    }
  };

  const sendReminder = async (userId: string) => {
    const key = userId;
    setSendingReminder(key);
    try {
      const body = userId === 'all' ? { all: true } : { userId };
      const res = await fetch('/api/admin/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      alert(data.message || 'Reminder sent!');
      if (userId !== 'all') setReminderSent((prev) => ({ ...prev, [userId]: true }));
    } catch (err: any) {
      alert(err?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleClaim = async (claimId: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this claim?`)) return;
    setProcessingClaim(claimId);
    try {
      const res = await fetch('/api/admin/pending-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ claimId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert(data.message || `Claim ${action}d.`);
      fetchClaims();
    } catch (err: any) {
      alert(err?.message || `Failed to ${action} claim`);
    } finally {
      setProcessingClaim(null);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      console.log('Fetching users from Admin API...');
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('Users API response:', data);
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      
      if (Array.isArray(data.users)) {
        console.log(`Setting ${data.users.length} users to state`);
        setUsers(data.users);
      } else {
        console.warn('API returned users in unexpected format:', data);
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      // Fallback to Supabase client if API fails (e.g. during dev)
      // fetchUsersFallback();
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name) return alert('Name is required');
    setAddingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify(newUser)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUsers([data.user, ...users]);
      setShowAddModal(false);
      setNewUser({ name: '', points: 0, weeklypoints: 0, monthlypoints: 0 });
      alert('User added successfully');
    } catch (err: any) {
      console.error('Error adding user:', err);
      alert('Failed to add user: ' + err.message);
    } finally {
      setAddingUser(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-auth': 'true'
        },
        body: JSON.stringify({
          uid: editingUser.uid,
          name: editForm.name,
          password: editForm.password?.length >= 6 ? editForm.password : undefined,
          points: editForm.points,
          weeklypoints: editForm.weeklypoints,
          monthlypoints: editForm.monthlypoints,
          winnerTick: editForm.winnerTick
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Update local state
      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, name: editForm.name || u.name, points: editForm.points, weeklypoints: editForm.weeklypoints, monthlypoints: editForm.monthlypoints } : u));
      setEditingUser(null);
      alert('User updated successfully');
    } catch (err: any) {
      console.error('Error updating user:', err);
      alert('Failed to update user: ' + err.message);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/users?uid=${uid}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      
      setUsers(users.filter(u => u.uid !== uid));
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user: ' + err.message);
    }
  };

  const openUserProgress = async (user: User) => {
    setProgressUser(user);
    setProgressData(null);
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/admin/user-progress?uid=${user.uid}&months=12`, {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load user progress');
      setProgressData(data);
    } catch (err: any) {
      alert(err?.message || 'Failed to load progress');
      setProgressUser(null);
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchCurrentWinner = async () => {
    try {
      const { data: winnerData } = await supabase
        .from('weekly_winners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (winnerData) {
         const { data: userPoints } = await supabase
            .from('users_points')
            .select('badges, level')
            .eq('user_id', winnerData.winner_user_id)
            .maybeSingle();
            
         setWinner({
             winner_id: winnerData.winner_user_id,
             weekly_points: winnerData.winning_score,
             badges: userPoints?.badges || 0,
             level: userPoints?.level || 1,
             created_at: winnerData.created_at
         });
      }
    } catch (e) {
      console.error('Error fetching winner:', e);
    }
  };

  // Sample data
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', question: 'How many pillars are there?', category: 'Quran', difficulty: 'Easy', points: 10 },
    { id: '2', question: 'What is Zakat?', category: 'Quran', difficulty: 'Medium', points: 15 },
  ]);

  const [surahs, setSurahs] = useState<Surah[]>([
    { id: '1', number: 36, englishName: 'Yaseen' },
    { id: '2', number: 18, englishName: 'Al-Kahf' },
  ]);

  const [hadiths, setHadiths] = useState<Hadith[]>([
    { id: '1', english: 'The best among you are those who are best to their families...', topic: 'Manners' },
  ]);

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleDeleteSurah = (id: string) => {
    setSurahs(surahs.filter(s => s.id !== id));
  };

  const handleDeleteHadith = (id: string) => {
    setHadiths(hadiths.filter(h => h.id !== id));
  };

  const handlePickWinner = async () => {
    setPickingWinner(true);
    try {
      const { data, error } = await supabase.rpc('generate_weekly_winner');
      if (error) throw error;
      setWinner(data);
      fetchCurrentWinner(); 
    } catch (err) {
      console.error(err);
      alert('Failed to pick winner: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setPickingWinner(false);
    }
  };

  const handleSeedStories = async () => {
    if (!confirm('This will add default stories to the database. Continue?')) return;
    try {
      const res = await fetch('/api/admin/seed-stories', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully added ${data.count} stories!`);
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (err) {
      alert('Error seeding stories');
    }
  };

  const getMobileNumber = (user: User) => {
    return user.contactNumberNormalized || user.contactnumber || user.contact_number || user.contactNumber || '';
  };

  const getParentEmail = (user: User) => {
    return user.parentEmailNormalized || user.parent_email || user.parentEmail || '';
  };

  const getMadrasahName = (user: User) => {
    return user.madrasahNameNormalized || user.madrasahname || user.madrasah_name || user.madrasahName || '';
  };

  const getWinnerAbout = (user: User) => {
    return user.winnerAboutNormalized || user.winner_note || user.winner_notes || user.about_me || user.about_text || '';
  };

  const getWinnerFormSubmittedAt = (user: User) => {
    return user.winnerFormSubmittedAtNormalized || '';
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMobileNumber(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.uid || '').includes(searchTerm)
  );

  const winnerContactUsers = filteredUsers.filter((user) => {
    return Boolean(
      getWinnerFormSubmittedAt(user) ||
      getParentEmail(user) ||
      getMobileNumber(user) ||
      getMadrasahName(user) ||
      getWinnerAbout(user)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-8 rounded-2xl mb-8 flex justify-between items-center shadow-xl">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-lg opacity-90">Manage users, content, and system settings</p>
          </div>
          <Button 
            variant="outline" 
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => {
              localStorage.removeItem('admin_auth');
              router.push('/admin/login');
            }}
          >
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap overflow-x-auto pb-2">
          <button
            onClick={() => router.push('/admin/recordings')}
            className="px-5 py-2.5 rounded-lg font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300 flex items-center gap-2 whitespace-nowrap"
          >
            Recordings
          </button>
          <button
            onClick={() => router.push('/admin/setup')}
            className="px-5 py-2.5 rounded-lg font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-teal-300 flex items-center gap-2 whitespace-nowrap"
          >
            DB Setup
          </button>
          <button
            onClick={() => router.push('/admin/announcements')}
            className="px-5 py-2.5 rounded-lg font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-amber-300 flex items-center gap-2 whitespace-nowrap"
          >
            Announcements
          </button>
          <div className="w-px h-8 bg-slate-300 mx-2 self-center hidden sm:block"></div>
          
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'claims'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ClipboardCheck size={18} /> Claims
          </button>

          <button
            onClick={() => setActiveTab('competitions')}
            className={`px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'competitions'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrophyIcon size={18} /> Competitions
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users size={18} /> Users
          </button>

          <button
            onClick={() => setActiveTab('winner-contacts')}
            className={`px-5 py-2.5 rounded-lg font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'winner-contacts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrophyIcon size={18} /> Winner Contacts
          </button>
          
          {['questions', 'surahs', 'hadiths', 'rewards', 'system'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2.5 rounded-lg font-bold transition whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">Pending Reward Claims</h2>
              <div className="flex flex-wrap gap-2 items-center">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setClaimsFilter(f); fetchClaims(f); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition ${
                      claimsFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  onClick={() => fetchClaims()}
                  className="px-4 py-1.5 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            {claimsSetupRequired && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 space-y-3">
                <p className="font-bold text-amber-800">Setup Required</p>
                <p className="text-amber-700 text-sm">The <code>pending_reward_claims</code> table does not exist yet.</p>
                <p className="text-amber-700 text-sm">Run <strong>CREATE_PENDING_CLAIMS.sql</strong> in your Supabase SQL Editor to enable this feature.</p>
              </div>
            )}

            {claimsError && !claimsSetupRequired && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{claimsError}</div>
            )}

            {!claimsSetupRequired && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Points</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {claimsLoading ? (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">Loading claims...</td></tr>
                      ) : claims.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">No {claimsFilter === 'all' ? '' : claimsFilter} claims found.</td></tr>
                      ) : claims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{claim.user_name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{claim.user_id.slice(0, 12)}...</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{claim.claim_label}</span>
                          </td>
                          <td className="px-5 py-4 font-bold text-emerald-700">+{claim.points_requested}</td>
                          <td className="px-5 py-4 text-sm text-slate-600 max-w-[200px] truncate">{claim.notes || '-'}</td>
                          <td className="px-5 py-4 text-xs text-slate-500">{new Date(claim.created_at).toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                              claim.status === 'approved' ? 'bg-green-100 text-green-700'
                              : claim.status === 'rejected' ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                            }`}>{claim.status}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {claim.status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  disabled={processingClaim === claim.id}
                                  onClick={() => handleClaim(claim.id, 'approve')}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  {processingClaim === claim.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  disabled={processingClaim === claim.id}
                                  onClick={() => handleClaim(claim.id, 'reject')}
                                  className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Reviewed {claim.reviewed_at ? new Date(claim.reviewed_at).toLocaleDateString() : ''}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!confirm('Send a progress reminder email to all users?')) return;
                    sendReminder('all');
                  }}
                  disabled={sendingReminder === 'all'}
                  className="whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Mail size={16} />
                  {sendingReminder === 'all' ? 'Sending\u2026' : 'Send All Reminders'}
                </button>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="whitespace-nowrap flex items-center gap-2"
                >
                  <PlusIcon size={18} /> Add User
                </Button>
              </div>
            </div>

            {/* Add User Modal */}
            <Modal
              isOpen={showAddModal}
              onClose={() => setShowAddModal(false)}
              title="Add New User"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Enter user name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Total Points</label>
                  <input
                    type="number"
                    value={newUser.points}
                    onChange={(e) => setNewUser({ ...newUser, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Points</label>
                    <input
                      type="number"
                      value={newUser.weeklypoints}
                      onChange={(e) => setNewUser({ ...newUser, weeklypoints: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Points</label>
                    <input
                      type="number"
                      value={newUser.monthlypoints}
                      onChange={(e) => setNewUser({ ...newUser, monthlypoints: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button onClick={handleAddUser} disabled={addingUser}>
                    {addingUser ? <Loader2 className="animate-spin" /> : 'Add User'}
                  </Button>
                </div>
              </div>
            </Modal>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Points</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Weekly</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quiz Takes</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No users found</td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                {user.name?.charAt(0) || 'U'}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{user.name || 'Unknown'}</div>
                                <div className="text-xs text-slate-500">{user.email || '-'}</div>
                                <div className="text-xs text-slate-500">{getMobileNumber(user) || '-'}</div>
                                <div className="text-xs text-slate-500">Parent: {getParentEmail(user) || '-'}</div>
                                <div className="text-xs text-slate-500">Madrasah: {getMadrasahName(user) || '-'}</div>
                                <div className="text-xs text-slate-500 max-w-[350px] truncate" title={getWinnerAbout(user) || ''}>
                                  About: {getWinnerAbout(user) || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-bold">{user.points}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.weeklypoints}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.monthlypoints}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-semibold">{user.quizAttempts ?? 0}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openUserProgress(user)}
                              className="text-emerald-600 hover:text-emerald-900 mr-3 p-2 hover:bg-emerald-50 rounded-full transition-colors"
                              title="View Progress"
                            >
                              {String.fromCodePoint(0x1F4CA)}
                            </button>
                            <button
                              disabled={sendingReminder === user.uid || reminderSent[user.uid]}
                              onClick={() => {
                                if (!user.email || user.email.endsWith('@local')) {
                                  alert('This user has no real email address.');
                                  return;
                                }
                                sendReminder(user.uid);
                              }}
                              className="text-sky-600 hover:text-sky-900 mr-3 p-2 hover:bg-sky-50 rounded-full transition-colors disabled:opacity-40"
                              title={reminderSent[user.uid] ? "Reminder sent" : "Send progress reminder email"}
                            >
                              {sendingReminder === user.uid
                                ? <Loader2 size={18} className="animate-spin" />
                                : reminderSent[user.uid]
                                  ? <span className="text-xs font-bold text-emerald-600">&#10003;</span>
                                  : <Mail size={18} />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowEditPassword(false);
                                setEditForm({
                                  name: user.name || '',
                                  password: '',
                                  points: user.points || 0,
                                  weeklypoints: user.weeklypoints || 0,
                                  monthlypoints: user.monthlypoints || 0,
                                  winnerTick: user.winnerTick ?? false
                                });
                              }}
                              className="text-indigo-600 hover:text-indigo-900 mr-4 p-2 hover:bg-indigo-50 rounded-full transition-colors"
                              title="Edit Points"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.uid)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete User"
                            >
                              <TrashIcon size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Winner Contacts Tab */}
        {activeTab === 'winner-contacts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800">Winner Contact Submissions</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by name/email/phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Child</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent Email</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Number</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Madrasah</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">About Child</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Loading submissions...</td>
                      </tr>
                    ) : winnerContactUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No winner contact submissions found.</td>
                      </tr>
                    ) : (
                      winnerContactUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4 align-top">
                            <div className="font-semibold text-slate-800">{user.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 mt-1">{user.email || '-'}</div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700 align-top">{getParentEmail(user) || '-'}</td>
                          <td className="px-5 py-4 text-sm text-slate-700 align-top">{getMobileNumber(user) || '-'}</td>
                          <td className="px-5 py-4 text-sm text-slate-700 align-top">{getMadrasahName(user) || '-'}</td>
                          <td className="px-5 py-4 text-sm text-slate-700 max-w-[420px] whitespace-pre-wrap break-words align-top">{getWinnerAbout(user) || '-'}</td>
                          <td className="px-5 py-4 text-xs text-slate-500 align-top">
                            {getWinnerFormSubmittedAt(user) ? new Date(getWinnerFormSubmittedAt(user)).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Competitions Tab */}
        {activeTab === 'competitions' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800">Competition Scoring</h2>
                <p className="text-sm text-slate-600">Edit marks for submissions (Masjid Al-Aqsa quiz).</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Competition key</label>
                  <input
                    value={competitionKey}
                    onChange={(e) => setCompetitionKey(e.target.value)}
                    className="w-full sm:w-[320px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="masjid-al-aqsa-quiz-2026"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Status</label>
                  <select
                    value={competitionFilter}
                    onChange={(e) => {
                      const v = e.target.value as any;
                      setCompetitionFilter(v);
                      fetchCompetitionSubmissions(v, competitionKey);
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="submitted">submitted</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="all">all</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => fetchCompetitionSubmissions(competitionFilter, competitionKey)}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {competitionSetupRequired && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 space-y-3">
                <p className="font-bold text-amber-800">Setup Required</p>
                <p className="text-amber-700 text-sm">
                  Run <strong>20260511_admin_competition_score_editor.sql</strong> in Supabase SQL editor to enable admin scoring.
                </p>
              </div>
            )}

            {competitionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {competitionError}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-indigo-700 text-white">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Main</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Bonus</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Total</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Submitted</th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {competitionLoading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">Loading submissions...</td>
                      </tr>
                    ) : competitionSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">No submissions found.</td>
                      </tr>
                    ) : (
                      competitionSubmissions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800">{s.full_name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 mt-1">{s.id}</div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-700">{s.email}</td>
                          <td className="px-5 py-4 text-sm font-bold capitalize text-slate-700">{s.status}</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{s.main_score ?? 0}/10</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-800">{s.bonus_marks ?? 0}/5</td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-900">{s.total_score ?? 0}/15</td>
                          <td className="px-5 py-4 text-xs text-slate-500">
                            {s.created_at ? new Date(s.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => openCompetitionEditor(s)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                            >
                              <Edit size={16} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Modal
              isOpen={Boolean(editingCompetition)}
              onClose={() => setEditingCompetition(null)}
              title="Edit Competition Scores"
            >
              <div className="space-y-4">
                <div className="text-sm text-slate-600">
                  <div><strong>Name:</strong> {editingCompetition?.full_name}</div>
                  <div><strong>Email:</strong> {editingCompetition?.email}</div>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800">Main questions (10 × 1 mark)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {competitionEdit.questionMarks.map((v, idx) => (
                      <label key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={v === 1}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCompetitionEdit((prev) => {
                              const next = [...prev.questionMarks];
                              next[idx] = checked ? 1 : 0;
                              return { ...prev, questionMarks: next };
                            });
                          }}
                        />
                        Q{idx + 1}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Bonus marks (0–5)</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={competitionEdit.bonusMarks}
                      onChange={(e) => setCompetitionEdit((p) => ({ ...p, bonusMarks: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700">Status</label>
                    <select
                      value={competitionEdit.status}
                      onChange={(e) => setCompetitionEdit((p) => ({ ...p, status: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                    >
                      <option value="submitted">submitted</option>
                      <option value="approved">approved</option>
                      <option value="rejected">rejected</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Admin notes (optional)</label>
                  <textarea
                    value={competitionEdit.adminNotes}
                    onChange={(e) => setCompetitionEdit((p) => ({ ...p, adminNotes: e.target.value }))}
                    className="w-full min-h-[90px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Notes for this submission..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingCompetition(null)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCompetitionEditor}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:opacity-95"
                  >
                    Save
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-islamic-dark">Quiz Questions</h2>
              <Button onClick={() => setShowAddModal(true)} variant="success" size="lg">
                <PlusIcon className="inline mr-2" size={20} /> Add Question
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-islamic-blue text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Question</th>
                      <th className="px-6 py-4 text-left">Category</th>
                      <th className="px-6 py-4 text-left">Difficulty</th>
                      <th className="px-6 py-4 text-left">Points</th>
                      <th className="px-6 py-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(q => (
                      <tr key={q.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">{q.question.substring(0, 30)}...</td>
                        <td className="px-6 py-4">{q.category}</td>
                        <td className="px-6 py-4">{q.difficulty}</td>
                        <td className="px-6 py-4">{q.points}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Surahs Tab */}
        {activeTab === 'surahs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-islamic-dark">Quranic Surahs</h2>
              <Button onClick={() => setShowAddModal(true)} variant="success" size="lg">
                <PlusIcon className="inline mr-2" size={20} /> Add Surah
              </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-islamic-green text-white">
                    <tr>
                      <th className="px-6 py-4 text-left">Surah Number</th>
                      <th className="px-6 py-4 text-left">English Name</th>
                      <th className="px-6 py-4 text-left">Arabic Name</th>
                      <th className="px-6 py-4 text-left">Verses</th>
                      <th className="px-6 py-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surahs.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">{s.number}</td>
                        <td className="px-6 py-4">{s.englishName}</td>
                        <td className="px-6 py-4">-</td>
                        <td className="px-6 py-4">-</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDeleteSurah(s.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Hadiths Tab */}
        {activeTab === 'hadiths' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-islamic-dark">Hadith Collection</h2>
              <Button onClick={() => setShowAddModal(true)} variant="success" size="lg">
                <PlusIcon className="inline mr-2" size={20} /> Add Hadith
              </Button>
            </div>

            <div className="grid gap-4">
              {hadiths.map(h => (
                <div key={h.id} className="bg-white p-6 rounded-lg border-2 border-gray-300 hover:border-islamic-green">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-islamic-dark mb-2">{h.english.substring(0, 60)}...</p>
                      <p className="text-sm text-gray-600">Topic: {h.topic}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHadith(h.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <TrashIcon size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-islamic-dark">Weekly Rewards</h2>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
               <h3 className="text-xl font-bold mb-4">Pick Weekly Winner</h3>
               <p className="mb-6 text-gray-600">
                 Randomly select a winner from the top 20 weekly point earners.
               </p>
               
               <Button 
                  onClick={handlePickWinner} 
                  variant="warning" 
                  size="lg"
                  disabled={pickingWinner}
               >
                 <TrophyIcon className="inline mr-2" />
                 {pickingWinner ? 'Picking...' : 'Pick Winner Now'}
               </Button>
               
               {winner && (
                 <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                    <h4 className="text-2xl font-bold text-yellow-800 mb-2">Winner Selected!</h4>
                    <div className="text-lg space-y-2">
                       <p><strong>User ID:</strong> {winner.winner_id}</p>
                       <p><strong>Weekly Points:</strong> {winner.weekly_points}</p>
                       <p><strong>Badges:</strong> {winner.badges}</p>
                       <p><strong>Level:</strong> {winner.level}</p>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-islamic-dark">System Management</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-yellow-50 border-l-4 border-islamic-gold p-6 rounded-lg">
                <h3 className="font-bold text-yellow-700 mb-4">Reset Functions</h3>
                <div className="space-y-3">
                  <Button
                    variant="warning"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/reset-points', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-auth': 'true',
                          },
                          body: JSON.stringify({ scope: 'monthly' }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error || 'Failed');
                        alert(`Monthly leaderboard reset. Updated ${json.users_points_updated} rows.`);
                      } catch (e: any) {
                        alert(e?.message || 'Failed to reset monthly leaderboard');
                      }
                    }}
                  >
                    Reset Monthly Leaderboard
                  </Button>
                  <Button
                    variant="warning"
                    className="w-full"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/cron/reset-weekly', { method: 'GET' });
                        const json = await res.json();
                        alert(json.success ? 'Weekly leaderboard reset' : `Failed: ${json.error || 'Unknown error'}`);
                      } catch (e: any) {
                        alert(e?.message || 'Failed to reset weekly leaderboard');
                      }
                    }}
                  >
                    Reset Weekly Leaderboard
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={async () => {
                      if (!confirm('This will set ALL users points to 0. Are you sure?')) return;
                      try {
                        const res = await fetch('/api/admin/reset-points', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-admin-auth': 'true',
                          },
                          body: JSON.stringify({ scope: 'all' }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error || 'Failed');
                        alert(`All points reset. Updated ${json.users_points_updated} rows.`);
                      } catch (e: any) {
                        alert(e?.message || 'Failed to reset all user points');
                      }
                    }}
                  >
                    Reset All User Points
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-islamic-blue p-6 rounded-lg">
                <h3 className="font-bold text-islamic-blue mb-4">System Statistics</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Total Users:</strong> {users.length}</p>
                  <p><strong>Questions Answered:</strong> 15,678</p>
                  <p><strong>Quizzes Completed:</strong> 4,523</p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-islamic-green p-6 rounded-lg">
                <h3 className="font-bold text-islamic-green mb-4">Database</h3>
                <div className="space-y-3">
                  <Button onClick={handleSeedStories} variant="success" className="w-full">
                    Seed Default Stories
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        <Modal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser?.name}`}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Email</span>
                  <span className="truncate">{editingUser?.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Mobile</span>
                  <span className="truncate">{editingUser ? (getMobileNumber(editingUser) || '-') : '-'}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password (min 6 chars)</label>
              <div className="relative">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  className="w-full px-3 py-2 pr-16 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-indigo-600 hover:underline"
                  aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                >
                  {showEditPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Leave blank to keep existing password.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Points</label>
              <input
                type="number"
                value={editForm.points}
                onChange={(e) => setEditForm({...editForm, points: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weekly Points</label>
              <input
                type="number"
                value={editForm.weeklypoints}
                onChange={(e) => setEditForm({...editForm, weeklypoints: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Points</label>
              <input
                type="number"
                value={editForm.monthlypoints}
                onChange={(e) => setEditForm({...editForm, monthlypoints: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                id="winner-tick"
                type="checkbox"
                checked={editForm.winnerTick}
                onChange={(e) => setEditForm({ ...editForm, winnerTick: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="winner-tick" className="text-sm text-slate-700">
                Show winner tick on leaderboard
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleUpdateUser} variant="primary" className="flex-1">
                Save Changes
              </Button>
              <Button onClick={() => setEditingUser(null)} variant="secondary" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={!!progressUser}
          onClose={() => {
            setProgressUser(null);
            setProgressData(null);
          }}
          title={`User Progress: ${progressUser?.name || 'User'}`}
        >
          <div className="space-y-4">
            {progressLoading ? (
              <div className="text-slate-500">Loading progress...</div>
            ) : !progressData ? (
              <div className="text-slate-500">No progress data found.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Quizzes</p>
                    <p className="font-bold text-slate-800">{progressData.totals?.quizAttempts ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Pledge Logs</p>
                    <p className="font-bold text-slate-800">{progressData.totals?.pledgeLogs ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Recitations</p>
                    <p className="font-bold text-slate-800">{progressData.totals?.pledgeRecitations ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-xs text-slate-500">Games</p>
                    <p className="font-bold text-slate-800">{progressData.totals?.gameSessions ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                    <p className="text-xs text-amber-700">Cert Months</p>
                    <p className="font-bold text-amber-700">{progressData.totals?.certificateMonths ?? 0}</p>
                  </div>
                </div>

                <div className="max-h-72 overflow-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Month</th>
                        <th className="px-3 py-2 text-left">Quiz</th>
                        <th className="px-3 py-2 text-left">Games</th>
                        <th className="px-3 py-2 text-left">Pledge</th>
                        <th className="px-3 py-2 text-left">Certificate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(progressData.monthlyBreakdown || []).map((m) => (
                        <tr key={m.key} className="border-t border-slate-100">
                          <td className="px-3 py-2">{m.label}</td>
                          <td className="px-3 py-2">{m.quizAttempts}</td>
                          <td className="px-3 py-2">{m.gameSessions}</td>
                          <td className="px-3 py-2">{m.pledgeLogs}</td>
                          <td className="px-3 py-2">
                            {m.certificateQualified ? (
                              <span className="text-emerald-700 font-semibold">Well Done</span>
                            ) : (
                              <span className="text-slate-500">Not Yet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Add Content Modal (Generic) */}
        {activeTab !== 'users' && (
          <Modal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title={
              activeTab === 'questions'
                ? 'Add New Question'
                : activeTab === 'surahs'
                ? 'Add New Surah'
                : 'Add New Hadith'
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-2">Enter Details</label>
                <textarea
                  className="w-full border-2 border-gray-300 rounded-lg p-3 h-24 focus:border-islamic-blue"
                  placeholder="Enter content here..."
                />
              </div>
              <div className="flex gap-3">
                <Button variant="success" className="flex-1">
                  âœ“ Add
                </Button>
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
