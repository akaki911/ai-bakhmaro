import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { getEnv } from './env';
import commissionRouter from './routes/commission';

const env = getEnv();
const app = express();

app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGIN ? [env.ALLOWED_ORIGIN] : true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'property-api', timestamp: new Date().toISOString() });
});

app.use('/commission', commissionRouter);

const port = env.PORT;
app.listen(port, () => {
  console.log(`🏡 Property API listening on port ${port}`);
});

export default app;
