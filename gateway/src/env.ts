import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  PROPERTY_API_URL: z.string().url().default('http://127.0.0.1:5100'),
  UPSTREAM_API_URL: z.string().url().default('http://127.0.0.1:5002'),
  STATIC_ROOT: z.string().default('../ai-frontend/dist'),
  CORS_ALLOWED_ORIGIN: z.string().optional(),
});

export type GatewayEnv = z.infer<typeof envSchema>;

let cachedEnv: GatewayEnv | null = null;

export const getEnv = (): GatewayEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ gateway environment validation failed:', parsed.error.format());
    throw new Error('Invalid environment configuration for gateway');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
};
