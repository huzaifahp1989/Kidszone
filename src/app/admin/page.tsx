'use client';

import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@/components';
import { TrashIcon, PlusIcon, TrophyIcon, Users, Edit, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
  contactnumber?: string | null;
  contact_number?: string | null;
  contactNumber?: string | null;
  points: number;
  weeklypoints: number;
  monthlypoints: number;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'surahs' | 'hadiths' | 'system' | 'rewards'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  const [pickingWinner, setPickingWinner] = useState(false);
  
  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', password: '', points: 0, weeklypoints: 0, monthlypoints: 0 });
  
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
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

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
          monthlypoints: editForm.monthlypoints
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
    return user.contactnumber || user.contact_number || user.contactNumber || '';
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getMobileNumber(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.uid || '').includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-8 rounded-2xl mb-8 flex justify-between items-center shadow-xl">
          <div>
            <h1 className="text-4xl font-bold mb-2">🔐 Admin Dashboard</h1>
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
            🎙️ Recordings
          </button>
          <button
            onClick={() => router.push('/admin/setup')}
            className="px-5 py-2.5 rounded-lg font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-teal-300 flex items-center gap-2 whitespace-nowrap"
          >
            🛠️ DB Setup
          </button>
          <button
            onClick={() => router.push('/admin/announcements')}
            className="px-5 py-2.5 rounded-lg font-bold transition bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-amber-300 flex items-center gap-2 whitespace-nowrap"
          >
            📰 Announcements
          </button>
          <div className="w-px h-8 bg-slate-300 mx-2 self-center hidden sm:block"></div>
          
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No users found</td>
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
                                <div className="text-xs text-slate-500">{user.email || '—'}</div>
                                <div className="text-xs text-slate-500">{getMobileNumber(user) || '—'}</div>
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
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setEditForm({
                                  name: user.name || '',
                                  password: '',
                                  points: user.points || 0,
                                  weeklypoints: user.weeklypoints || 0,
                                  monthlypoints: user.monthlypoints || 0
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
              <h2 className="text-2xl font-bold text-islamic-dark">🏆 Weekly Rewards</h2>
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
                 {pickingWinner ? 'Picking...' : '🎲 Pick Winner Now'}
               </Button>
               
               {winner && (
                 <div className="mt-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                    <h4 className="text-2xl font-bold text-yellow-800 mb-2">🎉 Winner Selected! 🎉</h4>
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
                <h3 className="font-bold text-yellow-700 mb-4">🔄 Reset Functions</h3>
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
                    📅 Reset Monthly Leaderboard
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
                    🏆 Reset Weekly Leaderboard
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
                    ⚠️ Reset All User Points
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-islamic-blue p-6 rounded-lg">
                <h3 className="font-bold text-islamic-blue mb-4">📊 System Statistics</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Total Users:</strong> {users.length}</p>
                  <p><strong>Questions Answered:</strong> 15,678</p>
                  <p><strong>Quizzes Completed:</strong> 4,523</p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-islamic-green p-6 rounded-lg">
                <h3 className="font-bold text-islamic-green mb-4">🛠️ Database</h3>
                <div className="space-y-3">
                  <Button onClick={handleSeedStories} variant="success" className="w-full">
                    🌱 Seed Default Stories
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
                  <span className="truncate">{editingUser?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Mobile</span>
                  <span className="truncate">{editingUser ? (getMobileNumber(editingUser) || '—') : '—'}</span>
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
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Enter new password"
                minLength={6}
              />
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
                  ✓ Add
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
