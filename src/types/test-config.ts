// Test Configuration Types
export interface TestConfig {
  id: string;
  name: string;
  description: string;
  type: 'explore' | 'task' | 'auth' | 'api' | 'custom';
  appId: string;
  
  // Test parameters
  goal?: string;
  maxSteps?: number;
  credentials?: CredentialSet[];
  
  // AI settings
  model?: string;
  temperature?: number;
  
  // Schedule
  schedule?: CronSchedule;
  
  // Results storage
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'partial';
}

export interface CredentialSet {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password: string;
  notes?: string;
}

export interface CronSchedule {
  enabled: boolean;
  cron: string;  // "0 9 * * *" for daily at 9am
  timezone?: string;
}

export interface TestRun {
  id: string;
  testConfigId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  
  // Results
  steps?: TestStep[];
  screenshots?: string[];
  videoPath?: string;
  healthScore?: number;
  errors?: string[];
  
  // Runner info
  runnerId?: string;
}

export interface TestStep {
  step: number;
  action: string;
  element: string;
  reason: string;
  screenshot?: string;
}
