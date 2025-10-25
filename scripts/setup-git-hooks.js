#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const hooksDir = path.join(process.cwd(), '.githooks');

if (!existsSync(hooksDir)) {
  process.exit(0);
}

const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  stdio: 'ignore',
});

if (gitCheck.status !== 0) {
  process.exit(0);
}

const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  process.exit(exitCode);
}

console.log('✅ Git hooks configured: core.hooksPath=.githooks');
