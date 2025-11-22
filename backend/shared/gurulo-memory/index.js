'use strict';

const {
  GuruloMemorySDK,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES,
  normalizeScope,
  resolveRetentionPolicy,
  computeExpiryDate,
  computeReviewDate,
  isExpired,
  createMemoryRecord,
} = require('./memory.sdk.js');

const { FilesystemMemoryAdapter } = require('./adapters/filesystem.js');
const { FirestoreMemoryAdapter } = require('./adapters/firestore.js');
const { RedisMemoryAdapter } = require('./adapters/redis.js');
const { normalizeFilesystemMemory } = require('./migrations/normalize-filesystem.js');

module.exports = {
  GuruloMemorySDK,
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES,
  normalizeScope,
  resolveRetentionPolicy,
  computeExpiryDate,
  computeReviewDate,
  isExpired,
  createMemoryRecord,
  FilesystemMemoryAdapter,
  FirestoreMemoryAdapter,
  RedisMemoryAdapter,
  migrations: {
    normalizeFilesystemMemory,
  },
};
