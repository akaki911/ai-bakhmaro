import { buildApiUrlRaw, getApiBaseRaw } from './apiBase.shared.js';

export const getApiBase = (): string => getApiBaseRaw();

export const buildApiUrl = (path: string): string => buildApiUrlRaw(path);
