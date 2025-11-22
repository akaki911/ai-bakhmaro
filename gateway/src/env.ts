import {
  normalizeNodeEnv,
  readEnvBoolean,
  readEnvCsv,
  readEnvNumber,
  readEnvString,
  readEnvUrl,
} from '../../shared/config/envReader.js';

const DEFAULT_SESSION_COOKIES = ['ai-space.sid', 'bk_admin.sid', '__Secure-bk_admin.sid'];
const DEFAULT_AI_PROXY_BASE = 'https://backend.ai.bakhmaro.co';
const DEFAULT_BACKEND_PROXY_BASE = 'https://backend.ai.bakhmaro.co';

export type GatewayEnv = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PROXY_BASE: string;
  BACKEND_PROXY_BASE: string;
  STATIC_ROOT: string;
  CORS_ALLOWED_ORIGIN: string;
  JWT_SECRET: string;
  SERVICE_JWT_ISSUER: string;
  SERVICE_JWT_SUBJECT: string;
  SERVICE_JWT_TTL: number;
  LOGIN_PATH: string;
  ROOT_DOMAIN: string;
  COOKIE_DOMAIN: string | null;
  COOKIE_SECURE: boolean;
  SESSION_COOKIE_NAMES: string[];
  SITE_MAPPING_GITHUB: Record<string, string>;
  PUBLIC_ORIGIN: string | null;
  AI_DOMAIN: string | null;
  CSP_SCRIPT_SRC: string[];
  REMOTE_SITE_BASE: string | null;
  UPSTREAM_API_URL: string | null;
};

let cachedEnv: GatewayEnv | null = null;

const parseSiteMapping = (raw: string | undefined | null): Record<string, string> => {
  if (!raw || raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, value]) => typeof value === 'string')
          .map(([key, value]) => [key, String(value)]),
      );
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse SITE_MAPPING_GITHUB env variable:', error);
  }

  return {};
};

const ensureCookieDomain = (rootDomain: string): string | null => {
  const cleaned = rootDomain.trim().replace(/^\.+/, '');
  return cleaned.length > 0 ? `.${cleaned}` : null;
};

export const getEnv = (): GatewayEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);
  process.env.NODE_ENV = nodeEnv;

  const port = readEnvNumber('PORT', { defaultValue: 3002, integer: true }) ?? 3002;

  const jwtSecret = (readEnvString('JWT_SECRET', {
    required: true,
    validate: (value) => {
      if (value.length < 16) {
        throw new Error('JWT_SECRET must be at least 16 characters long');
      }
    },
  }) as string).trim();

  const staticRoot = readEnvString('STATIC_ROOT', { defaultValue: '../../ai-frontend/dist' }) ??
    '../../ai-frontend/dist';

  const corsAllowedOrigin =
    readEnvString('CORS_ALLOWED_ORIGIN', { defaultValue: 'https://ai.bakhmaro.co' }) ??
    'https://ai.bakhmaro.co';

  const serviceIssuer = readEnvString('SERVICE_JWT_ISSUER', { defaultValue: 'ai-gateway' }) ?? 'ai-gateway';
  const serviceSubject = readEnvString('SERVICE_JWT_SUBJECT', { defaultValue: 'gateway-service' }) ??
    'gateway-service';
  const serviceTtl =
    readEnvNumber('SERVICE_JWT_TTL', {
      defaultValue: 60,
      integer: true,
      validate: (value) => {
        if (value <= 0) {
          throw new Error('SERVICE_JWT_TTL must be a positive integer');
        }
      },
    }) ?? 60;

  const loginPath = readEnvString('LOGIN_PATH', { defaultValue: '/login' }) ?? '/login';
  const rootDomain = readEnvString('ROOT_DOMAIN', { defaultValue: 'ai.bakhmaro.co' }) ?? 'ai.bakhmaro.co';
  const cookieDomain = ensureCookieDomain(rootDomain);
  const cookieSecure = readEnvBoolean('COOKIE_SECURE', { defaultValue: false }) ?? false;

  const sessionCookieNames =
    readEnvCsv('SESSION_COOKIE_NAMES', {
      defaultValue: DEFAULT_SESSION_COOKIES,
      unique: true,
      allowEmpty: true,
    }) ?? DEFAULT_SESSION_COOKIES;

  const cspScriptSrc =
    readEnvCsv('CSP_SCRIPT_SRC', { defaultValue: [], unique: true, allowEmpty: true }) ?? [];

  const siteMappingRaw = readEnvString('SITE_MAPPING_GITHUB', { allowEmpty: true });
  const siteMapping = parseSiteMapping(siteMappingRaw);

  const aiDomainRaw = readEnvString('AI_DOMAIN', { allowEmpty: true })?.trim() ?? '';
  const aiDomain = aiDomainRaw.length > 0 ? aiDomainRaw : null;

  const publicOriginRaw = readEnvUrl('PUBLIC_ORIGIN', { allowEmpty: true });
  const publicOriginExplicit = publicOriginRaw && publicOriginRaw.trim().length > 0 ? publicOriginRaw : null;

  const remoteSiteBase = readEnvUrl('REMOTE_SITE_BASE', { allowEmpty: true });
  const upstreamApiUrl = readEnvUrl('UPSTREAM_API_URL', { allowEmpty: true });
  const apiProxyBaseRaw = readEnvUrl('API_PROXY_BASE', { allowEmpty: true });
  const backendProxyRaw = readEnvUrl('BACKEND_PROXY_BASE', { allowEmpty: true });

  const apiProxyBase =
    (apiProxyBaseRaw && apiProxyBaseRaw.trim().length > 0 ? apiProxyBaseRaw : null) ??
    (upstreamApiUrl && upstreamApiUrl.trim().length > 0 ? upstreamApiUrl : null) ??
    (remoteSiteBase && remoteSiteBase.trim().length > 0 ? remoteSiteBase : null) ??
    DEFAULT_AI_PROXY_BASE;

  const backendProxyBase =
    (backendProxyRaw && backendProxyRaw.trim().length > 0 ? backendProxyRaw : null) ?? DEFAULT_BACKEND_PROXY_BASE;

  const publicOrigin = publicOriginExplicit ?? aiDomain;

  cachedEnv = {
    NODE_ENV: nodeEnv,
    PORT: port,
    API_PROXY_BASE: apiProxyBase,
    BACKEND_PROXY_BASE: backendProxyBase,
    STATIC_ROOT: staticRoot,
    CORS_ALLOWED_ORIGIN: corsAllowedOrigin,
    JWT_SECRET: jwtSecret,
    SERVICE_JWT_ISSUER: serviceIssuer,
    SERVICE_JWT_SUBJECT: serviceSubject,
    SERVICE_JWT_TTL: serviceTtl,
    LOGIN_PATH: loginPath,
    ROOT_DOMAIN: rootDomain.trim(),
    COOKIE_DOMAIN: cookieDomain,
    COOKIE_SECURE: cookieSecure,
    SESSION_COOKIE_NAMES: sessionCookieNames,
    SITE_MAPPING_GITHUB: siteMapping,
    PUBLIC_ORIGIN: publicOrigin,
    AI_DOMAIN: aiDomain,
    CSP_SCRIPT_SRC: cspScriptSrc,
    REMOTE_SITE_BASE: remoteSiteBase && remoteSiteBase.trim().length > 0 ? remoteSiteBase : null,
    UPSTREAM_API_URL: upstreamApiUrl && upstreamApiUrl.trim().length > 0 ? upstreamApiUrl : null,
  };

  return cachedEnv;
};
