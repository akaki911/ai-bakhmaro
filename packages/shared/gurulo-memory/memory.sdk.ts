import {
  GuruloMemorySDK as RuntimeSDK,
  MEMORY_SCOPES as RUNTIME_MEMORY_SCOPES,
  ROLE_VISIBILITY as RUNTIME_ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES as RUNTIME_DEFAULT_RETENTION_POLICIES,
  normalizeScope as runtimeNormalizeScope,
  resolveRetentionPolicy as runtimeResolveRetentionPolicy,
  computeExpiryDate as runtimeComputeExpiryDate,
  computeReviewDate as runtimeComputeReviewDate,
  isExpired as runtimeIsExpired,
  createMemoryRecord as runtimeCreateMemoryRecord,
} from './memory.sdk.js';

import type {
  MemoryScope,
  RoleVisibility,
  RetentionPolicy,
  MemoryRecord,
  MemoryActor,
  MemoryRecordPayload,
  MemoryRetention,
} from './memory.contracts.js';

export interface MemoryReadContext {
  roles?: RoleVisibility[] | string[];
  tags?: string[];
  includeExpired?: boolean;
  superAdmin?: boolean;
  limit?: number;
}

export interface MemoryWriteInput {
  scope: MemoryScope | string;
  subject: string;
  payload: MemoryRecordPayload;
  tags?: string[];
  visibility?: RoleVisibility[] | string[];
  retention?: Partial<MemoryRetention> & { policy?: Partial<RetentionPolicy> };
  actor?: Partial<MemoryActor>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  metadata?: Record<string, unknown>;
  id?: string;
}

export interface MemoryAdapter {
  write(record: MemoryRecord): Promise<void>;
  read(scope: MemoryScope, subject: string, options?: MemoryReadContext): Promise<MemoryRecord[]>;
  delete(scope: MemoryScope, subject: string, recordId: string): Promise<boolean>;
  listSubjects(scope: MemoryScope): Promise<string[]>;
}

export const MEMORY_SCOPES: Record<'USER' | 'ORG' | 'SYSTEM', MemoryScope> =
  RUNTIME_MEMORY_SCOPES as Record<'USER' | 'ORG' | 'SYSTEM', MemoryScope>;
export const ROLE_VISIBILITY: Record<'USER' | 'ORG_ADMIN' | 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM', RoleVisibility> =
  RUNTIME_ROLE_VISIBILITY as Record<'USER' | 'ORG_ADMIN' | 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM', RoleVisibility>;
export const DEFAULT_RETENTION_POLICIES: Record<MemoryScope, RetentionPolicy> =
  RUNTIME_DEFAULT_RETENTION_POLICIES as Record<MemoryScope, RetentionPolicy>;

export const normalizeScope: (scope?: string) => MemoryScope = runtimeNormalizeScope as unknown as (scope?: string) => MemoryScope;
export const resolveRetentionPolicy: (scope: string, overrides?: Partial<RetentionPolicy>) => RetentionPolicy =
  runtimeResolveRetentionPolicy as unknown as (scope: string, overrides?: Partial<RetentionPolicy>) => RetentionPolicy;
export const computeExpiryDate: (policy: RetentionPolicy, createdAt?: Date | string) => string | null =
  runtimeComputeExpiryDate as unknown as (policy: RetentionPolicy, createdAt?: Date | string) => string | null;
export const computeReviewDate: (policy: RetentionPolicy, createdAt?: Date | string) => string | null =
  runtimeComputeReviewDate as unknown as (policy: RetentionPolicy, createdAt?: Date | string) => string | null;
export const isExpired: (retention?: Partial<MemoryRetention>) => boolean =
  runtimeIsExpired as unknown as (retention?: Partial<MemoryRetention>) => boolean;
export const createMemoryRecord: (input: MemoryWriteInput) => MemoryRecord =
  runtimeCreateMemoryRecord as unknown as (input: MemoryWriteInput) => MemoryRecord;

export const GuruloMemorySDK: {
  new (adapter: MemoryAdapter, options?: { retentionPolicies?: Partial<Record<MemoryScope, RetentionPolicy>> }): {
    write(input: MemoryWriteInput): Promise<MemoryRecord>;
    read(scope: MemoryScope | string, subject: string, options?: MemoryReadContext): Promise<MemoryRecord[]>;
    delete(scope: MemoryScope | string, subject: string, recordId: string): Promise<boolean>;
    listSubjects(scope: MemoryScope | string): Promise<string[]>;
    enforceRetention(scope: MemoryScope | string, subject: string, options?: MemoryReadContext): Promise<{ purged: number }>;
  };
} = RuntimeSDK as unknown as {
  new (adapter: MemoryAdapter, options?: { retentionPolicies?: Partial<Record<MemoryScope, RetentionPolicy>> }): {
    write(input: MemoryWriteInput): Promise<MemoryRecord>;
    read(scope: MemoryScope | string, subject: string, options?: MemoryReadContext): Promise<MemoryRecord[]>;
    delete(scope: MemoryScope | string, subject: string, recordId: string): Promise<boolean>;
    listSubjects(scope: MemoryScope | string): Promise<string[]>;
    enforceRetention(scope: MemoryScope | string, subject: string, options?: MemoryReadContext): Promise<{ purged: number }>;
  };
};
