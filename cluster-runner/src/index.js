const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Runner storage
const runners = new Map();
let basePort = 4723;

function getNextPort() {
  return basePort++;
}

function createRunner(type, config = {}) {
  const id = uuidv4();
  const port = config.port || getNextPort();
  
  const runner = {
    id,
    name: `${type}-runner-${id.substring(0, 8)}`,
    type,
    status: 'starting',
    port,
    config,
    createdAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString()
  };

  // Start the runner process
  try {
    let cmd, args;
    
    switch (type) {
      case 'android':
        cmd = 'npx';
        args = ['appium', '--port', port.toString()];
        break;
      case 'ios':
        cmd = 'npx';  
        args = ['appium', '--port', port.toString(), '--allow-cors'];
        break;
      case 'web':
        cmd = 'npx';
        args = ['serve', '-l', port.toString()];
        break;
      case 'api':
        cmd = 'npx';
        args = ['json-server', '--port', port.toString(), '--watch', 'db.json'];
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    const proc = spawn(cmd, args, {
      detached: false,
      env: { ...process.env, APPLENS_RUNNER_ID: id }
    });

    proc.on('spawn', () => {
      runner.status = 'running';
      runner.pid = proc.pid;
      console.log(`Started ${type} runner ${id} on port ${port}`);
    });

    proc.on('error', (err) => {
      runner.status = 'error';
      runner.error = err.message;
    });

    proc.on('exit', (code) => {
      runner.status = 'stopped';
      console.log(`Runner ${id} exited with code ${code}`);
    });

    runner.process = proc;
  } catch (error) {
    runner.status = 'error';
    runner.error = error.message;
  }

  runners.set(id, runner);
  return runner;
}

function stopRunner(id) {
  const runner = runners.get(id);
  if (!runner) return null;

  runner.status = 'stopping';
  
  if (runner.process) {
    runner.process.kill('SIGTERM');
    setTimeout(() => {
      if (runner.process && !runner.process.killed) {
        runner.process.kill('SIGKILL');
      }
    }, 5000);
  }

  runner.status = 'stopped';
  return runner;
}

// Routes
app.post('/runners', (req, res) => {
  const { type, config } = req.body;
  
  if (!type || !['android', 'ios', 'web', 'api'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const runner = createRunner(type, config);
  res.json({ success: true, runner });
});

app.get('/runners', (req, res) => {
  const all = Array.from(runners.values()).map(r => ({
    ...r,
    process: undefined // Don't expose process
  }));
  res.json({ runners: all, total: all.length, running: all.filter(r => r.status === 'running').length });
});

app.get('/runners/:id', (req, res) => {
  const runner = runners.get(req.params.id);
  if (!runner) return res.status(404).json({ error: 'Not found' });
  
  const { process, ...rest } = runner;
  res.json(rest);
});

app.delete('/runners/:id', (req, res) => {
  const runner = stopRunner(req.params.id);
  if (!runner) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, runner });
});

app.post('/runners/:id/heartbeat', (req, res) => {
  const runner = runners.get(req.params.id);
  if (!runner) return res.status(404).json({ error: 'Not found' });
  
  runner.lastHeartbeat = new Date().toISOString();
  res.json({ success: true });
});

app.delete('/runners', (req, res) => {
  for (const id of runners.keys()) {
    stopRunner(id);
  }
  res.json({ success: true, message: 'All runners stopped' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', runners: runners.size });
});

const PORT = process.env.PORT || 4723;
app.listen(PORT, () => {
  console.log(`Cluster runner listening on port ${PORT}`);
});
