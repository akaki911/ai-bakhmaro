#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { platform } from 'node:process';

console.log('🔧 Setting up Git hooks...');

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'inherit' });
  console.log('✅ Git hooks configured successfully!');
  console.log(`   Hooks directory: .githooks`);
  console.log(`   Platform: ${platform}`);
  console.log('');
  console.log('📝 Pre-commit hook will now run before each commit.');
} catch (error) {
  console.error('❌ Failed to configure Git hooks:');
  console.error(error.message);
  process.exit(1);
}
