import {
  MEMORY_SCOPES as RUNTIME_MEMORY_SCOPES,
  ROLE_VISIBILITY as RUNTIME_ROLE_VISIBILITY,
  DEFAULT_RETENTION_POLICIES as RUNTIME_DEFAULT_RETENTION_POLICIES,
  normalizeScope as runtimeNormalizeScope,
  resolveRetentionPolicy as runtimeResolveRetentionPolicy,
  computeExpiryDate as runtimeComputeExpiryDate,
  computeReviewDate as runtimeComputeReviewDate,
  isExpired as runtimeIsExpired,
  createMemoryRecord as runtimeCreateMemoryRecord,
} from './memory.contracts.js';

export type MemoryScope = 'user' | 'org' | 'system';
export type RoleVisibility = 'user' | 'org_admin' | 'admin' | 'super_admin' | 'system';

export interface RetentionPolicy {
  id: string;
  ttlDays: number;
  reviewDays?: number | null;
  pii: 'user' | 'mixed' | 'system' | string;
}

export interface MemoryRetention {
  policyId: string;
  ttlDays: number;
  reviewDays?: number | null;
  expiresAt: string | null;
  reviewAt: string | null;
}

export interface MemoryActor {
  type: 'user' | 'system' | 'service';
  id: string | null;
  label?: string | null;
}

export interface MemoryRecordPayload {
  value?: unknown;
  [key: string]: unknown;
}

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  subject: string;
  payload: MemoryRecordPayload;
  tags: string[];
  visibility: RoleVisibility[];
  retention: MemoryRetention;
  actor: MemoryActor;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
export const createMemoryRecord: (input: {
  scope: string;
  subject: string;
  payload: MemoryRecordPayload;
  tags?: string[];
  visibility?: string[];
  retention?: Partial<MemoryRetention> & { policy?: Partial<RetentionPolicy> };
  actor?: Partial<MemoryActor>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  metadata?: Record<string, unknown>;
  id?: string;
}) => MemoryRecord = runtimeCreateMemoryRecord as unknown as (input: {
  scope: string;
  subject: string;
  payload: MemoryRecordPayload;
  tags?: string[];
  visibility?: string[];
  retention?: Partial<MemoryRetention> & { policy?: Partial<RetentionPolicy> };
  actor?: Partial<MemoryActor>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  metadata?: Record<string, unknown>;
  id?: string;
}) => MemoryRecord;
