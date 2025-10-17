import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { getEnv } from './env';

const env = getEnv();
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, env.STATIC_ROOT);

const proxyOptions = (target: string) => ({
  target,
  changeOrigin: true,
  secure: false,
  logLevel: env.NODE_ENV === 'production' ? 'warn' : 'debug',
});

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.CORS_ALLOWED_ORIGIN ? [env.CORS_ALLOWED_ORIGIN] : true,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'gateway',
    timestamp: new Date().toISOString(),
    propertyApi: env.PROPERTY_API_URL,
    upstreamApi: env.UPSTREAM_API_URL,
  });
});

app.use(
  '/api/property',
  createProxyMiddleware({
    ...proxyOptions(env.PROPERTY_API_URL),
    pathRewrite: { '^/api/property': '' },
  }),
);

app.use(
  '/api/commission',
  createProxyMiddleware({
    ...proxyOptions(env.PROPERTY_API_URL),
    pathRewrite: { '^/api/commission': '/commission' },
  }),
);

app.use('/api', createProxyMiddleware(proxyOptions(env.UPSTREAM_API_URL)));

app.use(express.static(staticRoot, { index: false }));

app.get('*', (req, res, next) => {
  if (req.method.toUpperCase() !== 'GET') {
    return next();
  }

  res.sendFile(path.join(staticRoot, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
});

const port = env.PORT;
app.listen(port, () => {
  console.log(`🌐 Gateway listening on port ${port}`);
});

export default app;
