import {
  buildApiUrlRaw,
  getApiBaseRaw,
  buildAiUrlRaw,
  getAiBaseRaw,
  buildAuthUrlRaw,
  getAuthBaseRaw,
  buildFilesUrlRaw,
  getFilesBaseRaw,
  buildConfigUrlRaw,
  getConfigBaseRaw,
} from './apiBase.shared.js';

export const getApiBase = (): string => getApiBaseRaw();

export const buildApiUrl = (path?: string): string => buildApiUrlRaw(path);

export const getAiBase = (): string => getAiBaseRaw();

export const buildAiUrl = (path?: string): string => buildAiUrlRaw(path);

export const getAuthBase = (): string => getAuthBaseRaw();

export const buildAuthUrl = (path?: string): string => buildAuthUrlRaw(path);

export const getFilesBase = (): string => getFilesBaseRaw();

export const buildFilesUrl = (path?: string): string => buildFilesUrlRaw(path);

export const getConfigBase = (): string => getConfigBaseRaw();

export const buildConfigUrl = (path?: string): string => buildConfigUrlRaw(path);
