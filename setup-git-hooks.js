#!/usr/bin/env node

const { execSync } = require('node:child_process');
const { chmodSync, copyFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { platform } = require('node:process');

const isCiEnv =
  process.env.CI === 'true' ||
  process.env.RAILWAY_STATIC_URL ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.RAILWAY_ENVIRONMENT_ID;

if (process.env.REPL_ID || process.env.REPLIT_ENV || isCiEnv) {
  console.log('⚠️ Skipping Git hooks setup in CI/hosted environment');
  process.exit(0);
}

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
  console.warn('⚠️ Git hooks setup skipped (this is normal in some environments):');
  console.warn(error.message);
}
