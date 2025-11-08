import { spawn } from 'node:child_process';

const tasks = process.argv.slice(2);

if (tasks.length === 0) {
  console.error('No npm scripts provided. Usage: node run-pnpm-sequence.mjs <script> [script...]');
  process.exit(1);
}

const shell = process.platform === 'win32';

const runTask = (index) => {
  if (index >= tasks.length) {
    process.exit(0);
    return;
  }

  const task = tasks[index];
  const child = spawn('pnpm', ['run', task], {
    stdio: 'inherit',
    shell,
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
    },
  });

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      if (code === 0) {
        runTask(index + 1);
        return;
      }

      process.exit(code);
      return;
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    runTask(index + 1);
  });
};

runTask(0);
