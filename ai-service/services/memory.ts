import {
  MEMORY_SCOPES,
  ROLE_VISIBILITY,
  createMemoryRecord,
} from '../shared/gurulo-memory/index.js';
import { MemoryService as RuntimeMemoryService, createMemoryService as runtimeCreateMemoryService } from './memory.js';

export interface MemoryReadContext {
  userId?: string;
  roles?: string[];
  superAdmin?: boolean;
  includeExpired?: boolean;
  tags?: string[];
  limit?: number;
}

export interface MemoryAppendOptions {
  source?: string;
  tags?: string[];
  visibility?: string[];
  actor?: {
    type?: 'user' | 'system' | 'service';
    id?: string | null;
    label?: string | null;
  };
}

export interface MemoryServiceOptions {
  adapter?: unknown;
  backend?: string;
  firestore?: FirebaseFirestore.Firestore;
  collection?: string;
  basePath?: string;
  superAdminIds?: Array<string | number>;
  retentionPolicies?: Record<string, unknown>;
}

export const createMemoryService: (options?: MemoryServiceOptions) => RuntimeMemoryService =
  runtimeCreateMemoryService as unknown as (options?: MemoryServiceOptions) => RuntimeMemoryService;

export const MemoryService: {
  new (options?: MemoryServiceOptions): RuntimeMemoryService;
} = RuntimeMemoryService as unknown as {
  new (options?: MemoryServiceOptions): RuntimeMemoryService;
};

export { MEMORY_SCOPES, ROLE_VISIBILITY, createMemoryRecord };
