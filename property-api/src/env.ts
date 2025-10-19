import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5100),

  FIREBASE_PROJECT_ID: z.string().min(1, 'ai-bakhmaro'),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // Comma-separated origins. Example: "https://ai.bakhmaro.co"
  ALLOWED_ORIGIN: z.string().default('https://ai.bakhmaro.co'),

  INTERNAL_SERVICE_TOKEN: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'EeRXxs92ARsT48HE7jJhZYkYxr9MHGPQ'),
  SERVICE_JWT_ISSUER: z.string().default('ai-gateway'),
  SERVICE_JWT_AUDIENCE: z.string().default('property-api'),
  SERVICE_JWT_SUBJECT: z.string().default('gateway-service'),
});

export type PropertyApiEnv = z.infer<typeof envSchema>;

let cachedEnv: PropertyApiEnv | null = null;

export const getEnv = (): PropertyApiEnv => {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('❌ property-api environment validation failed:', formatted);
    throw new Error('Invalid environment configuration for property-api');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};
