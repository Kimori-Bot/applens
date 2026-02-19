// Team types for AppLens

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  // Populated fields
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  token: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
  // Populated fields
  team?: {
    id: string;
    name: string;
  };
}

// Permission helper
export const rolePermissions = {
  owner: {
    canManageTeam: true,
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canRunTests: true,
    canViewAllResults: true,
    canAccessBilling: true,
    canDeleteTeam: true,
  },
  admin: {
    canManageTeam: false,
    canManageMembers: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canRunTests: true,
    canViewAllResults: true,
    canAccessBilling: false,
    canDeleteTeam: false,
  },
  member: {
    canManageTeam: false,
    canManageMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canRunTests: true,
    canViewAllResults: false,
    canAccessBilling: false,
    canDeleteTeam: false,
  },
  viewer: {
    canManageTeam: false,
    canManageMembers: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canRunTests: false,
    canViewAllResults: false,
    canAccessBilling: false,
    canDeleteTeam: false,
  },
} as const;

export function hasPermission(role: TeamRole, permission: keyof typeof rolePermissions.owner): boolean {
  return rolePermissions[role][permission];
}
