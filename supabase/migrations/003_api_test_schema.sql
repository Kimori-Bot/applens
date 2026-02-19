-- Add test_type column to test_runs for API tests support

-- Add test_type column if it doesn't exist
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS test_type TEXT CHECK (test_type IN ('ui', 'api', 'integration')) DEFAULT 'ui';

-- Add test_details JSONB column for storing API test specific data
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS test_details JSONB;

-- Create index for test_type queries
CREATE INDEX IF NOT EXISTS idx_test_runs_test_type ON test_runs(test_type);

-- Add api_test_results table for storing detailed API test results
CREATE TABLE IF NOT EXISTS api_test_results (
  id SERIAL PRIMARY KEY,
  test_run_id INT REFERENCES test_runs(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INT,
  response_time_ms INT,
  response_body JSONB,
  response_headers JSONB,
  validation_results JSONB,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for api_test_results
CREATE INDEX IF NOT EXISTS idx_api_test_results_test_run_id ON api_test_results(test_run_id);

-- Create saved_api_tests table for reusable API tests
CREATE TABLE IF NOT EXISTS saved_api_tests (
  id SERIAL PRIMARY KEY,
  company_id INT REFERENCES companies(id) ON DELETE CASCADE,
  app_id INT REFERENCES apps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_config JSONB NOT NULL,
  variables JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for saved_api_tests
CREATE INDEX IF NOT EXISTS idx_saved_api_tests_company_id ON saved_api_tests(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_api_tests_app_id ON saved_api_tests(app_id);
