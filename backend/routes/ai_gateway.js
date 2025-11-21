const express = require('express');
const fetch = global.fetch
  ? (...args) => global.fetch(...args)
  : (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));
const { createServiceToken, getServiceAuthConfigs } = require('../../shared/serviceToken');

const router = express.Router();

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'https://backend.ai.bakhmaro.co').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_HEALTH_TIMEOUT_MS || 5000);
const serviceAuthConfig = getServiceAuthConfigs()[0] || null;

const fallbackModels = [
  {
    id: 'llama-3.1-8b-instant',
    label: 'LLaMA 3.1 8B (სწრაფი)',
    category: 'small',
    description: 'სწრაფი მოდელი ყოველდღიური ამოცანებისთვის',
  },
  {
    id: 'llama-3.3-70b-versatile',
    label: 'LLaMA 3.3 70B (ძლიერი)',
    category: 'large',
    description: 'ძლიერი მოდელი რთული ამოცანებისთვის',
  },
];

const buildHeaders = () => {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'backend-ai-gateway',
  };

  if (serviceAuthConfig) {
    try {
      const token = createServiceToken({
        svc: 'backend-ai-gateway',
        service: 'backend-ai-gateway',
        role: 'SYSTEM_BOT',
        permissions: ['health', 'status', 'models'],
      });
      headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.warn('⚠️ [AI Gateway] Failed to issue service token:', error.message);
    }
  }

  return headers;
};

const fetchFromAiService = async (path) => {
  if (!AI_SERVICE_URL) {
    throw new Error('AI_SERVICE_URL not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'GET',
      headers: buildHeaders(),
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (error) {
      data = text;
    }

    if (!response.ok) {
      const details = typeof data === 'string' ? data : JSON.stringify(data);
      throw new Error(`AI service ${path} responded with ${response.status}${details ? `: ${details}` : ''}`);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const buildErrorPayload = (error) => ({
  ok: false,
  status: 'unavailable',
  success: false,
  error: 'AI_SERVICE_UNAVAILABLE',
  message: error?.message || 'AI service unreachable',
  source: AI_SERVICE_URL,
  timestamp: new Date().toISOString(),
});

// Allow certain subpaths to fall through to other routers mounted on /api/ai
router.use((req, _res, next) => {
  const path = req.path || '';
  if (path.startsWith('/autoimprove') || path.startsWith('/deploy')) {
    return next('router');
  }
  return next();
});

const proxyAiRequest = async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const targetUrl = `${AI_SERVICE_URL}/api/ai${req.url}`;
    const headers = {
      ...buildHeaders(),
      'Content-Type': req.get('content-type') || 'application/json',
      'x-forwarded-for': req.ip,
    };

    const init = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (!['GET', 'HEAD'].includes(req.method.toUpperCase())) {
      init.body =
        req.body && Object.keys(req.body).length > 0
          ? JSON.stringify(req.body)
          : req['rawBody'] || undefined;
    }

    const response = await fetch(targetUrl, init);
    const text = await response.text();

    res.status(response.status);

    try {
      const json = text ? JSON.parse(text) : null;
      res.json(json);
    } catch {
      res
        .type(response.headers?.get?.('content-type') || 'application/json')
        .send(text);
    }
  } catch (error) {
    console.error('❌ [AI Gateway] Proxy request failed:', {
      path: req.url,
      method: req.method,
      message: error?.message,
    });
    res.status(502).json(buildErrorPayload(error));
  } finally {
    clearTimeout(timeout);
  }
};

router.get('/health', async (_req, res) => {
  try {
    const data = await fetchFromAiService('/api/ai/health');
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      ok: typeof data?.ok === 'boolean' ? data.ok : true,
      status: data?.status || data?.health || 'ok',
      proxied: true,
      source: AI_SERVICE_URL,
      ...data,
      timestamp: data?.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [AI Gateway] Health proxy failed:', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json(buildErrorPayload(error));
  }
});

router.get('/status', async (_req, res) => {
  try {
    const data = await fetchFromAiService('/api/ai/status');
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      proxied: true,
      source: AI_SERVICE_URL,
      ...data,
      timestamp: data?.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [AI Gateway] Status proxy failed:', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json(buildErrorPayload(error));
  }
});

router.get('/models', async (_req, res) => {
  try {
    const data = await fetchFromAiService('/api/ai/models');
    const models = Array.isArray(data?.models) ? data.models : fallbackModels;

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      models,
      proxied: true,
      fallback: !Array.isArray(data?.models),
      source: AI_SERVICE_URL,
      timestamp: data?.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [AI Gateway] Models proxy failed:', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      success: true,
      models: fallbackModels,
      proxied: false,
      fallback: true,
      source: AI_SERVICE_URL,
      status: 'degraded',
      error: error?.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Proxy vector memory endpoints (stats/search/embeddings/etc.)
router.all(/^\/vector-memory(?:\/.*)?$/, proxyAiRequest);

// Fallback proxy for any additional AI service routes not explicitly mapped above
router.all(/^\/.*$/, proxyAiRequest);

module.exports = router;
