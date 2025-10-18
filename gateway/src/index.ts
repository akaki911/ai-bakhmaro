// @ts-nocheck
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express-serve-static-core';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import type { ClientRequest } from 'http';
import { getEnv } from './env.js';
import { createCookieNormaliser, createSessionCookieChecker } from './cookies.js';

const env = getEnv();
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, env.STATIC_ROOT);
const logLevel = env.NODE_ENV === 'production' ? 'warn' : 'debug';

if (!fs.existsSync(staticRoot)) {
  console.warn(`⚠️ Static root ${staticRoot} does not exist; SPA responses may fail until the frontend is built.`);
}
const allowedOrigins = new Set(env.CORS_ALLOWED_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean));
const cookieDomain = env.COOKIE_DOMAIN;
const cookieSecure = env.COOKIE_SECURE;
const sessionCookieNameSet = new Set(env.SESSION_COOKIE_NAMES);
const isSessionCookieName = createSessionCookieChecker(sessionCookieNameSet);

type ServiceAudience = 'property-api' | 'remote-site';

const headerHasValue = (value: string | string[] | undefined): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim().length > 0);
  }
  return typeof value === 'string' && value.trim().length > 0;
};

const isAuthenticatedRequest = (req: Request): boolean => {
  if (headerHasValue(req.headers.authorization)) {
    return true;
  }
  if (headerHasValue(req.headers['x-service-token'])) {
    return true;
  }
  if (headerHasValue(req.headers['x-ai-internal-token'])) {
    return true;
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return false;
  }

  const cookieNames = cookieHeader
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter((name): name is string => Boolean(name && name.length > 0));

  return cookieNames.some((name) => isSessionCookieName(name));
};

const createServiceJwt = (audience: ServiceAudience, req: Request): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.SERVICE_JWT_ISSUER,
    sub: env.SERVICE_JWT_SUBJECT,
    aud: audience,
    iat: now,
    exp: now + env.SERVICE_JWT_TTL,
    jti: randomUUID(),
    method: req.method,
    path: req.originalUrl,
  } satisfies Record<string, unknown>;

  return jwt.sign(payload, env.JWT_SECRET, { algorithm: 'HS256' });
};

const applyServiceAuth = (audience: ServiceAudience) => (proxyReq: ClientRequest, req: Request) => {
  try {
    const token = createServiceJwt(audience, req);
    proxyReq.setHeader('authorization', `Bearer ${token}`);

    const originalAuth = req.headers.authorization;
    if (typeof originalAuth === 'string' && originalAuth.trim().length > 0) {
      proxyReq.setHeader('x-forwarded-authorization', originalAuth);
    } else if (Array.isArray(originalAuth) && originalAuth.length > 0) {
      proxyReq.setHeader('x-forwarded-authorization', originalAuth[0] ?? '');
    }
  } catch (error) {
    console.error(`❌ Failed to attach service JWT for ${audience}:`, error);
  }
};

export const normaliseCookie = createCookieNormaliser({
  cookieDomain,
  cookieSecure,
  hardenedCookieNames: sessionCookieNameSet,
});

const createProxy = (target: string, audience: ServiceAudience, extra: Options = {}) => {
  const { onProxyRes: upstreamOnProxyRes, ...rest } = extra;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    logLevel,
    proxyTimeout: 30_000,
    timeout: 30_000,
    onProxyReq: applyServiceAuth(audience),
    onError(err, req, res) {
      console.error(`❌ Proxy error for ${audience} (${req.method} ${req.url}) → ${target}:`, err);
      if (!res.headersSent) {
        res.writeHead?.(502, { 'Content-Type': 'application/json' });
      }
      res.end?.(JSON.stringify({ error: 'Bad gateway', code: 'UPSTREAM_UNAVAILABLE' }));
    },
    onProxyRes(proxyRes, req, res) {
      const header = proxyRes.headers['set-cookie'];
      if (Array.isArray(header)) {
        proxyRes.headers['set-cookie'] = header.map((value) => normaliseCookie(value));
      } else if (typeof header === 'string') {
        proxyRes.headers['set-cookie'] = normaliseCookie(header);
      }

      if (typeof upstreamOnProxyRes === 'function') {
        upstreamOnProxyRes(proxyRes, req, res);
      }
    },
    ...rest,
  });
};

const sendIndexHtml = (res: Response, next: NextFunction) => {
  res.sendFile(path.join(staticRoot, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
};

app.use((req, res, next) => {
  const host = req.headers.host?.toLowerCase();
  if (host === 'bakhmaro.co') {
    res.redirect(301, `https://ai.bakhmaro.co${req.originalUrl}`);
    return;
  }
  next();
});

app.use(helmet());
app.use(compression());
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

      callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  '/api/property',
  createProxy(env.PROPERTY_API_URL, 'property-api', {
    pathRewrite: { '^/api/property': '' },
  }),
);

app.use('/api', createProxy(env.REMOTE_SITE_BASE, 'remote-site'));

app.use(express.static(staticRoot, { index: false, maxAge: env.NODE_ENV === 'production' ? '1h' : 0 }));

const ensureAuth: RequestHandler = (req, res, next) => {
  if (!isAuthenticatedRequest(req)) {
    res.redirect(302, env.LOGIN_PATH);
    return;
  }

  next();
};

app.get(env.LOGIN_PATH, (req, res, next) => {
  sendIndexHtml(res, next);
});

app.get('/', ensureAuth, (req, res, next) => {
  sendIndexHtml(res, next);
});

app.get('/index.html', ensureAuth, (req, res, next) => {
  sendIndexHtml(res, next);
});

app.get('*', (req, res, next) => {
  if (req.method.toUpperCase() !== 'GET') {
    next();
    return;
  }

  if (req.path === env.LOGIN_PATH) {
    sendIndexHtml(res, next);
    return;
  }

  if (!isAuthenticatedRequest(req)) {
    res.redirect(302, env.LOGIN_PATH);
    return;
  }

  sendIndexHtml(res, next);
});

const port = env.PORT;
app.listen(port, () => {
  console.log(`🌐 Gateway listening on port ${port}`);
});

export default app;
