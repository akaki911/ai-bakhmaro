const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { requireSuperAdmin } = require('../middleware/admin_guards');

const router = express.Router();
const repoRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

let cachedServiceAccountPath = null;

const writeServiceAccountFile = () => {
  const existingPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (existingPath && fs.existsSync(existingPath)) {
    return existingPath;
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    return null;
  }

  if (cachedServiceAccountPath && fs.existsSync(cachedServiceAccountPath)) {
    return cachedServiceAccountPath;
  }

  const resolvedKey = rawKey.trim().startsWith('{')
    ? rawKey
    : Buffer.from(rawKey.trim(), 'base64').toString('utf8');

  const targetPath = path.join(os.tmpdir(), `firebase-sa-${Date.now()}.json`);
  fs.writeFileSync(targetPath, resolvedKey, { encoding: 'utf8', mode: 0o600 });
  cachedServiceAccountPath = targetPath;
  return targetPath;
};

const sendEvent = (res, event, payload) => {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch (error) {
    console.error('�?O [Deploy] Failed to write SSE payload:', error);
  }
};

const runCommand = (options) =>
  new Promise((resolve, reject) => {
    const {
      res,
      label,
      command,
      args,
      env,
      cwd,
      phase,
      onChildRef,
    } = options;

    sendEvent(res, 'status', { phase, state: 'running' });
    const child = spawn(command, args, {
      cwd,
      env,
      shell: isWindows,
    });

    if (onChildRef) {
      onChildRef(child);
    }

    const emitLog = (stream, chunk) => {
      const message = chunk.toString();
      if (!message.trim()) {
        return;
      }
      sendEvent(res, 'log', {
        timestamp: new Date().toISOString(),
        level: stream === 'stderr' ? 'error' : 'info',
        phase,
        label,
        message,
      });
    };

    child.stdout.on('data', (data) => emitLog('stdout', data));
    child.stderr.on('data', (data) => emitLog('stderr', data));

    child.on('close', (code) => {
      if (code === 0) {
        sendEvent(res, 'status', { phase, state: 'completed' });
        resolve();
      } else {
        const error = new Error(`${label} exited with code ${code}`);
        sendEvent(res, 'error', {
          phase,
          message: error.message,
        });
        sendEvent(res, 'status', { phase, state: 'failed' });
        reject(error);
      }
    });

    child.on('error', (error) => {
      sendEvent(res, 'error', { phase, message: error.message });
      sendEvent(res, 'status', { phase, state: 'failed' });
      reject(error);
    });
  });

router.post('/firebase', requireSuperAdmin, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const { projectId: bodyProjectId, skipInstall } = req.body || {};
  const firebaseToken = process.env.FIREBASE_TOKEN;
  const projectId = bodyProjectId || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    sendEvent(res, 'error', { message: 'Missing FIREBASE_PROJECT_ID' });
    sendEvent(res, 'end', { status: 'error' });
    res.end();
    return;
  }

  if (!firebaseToken) {
    sendEvent(res, 'error', { message: 'Missing FIREBASE_TOKEN secret' });
    sendEvent(res, 'end', { status: 'error' });
    res.end();
    return;
  }

  const serviceAccountPath = writeServiceAccountFile();
  if (!serviceAccountPath) {
    sendEvent(res, 'error', { message: 'Missing FIREBASE_SERVICE_ACCOUNT_KEY' });
    sendEvent(res, 'end', { status: 'error' });
    res.end();
    return;
  }

  const steps = [
    {
      key: 'install',
      label: 'Install dependencies',
      command: 'pnpm',
      args: ['install', '--frozen-lockfile'],
      skip: Boolean(skipInstall),
    },
    {
      key: 'build',
      label: 'Build workspace',
      command: 'pnpm',
      args: ['build'],
    },
    {
      key: 'deploy',
      label: 'Deploy to Firebase',
      command: 'firebase',
      args: ['deploy', '--only', 'hosting,functions', '--project', projectId],
    },
  ];

  let activeChild = null;
  let aborted = false;

  req.on('close', () => {
    aborted = true;
    if (activeChild) {
      activeChild.kill('SIGINT');
    }
  });

  const childEnv = {
    ...process.env,
    FIREBASE_TOKEN: firebaseToken,
    GOOGLE_APPLICATION_CREDENTIALS: serviceAccountPath,
    FORCE_COLOR: '0',
  };

  try {
    sendEvent(res, 'status', { phase: 'overall', state: 'running' });

    for (const step of steps) {
      if (aborted) {
        throw new Error('Deployment aborted by client');
      }

      if (step.skip) {
        sendEvent(res, 'status', { phase: step.key, state: 'skipped' });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await runCommand({
        res,
        label: step.label,
        command: step.command,
        args: step.args,
        env: childEnv,
        cwd: repoRoot,
        phase: step.key,
        onChildRef: (child) => {
          activeChild = child;
        },
      });
    }

    sendEvent(res, 'status', { phase: 'overall', state: 'completed' });
    sendEvent(res, 'end', { status: 'success' });
  } catch (error) {
    console.error('�?O [Deploy] Deployment failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    sendEvent(res, 'error', { message: errorMessage });
    sendEvent(res, 'end', { status: aborted ? 'aborted' : 'error' });
  } finally {
    if (activeChild) {
      activeChild.kill('SIGTERM');
    }
    res.end();
  }
});

module.exports = router;
