-- Add test_type column to test_runs table for different test types
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('explore', 'task', 'auth', 'web', 'apk')) DEFAULT 'explore';

-- Web tests table - stores web test specific data
CREATE TABLE IF NOT EXISTS web_tests (
  id SERIAL PRIMARY KEY,
  test_run_id INT REFERENCES test_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  viewport JSONB DEFAULT '{"width": 1280, "height": 720}',
  wait_for_selector TEXT,
  take_screenshots BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  load_time_ms INT,
  error_message TEXT,
  screenshots JSONB DEFAULT '[]',
  console_logs JSONB DEFAULT '[]',
  error_logs JSONB DEFAULT '[]',
  html_snapshot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for web_tests
CREATE INDEX IF NOT EXISTS idx_web_tests_test_run_id ON web_tests(test_run_id);
CREATE INDEX IF NOT EXISTS idx_web_tests_status ON web_tests(status);
