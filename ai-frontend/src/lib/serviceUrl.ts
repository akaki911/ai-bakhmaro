import {
  buildAiUrl,
  buildApiUrl,
  buildAuthUrl,
  buildFilesUrl,
  buildConfigUrl,
} from './apiBase';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

export const resolveServiceUrl = (path: string): string => {
  if (!path || ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  if (path.startsWith('/api/ai')) {
    return buildAiUrl(path);
  }

  if (path.startsWith('/api/admin/auth')) {
    return buildAuthUrl(path);
  }

  if (path.startsWith('/api/files')) {
    return buildFilesUrl(path);
  }

  if (path.startsWith('/api/config')) {
    return buildConfigUrl(path);
  }

  if (path.startsWith('/api/')) {
    return buildApiUrl(path);
  }

  return path;
};

export const withServiceUrl = <T extends (...args: any[]) => any>(fn: T): T => {
  return ((url: string, ...rest: any[]) => fn(resolveServiceUrl(url), ...rest)) as T;
};
