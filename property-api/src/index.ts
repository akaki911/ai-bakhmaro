import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { getEnv } from './env';
import commissionRouter from './routes/commission';

// --- Load env once ---
const env = getEnv();

// --- CORS allowlist (comma-separated in ALLOWED_ORIGIN) ---
const rawAllowed = (env.ALLOWED_ORIGIN ?? '').trim();

// Support: empty → dev allow, "*" → wildcard, otherwise comma list
const allowedList = rawAllowed
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const useWildcard = rawAllowed === '*';

const corsOptions: cors.CorsOptions = useWildcard
  ? {
      credentials: true,
      origin: true, // allow all origins
    }
  : allowedList.length > 0
  ? {
      credentials: true,
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl/same-origin
        if (allowedList.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin ${origin} is not permitted`));
      },
    }
  : {
      // dev fallback: allow all
      credentials: true,
      origin: true,
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
app.listen(port, '0.0.0.0', () => {
  console.log(`🏡 Property API listening on 0.0.0.0:${port}`);
});

export default app;
