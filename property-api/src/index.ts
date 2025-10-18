// @ts-nocheck
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getEnv } from './env';
import { buildAllowedOriginsSet, createCorsOriginValidator } from './cors';
import { requireServiceToken } from './middleware/serviceAuth';
import commissionRouter from './routes/commission';

const env = getEnv();
const app = express();
const allowedOrigins = buildAllowedOriginsSet(env.ALLOWED_ORIGIN);
const validateOrigin = createCorsOriginValidator(allowedOrigins, {
  errorMessage: (origin) => `Origin ${origin} is not permitted`,
});

app.use(helmet());
app.use(
  cors({
    origin: validateOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'property-api', timestamp: new Date().toISOString() });
});

app.use('/api/commission', requireServiceToken(), commissionRouter);

const port = env.PORT;
app.listen(port, () => {
  console.log(`🏡 Property API listening on port ${port}`);
});

export default app;
