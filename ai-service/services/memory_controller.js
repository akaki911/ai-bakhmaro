'use strict';

const fs = require('fs').promises;
const path = require('path');
const {
  createMemoryService,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
} = require('./memory.js');

const FACTS_BASE_PATH = process.env.MEMORY_FACTS_PATH || path.resolve(process.cwd(), 'memory_facts');
const GRAMMAR_BASE_PATH = process.env.GRAMMAR_STORAGE_PATH || path.resolve(process.cwd(), 'grammar_data');

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

const memoryService = createMemoryService({
  superAdminIds: SUPER_ADMIN_IDS,
});

async function ensureAuxiliaryDirs() {
  await Promise.all([
    fs.mkdir(FACTS_BASE_PATH, { recursive: true }),
    fs.mkdir(GRAMMAR_BASE_PATH, { recursive: true }),
  ]);
}

async function getMemory(userId, context = {}) {
  const subject = String(userId || '').trim();
  if (!subject) {
    throw new Error('getMemory requires a valid userId');
  }

  return memoryService.getUserMemory(subject, context);
}

async function addToMemory(userId, content, options = {}) {
  const subject = String(userId || '').trim();
  if (!subject || !content) {
    return null;
  }

  await ensureAuxiliaryDirs();
  const record = await memoryService.appendUserText(subject, content, {
    source: options.source || 'conversation',
    tags: options.tags,
    actor: options.actor,
    visibility: options.visibility,
  });

  if (options.enforceRetention !== false) {
    await memoryService.enforce(MEMORY_SCOPES.USER, subject, {});
  }

  return record;
}

async function storeGrammarCorrection(userId, originalText, correctedText) {
  const subject = String(userId || '').trim();
  if (!subject || !originalText || !correctedText) {
    return false;
  }

  await ensureAuxiliaryDirs();
  const grammarPath = path.join(GRAMMAR_BASE_PATH, `${subject}.json`);
  let existing = [];

  try {
    const raw = await fs.readFile(grammarPath, 'utf8');
    existing = JSON.parse(raw);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  existing.push({
    type: 'grammar_correction',
    original: originalText,
    corrected: correctedText,
    timestamp: new Date().toISOString(),
  });

  await fs.writeFile(grammarPath, JSON.stringify(existing, null, 2));
  return true;
}

async function getGrammarFixes(userId) {
  const subject = String(userId || '').trim();
  if (!subject) {
    return [];
  }

  try {
    const grammarPath = path.join(GRAMMAR_BASE_PATH, `${subject}.json`);
    const raw = await fs.readFile(grammarPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.filter(item => item.type === 'grammar_correction');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to load grammar fixes', error);
    }
    return [];
  }
}

async function rememberFact(userId, factContent, options = {}) {
  const subject = String(userId || '').trim();
  if (!subject || !factContent) {
    return null;
  }

  await ensureAuxiliaryDirs();
  return memoryService.write({
    scope: MEMORY_SCOPES.USER,
    subject,
    payload: {
      text: factContent,
      type: 'fact',
      source: options.source || 'manual',
    },
    tags: options.tags || ['fact'],
    visibility: options.visibility || [ROLE_VISIBILITY.ADMIN, ROLE_VISIBILITY.SUPER_ADMIN],
    actor: options.actor || { type: 'system', id: null, label: 'fact-ingest' },
  });
}

module.exports = {
  getMemory,
  addToMemory,
  storeGrammarCorrection,
  getGrammarFixes,
  rememberFact,
};
