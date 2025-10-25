import { normalizeFilesystemMemory as runtimeNormalizeFilesystemMemory } from './normalize-filesystem.js';

export interface NormalizeFilesystemOptions {
  sourceDir?: string;
  scope?: 'user' | 'org' | 'system';
  actor?: {
    type?: 'user' | 'system' | 'service';
    id?: string | null;
    label?: string | null;
  };
}

export interface NormalizeFilesystemSummary {
  processed: number;
  updated: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

export const normalizeFilesystemMemory: (options?: NormalizeFilesystemOptions) => Promise<NormalizeFilesystemSummary> =
  runtimeNormalizeFilesystemMemory as unknown as (options?: NormalizeFilesystemOptions) => Promise<NormalizeFilesystemSummary>;
