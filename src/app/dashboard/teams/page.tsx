'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Users, 
  Settings, 
  Crown,
  Shield,
  User,
  Eye,
  ArrowRight,
  Loader2,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { hasPermission, TeamRole } from '@/lib/teams';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  userRole: TeamRole;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors = {
  owner: 'text-yellow-400',
  admin: 'text-blue-400',
  member: 'text-green-400',
  viewer: 'text-gray-400',
};

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    
    setCreating(true);
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams([data.team, ...teams]);
        setShowCreateModal(false);
        setNewTeamName('');
        // Redirect to the new team
        router.push(`/dashboard/teams/${data.team.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = (teamId: string) => {
    const link = `${window.location.origin}/teams/join/${teamId}`;
    navigator.clipboard.writeText(link);
    setCopied(teamId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">Manage your teams and collaborate with others</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No teams yet</h2>
          <p className="text-gray-400 mb-6">Create your first team to start collaborating with others</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const RoleIcon = roleIcons[team.userRole];
            return (
              <Link
                key={team.id}
                href={`/dashboard/teams/${team.id}`}
                className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 rounded-xl p-6 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <span className={`flex items-center gap-1 text-sm ${roleColors[team.userRole]}`}>
                    <RoleIcon className="w-3 h-3" />
                    {team.userRole}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                  {team.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Team</h2>
            <form onSubmit={createTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="My Awesome Team"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTeamName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Create
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
