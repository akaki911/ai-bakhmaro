import { spawn } from 'node:child_process';

const child = spawn(
  'npm',
  ['run', 'build', '--workspaces', '--if-present'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CI: process.env.CI ?? '1',
    },
  },
);

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exit(code);
    return;
  }

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(0);
});
