-- Teams Database Migration
-- Migration: create_teams_tables
-- Created: 2026-02-19

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES companies(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, email)
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Team owners can view their teams" ON teams
  FOR SELECT USING (owner_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL));

CREATE POLICY "Anyone can create teams" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Team owners can update their teams" ON teams
  FOR UPDATE USING (owner_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL));

CREATE POLICY "Team owners can delete their teams" ON teams
  FOR DELETE USING (owner_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL));

-- RLS Policies for team_members
CREATE POLICY "Team members can view team members" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL)
    )
  );

CREATE POLICY "Team admins can manage members" ON team_members
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL)
      AND tm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for team_invitations
CREATE POLICY "Team members can view invitations" ON team_invitations
  FOR SELECT USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL)
    )
  );

CREATE POLICY "Team admins can manage invitations" ON team_invitations
  FOR ALL USING (
    team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id IN (SELECT id FROM companies WHERE api_key IS NOT NULL)
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
