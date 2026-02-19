'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  Loader2,
  Trash2,
  Copy,
  Check,
  X,
  Send,
  MoreVertical,
  UserPlus
} from 'lucide-react';
import { hasPermission, TeamRole, rolePermissions } from '@/lib/teams';

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  userRole: TeamRole;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  token: string;
  expires_at: string;
  created_at: string;
  team: {
    id: string;
    name: string;
  };
}

const roleLabels = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const roleColors = {
  owner: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  member: 'bg-green-500/20 text-green-400 border-green-500/30',
  viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'settings'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [resolvedParams.id]);

  const loadTeamData = async () => {
    try {
      const token = localStorage.getItem('applens_token');
      
      // Load team details
      const teamRes = await fetch(`/api/teams/${resolvedParams.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!teamRes.ok) {
        router.push('/dashboard/teams');
        return;
      }
      
      const teamData = await teamRes.json();
      setTeam(teamData.team);
      setNewTeamName(teamData.team.name);
      
      // Load members
      const membersRes = await fetch(`/api/teams/${resolvedParams.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);
      }
      
      // Load invitations
      const invitesRes = await fetch(`/api/teams/${resolvedParams.id}/invite`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData.invitations || []);
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setInviting(true);
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch(`/api/teams/${resolvedParams.id}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setInvitations([data.invitation, ...invitations]);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const cancelInvite = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;
    
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch(`/api/teams/${resolvedParams.id}/invite?invitationId=${invitationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        setInvitations(invitations.filter(i => i.id !== invitationId));
      }
    } catch (error) {
      console.error('Error canceling invite:', error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the team?')) return;
    
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch(`/api/teams/${resolvedParams.id}/members?memberId=${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId));
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const updateTeamName = async () => {
    if (!newTeamName.trim() || newTeamName === team?.name) {
      setEditingName(false);
      return;
    }
    
    setSavingName(true);
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch(`/api/teams/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeam({ ...team!, name: data.team.name });
        setEditingName(false);
      }
    } catch (error) {
      console.error('Error updating team name:', error);
    } finally {
      setSavingName(false);
    }
  };

  const deleteTeam = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('applens_token');
      const response = await fetch(`/api/teams/${resolvedParams.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        router.push('/dashboard/teams');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/api/teams/accept/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!team) {
    return null;
  }

  const canInvite = hasPermission(team.userRole, 'canInviteMembers');
  const canManageMembers = hasPermission(team.userRole, 'canManageMembers');
  const canDeleteTeam = hasPermission(team.userRole, 'canDeleteTeam');
  const currentUserMember = members.find(m => m.user?.email);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/teams"
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onBlur={updateTeamName}
                onKeyDown={(e) => e.key === 'Enter' && updateTeamName()}
                disabled={savingName}
                className="text-3xl font-bold bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-white focus:outline-none focus:border-purple-500"
                autoFocus
              />
              {savingName && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
            </div>
          ) : (
            <h1 
              className="text-3xl font-bold text-white cursor-pointer hover:text-purple-400 transition-colors"
              onClick={() => hasPermission(team.userRole, 'canManageTeam') && setEditingName(true)}
            >
              {team.name}
            </h1>
          )}
          <p className="text-gray-400 mt-1">
            Created {new Date(team.created_at).toLocaleDateString()}
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'members'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'invitations'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Invitations ({invitations.length})
        </button>
        {canManageMembers && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          {members.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No members yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                  {canManageMembers && <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  return (
                    <tr key={member.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                            <span className="text-purple-400 font-medium">
                              {member.user?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.user?.name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">{member.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[member.role]}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleLabels[member.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      {canManageMembers && (
                        <td className="px-6 py-4 text-right">
                          {member.role !== 'owner' && (
                            <button
                              onClick={() => removeMember(member.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending invitations</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Expires</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-white">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColors[invitation.role]}`}>
                        {roleLabels[invitation.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyInviteLink(invitation.token)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          {copied === invitation.token ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        {canManageMembers && (
                          <button
                            onClick={() => cancelInvite(invitation.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'settings' && canManageMembers && (
        <div className="space-y-6">
          {/* Team Settings */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Team Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onBlur={updateTeamName}
                  className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          {canDeleteTeam && (
            <div className="bg-gray-900/50 border border-red-900/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
              <p className="text-gray-400 mb-4">
                Once you delete a team, there is no going back. All team data will be permanently deleted.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Team
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Invite Team Member</h2>
            <form onSubmit={sendInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="member">Member - Can run tests and view results</option>
                  <option value="admin">Admin - Can manage members and run tests</option>
                  <option value="viewer">Viewer - View only, cannot run tests</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('member');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Invite
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-900/30 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-2">Delete Team?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete <strong className="text-white">{team.name}</strong>? 
              This action cannot be undone and all team data will be permanently lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteTeam}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Delete
                    <Trash2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
