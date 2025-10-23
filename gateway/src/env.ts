import { z } from 'zod';

const parseCsvList = (value: string): string[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  PROPERTY_API_URL: z.string().url().default('http://property-api:5100'),
  GATEWAY_PROPERTY_API_URL: z.string().url().optional(),
  REMOTE_SITE_BASE: z.string().url().optional(),
  UPSTREAM_API_URL: z.string().url().optional(),
  STATIC_ROOT: z.string().default('../../ai-frontend/dist'),
  CORS_ALLOWED_ORIGIN: z
    .string()
    .default('https://ai.bakhmaro.co,http://localhost:3000,http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  SERVICE_JWT_ISSUER: z.string().default('ai-gateway'),
  SERVICE_JWT_SUBJECT: z.string().default('gateway-service'),
  SERVICE_JWT_TTL: z.coerce.number().int().positive().default(60),
  LOGIN_PATH: z.string().default('/login'),
  ROOT_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  SESSION_COOKIE_NAMES: z
    .string()
    .default('bk_admin.sid,connect.sid,__Secure-bk_admin.sid,bk_customer.sid')
    .transform((value) =>
      value
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    ),
  SITE_MAPPING_GITHUB: z.string().optional(),
  PUBLIC_ORIGIN: z.string().optional(),
  AI_DOMAIN: z.string().optional(),
  CSP_SCRIPT_SRC: z
    .string()
    .default('')
    .transform((value) => parseCsvList(value)),
});

type ParsedEnv = z.infer<typeof baseSchema>;

export type GatewayEnv = Omit<ParsedEnv, 'SITE_MAPPING_GITHUB'> & {
  REMOTE_SITE_BASE: string;
  COOKIE_DOMAIN: string | null;
  SESSION_COOKIE_NAMES: string[];
  PROPERTY_API_URL: string;
  SITE_MAPPING_GITHUB: Record<string, string>;
  PUBLIC_ORIGIN: string | null;
  AI_DOMAIN: string | null;
  CSP_SCRIPT_SRC: string[];
};

let cachedEnv: GatewayEnv | null = null;

export const getEnv = (): GatewayEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = baseSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ gateway environment validation failed:', parsed.error.format());
    throw new Error('Invalid environment configuration for gateway');
  }

  const data = parsed.data;
  const remoteBase = data.REMOTE_SITE_BASE ?? data.UPSTREAM_API_URL ?? 'http://127.0.0.1:5002';
  const propertyApiUrl = data.GATEWAY_PROPERTY_API_URL ?? data.PROPERTY_API_URL;
  let siteMapping: Record<string, string> = {};
  if (typeof data.SITE_MAPPING_GITHUB === 'string' && data.SITE_MAPPING_GITHUB.trim().length > 0) {
    try {
      siteMapping = JSON.parse(data.SITE_MAPPING_GITHUB);
    } catch (error) {
      console.warn('⚠️ Failed to parse SITE_MAPPING_GITHUB env variable:', error);
    }
  }

  const normalisedRoot = data.ROOT_DOMAIN.trim().replace(/^\.+/, '');
  const cookieDomain = normalisedRoot.length > 0 ? `.${normalisedRoot}` : null;

  const aiDomain = typeof data.AI_DOMAIN === 'string' && data.AI_DOMAIN.trim().length > 0 ? data.AI_DOMAIN.trim() : null;
  const publicOriginRaw = typeof data.PUBLIC_ORIGIN === 'string' && data.PUBLIC_ORIGIN.trim().length > 0
    ? data.PUBLIC_ORIGIN.trim()
    : null;
  const publicOrigin = publicOriginRaw ?? aiDomain ?? null;

  cachedEnv = {
    ...data,
    REMOTE_SITE_BASE: remoteBase,
    COOKIE_DOMAIN: cookieDomain,
    SESSION_COOKIE_NAMES: data.SESSION_COOKIE_NAMES,
    PROPERTY_API_URL: propertyApiUrl,
    SITE_MAPPING_GITHUB: siteMapping,
    AI_DOMAIN: aiDomain,
    PUBLIC_ORIGIN: publicOrigin,
    CSP_SCRIPT_SRC: data.CSP_SCRIPT_SRC,
  };

  return cachedEnv;
};
