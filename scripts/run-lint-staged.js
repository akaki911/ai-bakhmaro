#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import process from 'node:process';

const PATTERN = /\.(?:[cm]?[jt]sx?)$/i;

function getStagedFiles() {
  try {
    const output = execSync('git diff --name-only --cached', {
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map((file) => file.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('lint-staged: failed to read staged files');
    console.error(error.message);
    process.exit(1);
  }
}

function detectRunner() {
  const pnpmCheck = spawnSync('pnpm', ['--version'], { stdio: 'ignore' });
  if (pnpmCheck.status === 0) {
    return { command: 'pnpm', args: ['exec', 'eslint'] };
  }
  return { command: 'npx', args: ['eslint'] };
}

function runLint(files) {
  if (files.length === 0) {
    console.log('lint-staged: no staged JavaScript/TypeScript files to lint');
    return;
  }

  const runner = detectRunner();
  const args = [...runner.args, '--max-warnings=0', ...files];
  const result = spawnSync(runner.command, args, { stdio: 'inherit' });

  if (result.status !== 0) {
    const exitCode = Number.isInteger(result.status) ? result.status : 1;
    process.exit(exitCode);
  }
}

const stagedFiles = getStagedFiles();
const lintTargets = stagedFiles.filter((file) => PATTERN.test(file));

runLint(lintTargets);
