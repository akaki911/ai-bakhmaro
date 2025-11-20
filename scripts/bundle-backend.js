const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', 'backend');
const targetDir = path.resolve(__dirname, '..', 'functions', 'backend-dist');
const targetScriptsDir = path.resolve(__dirname, '..', 'functions', 'scripts');
const ensureLocalSecretsSrc = path.resolve(__dirname, 'ensureLocalSecrets.js');
const ensureLocalSecretsDest = path.join(targetScriptsDir, 'ensureLocalSecrets.js');

const EXCLUDE = new Set([
  'node_modules',
  '.git',
  '.gitignore',
  '.gitattributes',
  '.env',
  '.env.production',
  '.env.example',
  '.DS_Store',
  'tmp',
  'logs',
  'data',
  'dist'
]);

const shouldCopy = (name) => !EXCLUDE.has(name);

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      if (!shouldCopy(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stats.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.error('❌ backend source directory not found:', sourceDir);
    process.exit(1);
  }
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  copyRecursive(sourceDir, targetDir);
  // Copy ensureLocalSecrets.js so backend-dist relative import works
  if (!fs.existsSync(targetScriptsDir)) {
    fs.mkdirSync(targetScriptsDir, { recursive: true });
  }
  fs.copyFileSync(ensureLocalSecretsSrc, ensureLocalSecretsDest);
  console.log('✅ Bundled backend into', path.relative(process.cwd(), targetDir));
}

if (require.main === module) {
  main();
}
