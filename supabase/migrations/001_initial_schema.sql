-- Database Schema Migration for AppLens
-- Run this to create the multi-tenant database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (multi-tenant)
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  api_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apps table
CREATE TABLE apps (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bundle_id TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Screenshots table
CREATE TABLE screenshots (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  screen_name TEXT,
  screen_purpose TEXT,
  navigation_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  screenshot_id INT REFERENCES screenshots(id) ON DELETE SET NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  issue_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Insights table
CREATE TABLE app_insights (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE UNIQUE,
  description TEXT,
  screen_mappings JSONB,
  recommendations JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log table
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_apps_company_id ON apps(company_id);
CREATE INDEX idx_screenshots_app_id ON screenshots(app_id);
CREATE INDEX idx_issues_app_id ON issues(app_id);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Create API key generator function
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
BEGIN
  return 'apl_' || encode(gen_random_bytes(20), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) - prepared for future PostgreSQL RLS
-- For now, we handle multi-tenancy at application level

-- Insert trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apps_updated_at
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
