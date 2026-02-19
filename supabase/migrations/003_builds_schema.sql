-- Builds table for APK testing
CREATE TABLE IF NOT EXISTS builds (
  id SERIAL PRIMARY KEY,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  filesize BIGINT,
  file_path TEXT NOT NULL,
  package_name TEXT,
  version TEXT,
  version_code INT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  user_id INT REFERENCES companies(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'installing', 'installed', 'testing', 'completed', 'failed', 'uninstalled')),
  test_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Build tests table for tracking test runs
CREATE TABLE IF NOT EXISTS build_tests (
  id SERIAL PRIMARY KEY,
  build_id INT REFERENCES builds(id) ON DELETE CASCADE,
  device_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  install_result JSONB,
  launch_result JSONB,
  test_output JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for builds
CREATE INDEX idx_builds_app_id ON builds(app_id);
CREATE INDEX idx_builds_user_id ON builds(user_id);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_build_tests_build_id ON build_tests(build_id);
