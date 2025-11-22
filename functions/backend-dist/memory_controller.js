'use strict';

const fs = require('fs').promises;
const path = require('path');
const admin = require('firebase-admin');
const {
  createMemoryService,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
} = require('../ai-service/services/memory.js');

const MEMORY_BASE_PATH = process.env.MEMORY_STORAGE_PATH || path.resolve(__dirname, 'memory_data');
const FACTS_BASE_PATH = process.env.MEMORY_FACTS_PATH || path.resolve(__dirname, 'memory_facts');
const GRAMMAR_BASE_PATH = process.env.GRAMMAR_STORAGE_PATH || path.resolve(__dirname, 'grammar_data');

const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

let firestore = null;

try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  firestore = admin.firestore();
} catch (error) {
  console.warn('Gurulo memory controller using filesystem adapter:', error.message);
}

const memoryService = createMemoryService({
  backend: firestore ? 'firestore' : 'filesystem',
  firestore,
  basePath: MEMORY_BASE_PATH,
  superAdminIds: SUPER_ADMIN_IDS,
});

async function ensureDirectories() {
  await Promise.all([
    fs.mkdir(MEMORY_BASE_PATH, { recursive: true }),
    fs.mkdir(FACTS_BASE_PATH, { recursive: true }),
    fs.mkdir(GRAMMAR_BASE_PATH, { recursive: true }),
  ]);
}

async function getMemory(userId, context = {}) {
  const subject = String(userId || '').trim();
  if (!subject) {
    throw new Error('getMemory requires userId');
  }

  await ensureDirectories();
  return memoryService.getUserMemory(subject, context);
}

async function addToMemory(userId, content, options = {}) {
  const subject = String(userId || '').trim();
  if (!subject || !content) {
    return null;
  }

  await ensureDirectories();
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

  await ensureDirectories();
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

  await ensureDirectories();
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
    actor: options.actor || { type: 'system', id: null, label: 'backend-fact' },
  });
}

async function checkFirebaseHealth() {
  if (!firestore) {
    return { status: 'unavailable', available: false };
  }

  try {
    await firestore.collection('gurulo_memory_health').doc('ping').set({
      pingedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { status: 'connected', available: true };
  } catch (error) {
    return { status: 'error', available: false, error: error.message };
  }
}

async function syncMemoryToFirebase(userId) {
  if (!firestore) {
    return { success: false, reason: 'firestore_unavailable' };
  }

  const subject = String(userId || '').trim();
  if (!subject) {
    return { success: false, reason: 'invalid_user' };
  }

  const snapshot = await memoryService.read(MEMORY_SCOPES.USER, subject, {
    includeExpired: true,
    superAdmin: true,
  });

  return {
    success: true,
    records: snapshot.records.length,
    aggregated: snapshot.aggregated,
  };
}

async function attemptFirebaseSync(userId) {
  return syncMemoryToFirebase(userId);
}

async function periodicSyncCheck(userId) {
  const health = await checkFirebaseHealth();
  if (!health.available) {
    return { success: false, reason: 'firebase_unavailable', health };
  }
  return syncMemoryToFirebase(userId);
}

async function getStoredFacts(userId) {
  const subject = String(userId || '').trim();
  if (!subject) {
    return [];
  }

  try {
    const factsPath = path.join(FACTS_BASE_PATH, `${subject}.json`);
    const raw = await fs.readFile(factsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.facts || [];
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to read stored facts', error);
    }
    return [];
  }
}

module.exports = {
  rememberFact,
  getMemory,
  addToMemory,
  storeGrammarCorrection,
  getGrammarFixes,
  syncMemoryToFirebase,
  attemptFirebaseSync,
  periodicSyncCheck,
  getStoredFacts,
  checkFirebaseHealth,
};
