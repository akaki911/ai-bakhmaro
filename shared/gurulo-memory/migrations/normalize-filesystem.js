'use strict';

const fs = require('fs').promises;
const path = require('path');
const { createMemoryRecord, MEMORY_SCOPES } = require('../memory.contracts.js');

async function normalizeFilesystemMemory(options = {}) {
  const baseDir = options.sourceDir || path.resolve(process.cwd(), 'memory_data');
  const scope = options.scope || MEMORY_SCOPES.USER;
  const files = await fs.readdir(baseDir).catch(() => []);

  const summary = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(baseDir, file);
    summary.processed += 1;

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        summary.skipped += 1;
        continue;
      }

      if (Array.isArray(parsed?.records)) {
        summary.skipped += 1;
        continue;
      }

      const subject = file.replace(/\.json$/i, '');
      const payload = typeof parsed === 'object' && parsed !== null ? parsed : { value: parsed };
      const text = typeof parsed?.data === 'string' ? parsed.data : null;

      const record = createMemoryRecord({
        scope,
        subject,
        payload: {
          text: text || payload.value || '',
          raw: payload,
        },
        tags: ['legacy-import'],
        actor: options.actor || { type: 'system', id: null, label: 'filesystem-migration' },
        metadata: {
          migratedAt: new Date().toISOString(),
          source: 'filesystem',
        },
      });

      await fs.writeFile(filePath, JSON.stringify([record], null, 2));
      summary.updated += 1;
    } catch (error) {
      summary.errors.push({ file, error: error.message });
    }
  }

  return summary;
}

module.exports = {
  normalizeFilesystemMemory,
};
