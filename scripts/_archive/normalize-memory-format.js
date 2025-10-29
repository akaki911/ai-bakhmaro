#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { migrations } = require('../shared/gurulo-memory');

async function normalizeDirectory(dirPath) {
  const absolute = path.resolve(dirPath);
  if (!fs.existsSync(absolute)) {
    return { directory: absolute, skipped: true, reason: 'missing' };
  }

  const summary = await migrations.normalizeFilesystemMemory({ sourceDir: absolute });
  return { directory: absolute, skipped: false, summary };
}

async function main() {
  const targets = [
    path.join(__dirname, '../backend/memory_data'),
    path.join(__dirname, '../ai-service/memory_data'),
  ];

  const results = [];
  for (const target of targets) {
    results.push(await normalizeDirectory(target));
  }

  console.log(JSON.stringify({ results }, null, 2));
}

main().catch(error => {
  console.error('Failed to normalize memory storage', error);
  process.exit(1);
});
