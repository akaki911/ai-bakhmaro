// property-api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { getEnv } from './env.js';              // ← აქ გამოვიყენეთ getEnv()
import commissionRouter from './routes/commission.js';

// --- Load env once ---
const env = getEnv();

// --- CORS allowlist (comma-separated in CORS_ORIGIN) ---
const allowed = (env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions =
  allowed.length > 0
    ? {
        credentials: true,
        origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
          // no Origin (curl / same-origin) -> allow
          if (!origin) return cb(null, true);
          if (allowed.includes(origin)) return cb(null, true);
          return cb(new Error(`Origin ${origin} is not permitted`));
        },
      }
    : {
        // dev fallback: allow all
        credentials: true,
        origin: true as const,
      };

// --- App bootstrap ---
const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'property-api',
    timestamp: new Date().toISOString(),
  });
});

// API
app.use('/api/commission', commissionRouter);

// Listen
const port = Number(env.PORT ?? 5100);
app.listen(port, () => {
  console.log(`🏡 Property API listening on port ${port}`);
});

export default app;
