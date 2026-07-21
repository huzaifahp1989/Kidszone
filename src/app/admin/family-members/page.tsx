'use client';

import React, { useState } from 'react';
import { PlusIcon, TrashIcon, Loader2 } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  username: string;
  age: string;
  password: string;
}

interface CreatedMember {
  uid: string;
  username: string;
  name: string;
  age: number;
  email: string;
}

export default function AdminFamilyMembersPage() {
  const [familyEmail, setFamilyEmail] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([
    { id: '1', name: '', username: '', age: '', password: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdMembers, setCreatedMembers] = useState<CreatedMember[]>([]);

  const handleMemberChange = (id: string, field: keyof FamilyMember, value: string) => {
    setMembers(
      members.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const addMemberRow = () => {
    setMembers([
      ...members,
      {
        id: Date.now().toString(),
        name: '',
        username: '',
        age: '',
        password: '',
      },
    ]);
  };

  const removeMemberRow = (id: string) => {
    if (members.length > 1) {
      setMembers(members.filter((m) => m.id !== id));
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = 'KZ-';
    for (let i = 0; i < 9; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  };

  const generateAllPasswords = () => {
    setMembers(
      members.map((m) => ({
        ...m,
        password: m.password || generateRandomPassword(),
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setCreatedMembers([]);

    if (!familyEmail.trim()) {
      setError('Please enter a family email.');
      return;
    }

    const validMembers = members.filter(
      (m) => m.name.trim() || m.username.trim() || m.age.trim() || m.password.trim()
    );

    if (validMembers.length === 0) {
      setError('Please add at least one learner.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/family-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          familyEmail: familyEmail.trim(),
          members: validMembers.map((m) => ({
            name: m.name.trim(),
            username: m.username.trim(),
            age: m.age.trim() === '' ? 0 : parseInt(m.age.trim(), 10),
            password: m.password.trim(),
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create family members');
      }

      setSuccess(true);
      setCreatedMembers(data.createdMembers || []);
      setFamilyEmail('');
      setMembers([{ id: '1', name: '', username: '', age: '', password: '' }]);
    } catch (err: any) {
      setError(err?.message || 'Failed to create family members');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📚 Add Family Members
          </h1>
          <p className="text-gray-600 mb-8">
            Create multiple learner accounts under one family email. Each learner gets their own unique username and can earn points independently.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && createdMembers.length > 0 && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              <p className="font-bold mb-4">✅ Successfully Created Learners!</p>
              <div className="space-y-3">
                {createdMembers.map((member) => (
                  <div key={member.uid} className="bg-white p-3 rounded border border-green-200">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-sm text-gray-600">
                      Username: <code className="bg-gray-100 px-2 py-1 rounded">{member.username}</code>
                    </p>
                    <p className="text-sm text-gray-600">
                      Email: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{member.email}</code>
                    </p>
                    <p className="text-sm text-gray-600">
                      Age: {member.age}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Family Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Family Email *
              </label>
              <input
                type="email"
                value={familyEmail}
                onChange={(e) => setFamilyEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                All learners in this family will use this email to sign in (with their individual username).
              </p>
            </div>

            {/* Learners Table */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Learners</h2>
                <button
                  type="button"
                  onClick={generateAllPasswords}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300"
                >
                  🔐 Auto-Generate All Passwords
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/4">
                        Full Name *
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/4">
                        Username *
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/6">
                        Age *
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 w-1/4">
                        Password *
                      </th>
                      <th className="px-4 py-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {members.map((member, idx) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) =>
                              handleMemberChange(member.id, 'name', e.target.value)
                            }
                            placeholder="e.g., Aisha Khan"
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={member.username}
                            onChange={(e) =>
                              handleMemberChange(member.id, 'username', e.target.value)
                            }
                            placeholder="e.g., aisha_k"
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            3-20 chars, letters/numbers/_
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={member.age}
                            onChange={(e) =>
                              handleMemberChange(member.id, 'age', e.target.value)
                            }
                            placeholder="10"
                            min="1"
                            max="120"
                            className="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              type="password"
                              value={member.password}
                              onChange={(e) =>
                                handleMemberChange(member.id, 'password', e.target.value)
                              }
                              placeholder="At least 6 chars"
                              className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleMemberChange(
                                  member.id,
                                  'password',
                                  generateRandomPassword()
                                )
                              }
                              className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                            >
                              🔐 Gen
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMemberRow(member.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Remove this learner"
                            >
                              <TrashIcon size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addMemberRow}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                <PlusIcon size={18} />
                Add Another Learner
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={20} />}
                {loading ? 'Creating Learners...' : 'Create All Learners'}
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                All learners will have independent accounts with their own points, levels, and progress tracking.
              </p>
            </div>
          </form>

          {/* Info Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4">📖 How Family Accounts Work:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ <strong>Shared Email:</strong> All learners sign in with the same family email</li>
              <li>✅ <strong>Unique Usernames:</strong> Each learner has their own username (used as login alternative)</li>
              <li>✅ <strong>Independent Points:</strong> Each learner earns, tracks, and manages their own points separately</li>
              <li>✅ <strong>Personal Profiles:</strong> Separate names, ages, levels, and activity logs</li>
              <li>✅ <strong>Leaderboard:</strong> Each learner competes individually on the leaderboard</li>
              <li>✅ <strong>Badge System:</strong> Badges and achievements are earned independently</li>
              <li>ℹ️ <strong>Max Learners:</strong> Up to 10 learners per family email</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
