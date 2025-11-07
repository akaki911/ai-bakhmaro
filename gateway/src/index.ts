import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import jwt from 'jsonwebtoken';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { LegacyOptions } from 'http-proxy-middleware/dist/legacy';
import type { ClientRequest, IncomingMessage } from 'http';
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

type HelmetWithContentSecurityPolicy = typeof helmet & {
  contentSecurityPolicy: {
    getDefaultDirectives: () => Record<string, Iterable<string>>;
  };
};

const helmetWithCsp = helmet as HelmetWithContentSecurityPolicy;
const defaultCspDirectives = helmetWithCsp.contentSecurityPolicy.getDefaultDirectives();
const buildDirectiveSet = (values: Iterable<string> = []): Set<string> => new Set(values);

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

const REPLIT_SUFFIXES = ['.replit.dev', '.repl.co'];

const parseUrl = (value: string | null | undefined): URL | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value);
  } catch (error) {
    console.warn('⚠️ Failed to parse URL', value, error);
    return null;
  }
};

const normaliseHost = (host: string | null | undefined): string | null => {
  if (!host || typeof host !== 'string') {
    return null;
  }
  const trimmed = host.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureHttpsForKnownHosts = (origin: string | null, host: string | null): string | null => {
  if (!origin || !host) {
    return origin;
  }

  if (REPLIT_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    try {
      const parsed = new URL(origin);
      parsed.protocol = 'https:';
      parsed.port = '';
      return parsed.origin;
    } catch {
      return `https://${host}`;
    }
  }

  return origin;
};

const resolveOriginFromHost = (host: string | null, proto: string | null): string | null => {
  const baseHost = normaliseHost(host?.split(':')[0] ?? host);
  if (!baseHost) {
    return null;
  }

  const scheme = proto && proto.trim().toLowerCase() === 'http' ? 'http' : 'https';
  return ensureHttpsForKnownHosts(`${scheme}://${baseHost}`, baseHost);
};

const resolveWebAuthnPolicy = (req: Request) => {
  const forwardedProto = getFirstHeaderValue(req.headers['x-forwarded-proto']);
  const forwardedHost = getFirstHeaderValue(req.headers['x-forwarded-host']);
  const headerOrigin = getFirstHeaderValue(req.headers.origin);
  const hostHeader = req.headers.host ?? null;

  const envOriginUrl = parseUrl(env.PUBLIC_ORIGIN ?? env.AI_DOMAIN ?? null);
  let origin = envOriginUrl?.origin ?? null;
  let rpId = normaliseHost(envOriginUrl?.hostname ?? null);

  const requestOriginUrl = parseUrl(headerOrigin);
  if (requestOriginUrl) {
    origin = ensureHttpsForKnownHosts(requestOriginUrl.origin, normaliseHost(requestOriginUrl.hostname)) ?? origin;
    rpId = normaliseHost(requestOriginUrl.hostname) ?? rpId;
  }

  const forwardedOrigin = resolveOriginFromHost(forwardedHost, forwardedProto);
  if (!origin && forwardedOrigin) {
    origin = forwardedOrigin;
  }

  const directHostOrigin = resolveOriginFromHost(hostHeader, forwardedProto ?? req.protocol);
  if (!origin && directHostOrigin) {
    origin = directHostOrigin;
  }

  if (!rpId && origin) {
    const parsedOrigin = parseUrl(origin);
    rpId = normaliseHost(parsedOrigin?.hostname ?? null);
  }

  if (!origin && rpId) {
    origin = ensureHttpsForKnownHosts(`https://${rpId}`, rpId);
  }

  if (!origin) {
    origin = ensureHttpsForKnownHosts(directHostOrigin ?? forwardedOrigin ?? envOriginUrl?.origin ?? null, rpId) ?? 'https://localhost';
  }

  if (!rpId) {
    rpId = normaliseHost(parseUrl(origin)?.hostname ?? null) ?? 'localhost';
  }

  return {
    rpId,
    origin,
    expectedOrigins: origin ? [origin] : [],
    attestation: 'none' as const,
    allowAttestation: false,
    userVerification: 'preferred' as const,
    residentKey: 'preferred' as const,
    timeout: 120000,
  };
};

const applyForwardedHeaders = (proxyReq: ClientRequest, req: Request): void => {
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

const applyServiceAuth = (audience: ServiceAudience) => (proxyReq: ClientRequest, req: Request): void => {
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

type GatewayProxyOptions = LegacyOptions<Request, Response> & { target: string };
type ExtraProxyOptions =
  Partial<Omit<GatewayProxyOptions, 'target' | 'onProxyReq' | 'onProxyRes'>> &
  Pick<Partial<GatewayProxyOptions>, 'onProxyReq' | 'onProxyRes'>;

const createExpressProxyMiddleware = createProxyMiddleware as unknown as (
  options: GatewayProxyOptions,
) => RequestHandler;

const createProxy = (target: string, audience: ServiceAudience, extra: ExtraProxyOptions = {}): RequestHandler => {
  const { onProxyReq: upstreamOnProxyReq, onProxyRes: upstreamOnProxyRes, ...rest } = extra;

  const options: GatewayProxyOptions = {
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    logLevel,
    proxyTimeout: 30_000,
    timeout: 30_000,
    xfwd: true,
    ...rest,
    onProxyReq(proxyReq: ClientRequest, req: Request, res: Response) {
      applyServiceAuth(audience)(proxyReq, req);
      applyForwardedHeaders(proxyReq, req);
      if (typeof upstreamOnProxyReq === 'function') {
        upstreamOnProxyReq(proxyReq, req, res);
      }
    },
    onError(err: Error, req: Request, res: Response) {
      console.error(`❌ Proxy error for ${audience} (${req.method} ${req.url}) → ${target}:`, err);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
      }
      res.end(JSON.stringify({ error: 'Bad gateway', code: 'UPSTREAM_UNAVAILABLE' }));
    },
    onProxyRes(proxyRes: IncomingMessage, req: Request, res: Response) {
      const headers = proxyRes.headers;
      const header = headers['set-cookie'];
      if (Array.isArray(header)) {
        headers['set-cookie'] = header.map((value) => normaliseCookie(value));
      } else if (typeof header === 'string') {
        headers['set-cookie'] = [normaliseCookie(header)];
      }

      if (typeof upstreamOnProxyRes === 'function') {
        upstreamOnProxyRes(proxyRes, req, res);
      }
    },
  };

  return createExpressProxyMiddleware(options);
};

const sendIndexHtml = (res: Response, next: NextFunction) => {
  res.sendFile(path.join(staticRoot, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
};

app.use((req: Request, res: Response, next: NextFunction) => {
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

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/auth/webauthn/policy', (req: Request, res: Response) => {
  const policy = resolveWebAuthnPolicy(req);
  res.setHeader('cache-control', 'no-store, no-cache, must-revalidate');
  res.json({ success: true, policy });
});

const siteMapping: Record<string, string> = env.SITE_MAPPING_GITHUB;
app.use('/api/sites/:siteId/github', (req: Request, res: Response, next: NextFunction) => {
  const repo = siteMapping[req.params.siteId];
  if (!repo) {
    res.status(404).json({ error: 'Unknown site', siteId: req.params.siteId });
    return;
  }
  req.headers['x-target-repo'] = repo;
  next();
});

['/api/auth', '/api/admin', '/api/device', '/api/health', '/api/version'].forEach((path) => {
  app.use(path, createProxy(env.BACKEND_PROXY_BASE, 'backend'));
});
app.use('/api', createProxy(env.API_PROXY_BASE, 'ai-service'));

app.use(express.static(staticRoot, { index: false, maxAge: env.NODE_ENV === 'production' ? '1h' : 0 }));

const ensureAuth: RequestHandler = (req, res, next) => {
  if (!isAuthenticatedRequest(req)) {
    res.redirect(302, env.LOGIN_PATH);
    return;
  }

  next();
};

app.get(env.LOGIN_PATH, (_req: Request, res: Response, next: NextFunction) => {
  sendIndexHtml(res, next);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
    port: env.PORT
  });
});

app.get('/', ensureAuth, (_req: Request, res: Response, next: NextFunction) => {
  sendIndexHtml(res, next);
});

app.get('/index.html', ensureAuth, (_req: Request, res: Response, next: NextFunction) => {
  sendIndexHtml(res, next);
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if ((req.method ?? '').toUpperCase() !== 'GET') {
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
  app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Gateway listening on port ${port}`);
  });
}

export default app;
