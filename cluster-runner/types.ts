// Cluster Runner Types
export interface Runner {
  id: string;
  name: string;
  type: 'android' | 'ios' | 'web' | 'api';
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  port: number;
  pid?: number;
  startedAt?: string;
  lastHeartbeat?: string;
  config: RunnerConfig;
}

export interface RunnerConfig {
  memory?: string;
  cpu?: string;
  screenResolution?: string;
  adbSerial?: string;
  appiumPort?: number;
}

export interface ClusterStatus {
  runners: Runner[];
  total: number;
  running: number;
  available: number;
}
