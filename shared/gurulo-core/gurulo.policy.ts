import {
  DEFAULT_PERMISSIONS as RUNTIME_DEFAULT_PERMISSIONS,
  PROHIBITED_DISCLOSURES as RUNTIME_PROHIBITED_DISCLOSURES,
  enforcePolicy as runtimeEnforcePolicy,
  registerSafetyHook as runtimeRegisterSafetyHook,
} from './gurulo.policy.js';

export interface GuruloPermissions {
  allowUiNavigation: boolean;
  allowFileSystemEdits: boolean;
  allowSecretInspection: boolean;
  allowEscalation: boolean;
  allowThirdPartyAttribution: boolean;
}

export interface PolicyRule {
  code: string;
  pattern: RegExp;
  replacement: string;
  message: string;
}

export interface PolicyContext {
  audience?: 'public_front' | 'admin_dev' | string;
  [key: string]: unknown;
}

export interface PolicyResult {
  text: string;
  violations: string[];
  warnings: string[];
  permissions: GuruloPermissions;
}

export type SafetyHook = (payload: { result: PolicyResult; context: PolicyContext }) =>
  | void
  | {
      text?: string;
      warnings?: string[];
      violations?: string[];
    };

export const DEFAULT_PERMISSIONS: GuruloPermissions =
  RUNTIME_DEFAULT_PERMISSIONS as GuruloPermissions;
export const PROHIBITED_DISCLOSURES: PolicyRule[] =
  RUNTIME_PROHIBITED_DISCLOSURES as PolicyRule[];

export const enforcePolicy: (text: string, context?: PolicyContext) => PolicyResult =
  runtimeEnforcePolicy as unknown as (text: string, context?: PolicyContext) => PolicyResult;
export const registerSafetyHook: (hook: SafetyHook) => () => void =
  runtimeRegisterSafetyHook as unknown as (hook: SafetyHook) => () => void;
