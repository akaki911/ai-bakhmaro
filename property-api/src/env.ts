import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5100),

  FIREBASE_PROJECT_ID: z.string().min(1, 'ai-bakhmaro'),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Comma-separated origins. Example: "https://ai.bakhmaro.co"
  ALLOWED_ORIGIN: z.string().optional(),
  CORS_ALLOWED_ORIGIN: z.string().optional(),

  INTERNAL_SERVICE_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'EeRXxs92ARsT48HE7jJhZYkYxr9MHGPQ'),
  SERVICE_JWT_ISSUER: z.string().default('ai-gateway'),
  SERVICE_JWT_AUDIENCE: z.string().default('property-api'),
  SERVICE_JWT_SUBJECT: z.string().default('gateway-service'),
});

type ParsedEnv = z.infer<typeof envSchema>;

export type PropertyApiEnv = Omit<ParsedEnv, 'ALLOWED_ORIGIN'> & {
  ALLOWED_ORIGIN: string;
};

let cachedEnv: PropertyApiEnv | null = null;

export const getEnv = (): PropertyApiEnv => {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('❌ property-api environment validation failed:', formatted);
    throw new Error('Invalid environment configuration for property-api');
  }

  const data = parsed.data;
  const fallbackOrigins = 'https://ai.bakhmaro.co';
  const allowedOrigin = data.ALLOWED_ORIGIN?.trim();
  const corsAllowedOrigin = data.CORS_ALLOWED_ORIGIN?.trim();
  const effectiveAllowedOrigin =
    (allowedOrigin && allowedOrigin.length > 0 ? allowedOrigin : null) ??
    (corsAllowedOrigin && corsAllowedOrigin.length > 0 ? corsAllowedOrigin : null) ??
    fallbackOrigins;

  cachedEnv = {
    ...data,
    ALLOWED_ORIGIN: effectiveAllowedOrigin,
  };
  return cachedEnv;
};
