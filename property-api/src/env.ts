import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5100),
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  ALLOWED_ORIGIN: z.string().optional(),
  INTERNAL_SERVICE_TOKEN: z.string().optional(),
});

export type PropertyApiEnv = z.infer<typeof envSchema>;

let cachedEnv: PropertyApiEnv | null = null;

export const getEnv = (): PropertyApiEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.format();
    console.error('❌ property-api environment validation failed:', formatted);
    throw new Error('Invalid environment configuration for property-api');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};
