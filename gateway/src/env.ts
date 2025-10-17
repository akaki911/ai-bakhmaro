import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  PROPERTY_API_URL: z.string().url().default('http://127.0.0.1:5100'),
  REMOTE_SITE_BASE: z.string().url().optional(),
  UPSTREAM_API_URL: z.string().url().optional(),
  STATIC_ROOT: z.string().default('../ai-frontend/dist'),
  CORS_ALLOWED_ORIGIN: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  SERVICE_JWT_ISSUER: z.string().default('ai-gateway'),
  SERVICE_JWT_SUBJECT: z.string().default('gateway-service'),
  SERVICE_JWT_TTL: z.coerce.number().int().positive().default(60),
  LOGIN_PATH: z.string().default('/login'),
});

type ParsedEnv = z.infer<typeof baseSchema>;

export type GatewayEnv = ParsedEnv & {
  REMOTE_SITE_BASE: string;
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

  cachedEnv = {
    ...data,
    REMOTE_SITE_BASE: remoteBase,
  };

  return cachedEnv;
};
