import { spawn, ChildProcess } from 'child_process';
import { Runner, RunnerConfig, ClusterStatus } from './types';

// In-memory runner registry
const runners: Map<string, Runner> = new Map();
const processes: Map<string, ChildProcess> = new Map();

// Base port for runners
let basePort = 4723;

function generateId(): string {
  return `runner_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getNextPort(): number {
  return basePort++;
}

export class ClusterRunner {
  private static instance: ClusterRunner;
  
  static getInstance(): ClusterRunner {
    if (!ClusterRunner.instance) {
      ClusterRunner.instance = new ClusterRunner();
    }
    return ClusterRunner.instance;
  }

  async startRunner(type: Runner['type'], config: RunnerConfig = {}): Promise<Runner> {
    const id = generateId();
    const port = config.appiumPort || getNextPort();
    
    const runner: Runner = {
      id,
      name: `${type}-runner-${id.split('_')[2]}`,
      type,
      status: 'starting',
      port,
      config,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };

    runners.set(id, runner);

    // Start the runner process
    try {
      await this.spawnRunnerProcess(runner);
      runner.status = 'running';
      runners.set(id, runner);
    } catch (error) {
      runner.status = 'error';
      console.error(`Failed to start runner ${id}:`, error);
    }

    return runner;
  }

  private async spawnRunnerProcess(runner: Runner): Promise<void> {
    return new Promise((resolve, reject) => {
      let cmd: string;
      let args: string[];

      switch (runner.type) {
        case 'android':
          cmd = 'npx';
          args = [
            'appium',
            '--port', runner.port.toString(),
            '--bootstrap-port', (runner.port + 1000).toString(),
            '--session-override'
          ];
          break;
        case 'ios':
          cmd = 'npx';
          args = [
            'appium',
            '--port', runner.port.toString(),
            '--webkit-debug-proxy-port', (runner.port + 500).toString()
          ];
          break;
        case 'web':
          cmd = 'npx';
          args = [
            'playwright',
            'codegen',
            '--browser', 'chromium',
            '--headed'
          ];
          break;
        case 'api':
          // Simple API mock server
          cmd = 'npx';
          args = ['json-server', '--port', runner.port.toString(), '--watch', 'db.json'];
          break;
        default:
          reject(new Error(`Unknown runner type: ${runner.type}`));
          return;
      }

      const proc = spawn(cmd, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          APPLENS_RUNNER_ID: runner.id,
          APPLENS_RUNNER_PORT: runner.port.toString()
        },
        detached: false
      });

      processes.set(runner.id, proc);

      proc.on('spawn', () => {
        console.log(`Runner ${runner.id} spawned with PID ${proc.pid}`);
        if (runner.pid) runner.pid = proc.pid;
        resolve();
      });

      proc.on('error', (error) => {
        console.error(`Runner ${runner.id} error:`, error);
        runner.status = 'error';
        reject(error);
      });

      proc.on('exit', (code) => {
        console.log(`Runner ${runner.id} exited with code ${code}`);
        runner.status = 'stopped';
        processes.delete(runner.id);
      });

      // Timeout for startup
      setTimeout(() => {
        if (runner.status === 'starting') {
          runner.status = 'running';
          resolve();
        }
      }, 10000);
    });
  }

  async stopRunner(id: string): Promise<Runner | null> {
    const runner = runners.get(id);
    if (!runner) return null;

    runner.status = 'stopping';
    runners.set(id, runner);

    const proc = processes.get(id);
    if (proc) {
      proc.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (processes.has(id)) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }

    runner.status = 'stopped';
    runners.set(id, runner);
    
    return runner;
  }

  async restartRunner(id: string): Promise<Runner | null> {
    const oldRunner = runners.get(id);
    if (!oldRunner) return null;

    await this.stopRunner(id);
    return this.startRunner(oldRunner.type, oldRunner.config);
  }

  getRunner(id: string): Runner | undefined {
    return runners.get(id);
  }

  getStatus(): ClusterStatus {
    const allRunners = Array.from(runners.values());
    return {
      runners: allRunners,
      total: allRunners.length,
      running: allRunners.filter(r => r.status === 'running').length,
      available: allRunners.filter(r => r.status === 'running' && r.type !== 'error').length
    };
  }

  getRunnersByType(type: Runner['type']): Runner[] {
    return Array.from(runners.values()).filter(r => r.type === type);
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(runners.keys());
    await Promise.all(ids.map(id => this.stopRunner(id)));
  }

  // Heartbeat to track active runners
  heartbeat(id: string): boolean {
    const runner = runners.get(id);
    if (runner) {
      runner.lastHeartbeat = new Date().toISOString();
      runners.set(id, runner);
      return true;
    }
    return false;
  }

  // Cleanup stale runners
  cleanupStale(maxAgeMs: number = 60000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, runner] of runners.entries()) {
      if (runner.lastHeartbeat) {
        const lastHeartbeat = new Date(runner.lastHeartbeat).getTime();
        if (now - lastHeartbeat > maxAgeMs && runner.status === 'running') {
          this.stopRunner(id);
          cleaned++;
        }
      }
    }
    
    return cleaned;
  }
}

export default ClusterRunner.getInstance();
