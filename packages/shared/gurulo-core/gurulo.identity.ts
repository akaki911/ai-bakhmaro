import {
  guruloIdentity as runtimeIdentity,
  applyBrandGuard as runtimeApplyBrandGuard,
  ensureGeorgianTone as runtimeEnsureGeorgianTone,
  CANONICAL_NAME as RUNTIME_CANONICAL_NAME,
  DEFAULT_LOCALE as RUNTIME_DEFAULT_LOCALE,
  DEFAULT_SALUTATION as RUNTIME_DEFAULT_SALUTATION,
} from './gurulo.identity.js';

export interface GuruloToneRules {
  persona: string;
  principles: string[];
}

export interface GuruloIdentityContract {
  canonicalName: string;
  locale: string;
  salutation: string;
  toneRules: GuruloToneRules;
}

export interface BrandGuardOptions {
  salutation?: string;
  forceGeorgian?: boolean;
}

export interface BrandGuardResult {
  text: string;
  issues: string[];
}

export const CANONICAL_NAME: string = RUNTIME_CANONICAL_NAME;
export const DEFAULT_LOCALE: string = RUNTIME_DEFAULT_LOCALE;
export const DEFAULT_SALUTATION: string = RUNTIME_DEFAULT_SALUTATION;

export const guruloIdentity: GuruloIdentityContract = runtimeIdentity as GuruloIdentityContract;
export const applyBrandGuard: (text: string, context?: BrandGuardOptions) => BrandGuardResult =
  runtimeApplyBrandGuard as unknown as (text: string, context?: BrandGuardOptions) => BrandGuardResult;
export const ensureGeorgianTone: (text: string, options?: BrandGuardOptions) => string =
  runtimeEnsureGeorgianTone as unknown as (text: string, options?: BrandGuardOptions) => string;
