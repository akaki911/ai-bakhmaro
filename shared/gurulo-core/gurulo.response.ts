import {
  normalizeResponse as runtimeNormalizeResponse,
  SECTION_ORDER as RUNTIME_SECTION_ORDER,
  SECTION_LABELS as RUNTIME_SECTION_LABELS,
  GURULO_CORE_VERSION as RUNTIME_GURULO_CORE_VERSION,
} from './gurulo.response.js';

import type { PolicyResult, PolicyContext } from './gurulo.policy.js';
import type { BrandGuardResult, BrandGuardOptions } from './gurulo.identity.js';

export interface NormalizedSection {
  title: string;
  bullets: string[];
  cta: string;
}

export type NormalizedSectionKey = 'task' | 'plan' | 'final' | 'verification' | 'warnings';

export interface NormalizedMeta {
  policy: Pick<PolicyResult, 'violations' | 'warnings' | 'permissions'>;
  brand: Pick<BrandGuardResult, 'issues'>;
  source: Record<string, unknown>;
}

export interface NormalizedStructuredBlock {
  version: string;
  persona: string;
  address: string;
  language: 'ka' | 'en';
  locale: string;
  sections: Array<{ title: string; bullets: string[]; cta: string }>;
  warnings: string[];
  meta: NormalizedMeta;
  sectionOrder: NormalizedSectionKey[];
}

export interface NormalizeResponseOptions extends PolicyContext, BrandGuardOptions {
  sections?: Partial<Record<NormalizedSectionKey, unknown>>;
  warnings?: string[] | string;
  task?: string;
  plan?: string;
  final?: string;
  verification?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedResponse {
  version: string;
  persona: string;
  locale: string;
  language: 'ka' | 'en';
  address: string;
  user: {
    id: string;
    salutation: string;
  };
  plainText: string;
  sections: Record<NormalizedSectionKey, NormalizedSection>;
  warnings: string[];
  meta: NormalizedMeta;
  structured: NormalizedStructuredBlock[];
}

export const SECTION_ORDER: NormalizedSectionKey[] = RUNTIME_SECTION_ORDER as NormalizedSectionKey[];
export const SECTION_LABELS: Record<NormalizedSectionKey, { ka: string; en: string }> =
  RUNTIME_SECTION_LABELS as Record<NormalizedSectionKey, { ka: string; en: string }>;
export const GURULO_CORE_VERSION: string = RUNTIME_GURULO_CORE_VERSION;

export const normalizeResponse: (
  userId: string,
  source: unknown,
  meta?: NormalizeResponseOptions,
) => NormalizedResponse = runtimeNormalizeResponse as unknown as (
  userId: string,
  source: unknown,
  meta?: NormalizeResponseOptions,
) => NormalizedResponse;
