import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getEnv } from './env';
import { requireServiceToken } from './middleware/serviceAuth';
import commissionRouter from './routes/commission';

const env = getEnv();
const app = express();
const allowedOrigins = new Set(env.ALLOWED_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not permitted`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'property-api', timestamp: new Date().toISOString() });
});

app.use('/commission', requireServiceToken(), commissionRouter);

const port = env.PORT;
app.listen(port, () => {
  console.log(`🏡 Property API listening on port ${port}`);
});

export default app;
