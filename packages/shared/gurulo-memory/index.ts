export {
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
} from './memory.sdk.js';

export type {
  MemoryScope,
  RoleVisibility,
  RetentionPolicy,
  MemoryRecord,
  MemoryActor,
  MemoryRecordPayload,
  MemoryRetention,
} from './memory.contracts.js';

export { FilesystemMemoryAdapter } from './adapters/filesystem.js';
export { FirestoreMemoryAdapter } from './adapters/firestore.js';
export { RedisMemoryAdapter } from './adapters/redis.js';
export { normalizeFilesystemMemory } from './migrations/normalize-filesystem.js';
