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
import { buildAllowedOriginsSet, createCorsOriginValidator } from './cors.js';

const env = getEnv();
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, env.STATIC_ROOT);
const logLevel = env.NODE_ENV === 'production' ? 'warn' : 'debug';

const defaultCspDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
const buildDirectiveSet = (values: string[] = []): Set<string> => new Set(values);

const scriptSrc = buildDirectiveSet(defaultCspDirectives['script-src'] ?? ["'self'"]);
env.CSP_SCRIPT_SRC.forEach((origin) => {
  if (origin && origin.length > 0) {
    scriptSrc.add(origin);
  }
});
if (env.NODE_ENV !== 'production') {
  scriptSrc.add("'unsafe-eval'");
}

const styleSrc = buildDirectiveSet(defaultCspDirectives['style-src'] ?? ["'self'"]);
styleSrc.add("'unsafe-inline'");

const imgSrc = buildDirectiveSet(defaultCspDirectives['img-src'] ?? ["'self'"]);
imgSrc.add('data:');
imgSrc.add('https:');
imgSrc.add('http:');

const connectSrc = buildDirectiveSet(defaultCspDirectives['connect-src'] ?? ["'self'"]);
connectSrc.add(env.API_PROXY_BASE);
connectSrc.add(env.BACKEND_PROXY_BASE);
connectSrc.add('https:');
connectSrc.add('wss:');
connectSrc.add('http:');
connectSrc.add('ws:');

const fontSrc = buildDirectiveSet(defaultCspDirectives['font-src'] ?? ["'self'"]);
fontSrc.add('data:');
fontSrc.add('https:');
fontSrc.add('http:');

const workerSrc = buildDirectiveSet(defaultCspDirectives['worker-src'] ?? ["'self'"]);
workerSrc.add('blob:');

const contentSecurityPolicyDirectives = {
  ...defaultCspDirectives,
  "default-src": defaultCspDirectives['default-src'] ?? ["'self'"],
  "script-src": Array.from(scriptSrc),
  "style-src": Array.from(styleSrc),
  "img-src": Array.from(imgSrc),
  "connect-src": Array.from(connectSrc),
  "font-src": Array.from(fontSrc),
  "worker-src": Array.from(workerSrc),
};

if (!fs.existsSync(staticRoot)) {
  console.warn(`⚠️ Static root ${staticRoot} does not exist; SPA responses may fail until the frontend is built.`);
}
const allowedOrigins = buildAllowedOriginsSet(env.CORS_ALLOWED_ORIGIN);
if (env.PUBLIC_ORIGIN) {
  allowedOrigins.add(env.PUBLIC_ORIGIN);
}
if (env.AI_DOMAIN) {
  allowedOrigins.add(env.AI_DOMAIN);
}
const validateOrigin = createCorsOriginValidator(allowedOrigins, {
  errorMessage: (origin) => `Origin ${origin} is not allowed by CORS policy`,
});
const cookieDomain = env.COOKIE_DOMAIN;
const cookieSecure = env.COOKIE_SECURE;
const sessionCookieNameSet = new Set(env.SESSION_COOKIE_NAMES);
const isSessionCookieName = createSessionCookieChecker(sessionCookieNameSet);

type ServiceAudience = 'ai-service' | 'backend';

const headerHasValue = (value: string | string[] | undefined): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim().length > 0);
  }
  return typeof value === 'string' && value.trim().length > 0;
};

const getFirstHeaderValue = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) {
        return entry;
      }
    }
    return null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return null;
};

const applyForwardedHeaders = (proxyReq: ClientRequest, req: Request) => {
  const originalHost = getFirstHeaderValue(req.headers['x-forwarded-host']) ?? req.headers.host;
  if (originalHost) {
    proxyReq.setHeader('x-forwarded-host', originalHost);
  }

  const originalProto =
    getFirstHeaderValue(req.headers['x-forwarded-proto']) ||
    (req.protocol || (req.secure ? 'https' : 'http'));
  if (originalProto) {
    proxyReq.setHeader('x-forwarded-proto', originalProto);
  }

  const forwardedPort = getFirstHeaderValue(req.headers['x-forwarded-port']);
  if (forwardedPort) {
    proxyReq.setHeader('x-forwarded-port', forwardedPort);
  }

  const originHeader = getFirstHeaderValue(req.headers.origin);
  if (originHeader) {
    proxyReq.setHeader('origin', originHeader);
  } else if (env.PUBLIC_ORIGIN) {
    proxyReq.setHeader('origin', env.PUBLIC_ORIGIN);
  }
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
  const { onProxyReq: upstreamOnProxyReq, onProxyRes: upstreamOnProxyRes, ...rest } = extra;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    logLevel,
    proxyTimeout: 30_000,
    timeout: 30_000,
    xfwd: true,
    onProxyReq(proxyReq, req, res) {
      applyServiceAuth(audience)(proxyReq, req as Request);
      applyForwardedHeaders(proxyReq, req as Request);
      if (typeof upstreamOnProxyReq === 'function') {
        upstreamOnProxyReq(proxyReq, req, res);
      }
    },
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

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: contentSecurityPolicyDirectives,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);
app.use(compression());
app.use(
  cors({
    origin: validateOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const siteMapping = env.SITE_MAPPING_GITHUB || {};
app.use('/api/sites/:siteId/github', (req, res, next) => {
  const repo = siteMapping[req.params.siteId];
  if (!repo) {
    res.status(404).json({ error: 'Unknown site', siteId: req.params.siteId });
    return;
  }
  req.headers['x-target-repo'] = repo;
  next();
});

app.use('/api/auth/route-advice', createProxy(env.BACKEND_PROXY_BASE, 'backend'));

app.use('/api', createProxy(env.API_PROXY_BASE, 'ai-service'));

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

app.use((req, res, next) => {
  if (req.method.toUpperCase() !== 'GET') {
    next();
    return;
  }

  const requestPath = req.path ?? '';

  if (requestPath.startsWith('/api')) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Bad gateway', code: 'UPSTREAM_UNAVAILABLE' });
    }
    return;
  }

  if (requestPath === env.LOGIN_PATH) {
    sendIndexHtml(res, next);
    return;
  }

  if (!isAuthenticatedRequest(req)) {
    res.redirect(302, env.LOGIN_PATH);
    return;
  }

  sendIndexHtml(res, next);
});

if (env.NODE_ENV !== 'test') {
  const port = env.PORT;
  app.listen(port, () => {
    console.log(`🌐 Gateway listening on port ${port}`);
  });
}

export default app;
