import {
  SUPER_ADMIN_PERSONAL_ID as RUNTIME_SUPER_ADMIN_PERSONAL_ID,
  SUPER_ADMIN_CONFIRMATION_HEADER as RUNTIME_SUPER_ADMIN_CONFIRMATION_HEADER,
  normalizeClaims as runtimeNormalizeClaims,
  extractExpressClaims as runtimeExtractExpressClaims,
  extractFastifyClaims as runtimeExtractFastifyClaims,
  isSuperAdmin as runtimeIsSuperAdmin,
  requireRole as runtimeRequireRole,
  allowSuperAdmin as runtimeAllowSuperAdmin,
  hasSuperAdminConfirmation as runtimeHasSuperAdminConfirmation,
} from './gurulo.auth.js';

export interface GuruloClaims {
  personalId: string | null;
  roles: string[];
  orgs: string[];
  riskFlags: string[];
}

export interface GuardAuditEvent {
  action: string;
  allowed: boolean;
  destructive: boolean;
  reason: string | null;
  service: string;
  route: string | null;
  method: string | null;
  confirmationProvided: boolean;
  correlationId: string | null;
  claims: GuruloClaims;
  timestamp: string;
}

export type GuardAuditHook = (event: GuardAuditEvent, request: unknown) => void | Promise<void>;

export interface GuardOptions {
  allowSuperAdminOverride?: boolean;
  destructive?: boolean;
  action?: string;
  service?: string;
  audit?: GuardAuditHook | null;
  getClaims?: (request: unknown) => Partial<GuruloClaims> | null | undefined;
}

export type ExpressGuard = (req: any, res: any, next: (err?: any) => void) => void | Promise<void>;
export type FastifyGuard = (request: any, reply: any) => void | Promise<void>;

export interface GuruloRequireRole {
  (roles?: string[] | string, options?: GuardOptions): ExpressGuard;
  fastify: (roles?: string[] | string, options?: GuardOptions) => FastifyGuard;
}

export interface GuruloAllowSuperAdmin {
  (options?: GuardOptions): ExpressGuard;
  fastify: (options?: GuardOptions) => FastifyGuard;
}

export const SUPER_ADMIN_PERSONAL_ID: string = RUNTIME_SUPER_ADMIN_PERSONAL_ID;
export const SUPER_ADMIN_CONFIRMATION_HEADER: string = RUNTIME_SUPER_ADMIN_CONFIRMATION_HEADER;

export const normalizeClaims: (raw?: Partial<GuruloClaims> | null) => GuruloClaims =
  runtimeNormalizeClaims as unknown as (raw?: Partial<GuruloClaims> | null) => GuruloClaims;

export const extractExpressClaims: (req: any) => GuruloClaims =
  runtimeExtractExpressClaims as unknown as (req: any) => GuruloClaims;

export const extractFastifyClaims: (request: any) => GuruloClaims =
  runtimeExtractFastifyClaims as unknown as (request: any) => GuruloClaims;

export const isSuperAdmin: (personalId?: string | null) => boolean =
  runtimeIsSuperAdmin as unknown as (personalId?: string | null) => boolean;

export const requireRole: GuruloRequireRole = runtimeRequireRole as unknown as GuruloRequireRole;
export const allowSuperAdmin: GuruloAllowSuperAdmin =
  runtimeAllowSuperAdmin as unknown as GuruloAllowSuperAdmin;

export const hasSuperAdminConfirmation: (request: any) => boolean =
  runtimeHasSuperAdminConfirmation as unknown as (request: any) => boolean;
