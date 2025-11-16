#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:process';

console.log('🔧 Setting up Git hooks...');

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
  console.log('✅ Git hooks configured successfully!');
  console.log(`   Hooks directory: .githooks`);
  console.log(`   Platform: ${platform}`);

  const repoRoot = process.cwd();
  const gitHooksDir = join(repoRoot, '.git', 'hooks');
  const projectHook = join(repoRoot, '.githooks', 'pre-commit');
  const legacyHook = join(gitHooksDir, 'pre-commit');

  if (existsSync(projectHook)) {
    mkdirSync(gitHooksDir, { recursive: true });
    copyFileSync(projectHook, legacyHook);
    chmodSync(legacyHook, 0o755);
    console.log('🔗 Legacy .git/hooks/pre-commit installed for Git clients that ignore core.hooksPath.');
  } else {
    console.warn('⚠️ Could not find .githooks/pre-commit to install legacy hook.');
  }

  console.log('');
  console.log('📝 Pre-commit hook will now run before each commit.');
} catch (error) {
  console.error('❌ Failed to configure Git hooks:');
  console.error(error.message);
  process.exit(1);
}
