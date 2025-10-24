import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';

import { normaliseCookie } from './cookies.js';

const hardenedCookieNames = new Set(['bk_admin.sid', 'connect.sid']);

describe('normaliseCookie', () => {
  it('upgrades session cookies with secure defaults when hardened', () => {
    const cookie =
      'bk_admin.sid=abc123; Path=/app; Domain=legacy.example.com; Expires=Wed, 21 Oct 2015 07:28:00 GMT';

    const result = normaliseCookie(cookie, {
      cookieDomain: '.example.com',
      cookieSecure: true,
      hardenedCookieNames,
    });

    assert.equal(
      result,
      '__Host-bk_admin.sid=abc123; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; SameSite=None; Secure; HttpOnly',
    );
  });

  it('preserves non-session cookies without forcing HttpOnly', () => {
    const cookie = 'csrftoken=xyz; Path=/foo; Domain=legacy.example.com; Max-Age=3600';

    const result = normaliseCookie(cookie, {
      cookieDomain: '.example.com',
      cookieSecure: true,
      hardenedCookieNames,
    });

    assert.equal(
      result,
      'csrftoken=xyz; Max-Age=3600; Domain=.example.com; Path=/foo; SameSite=None; Secure',
    );
  });
});

describe('gateway integration', () => {
  it('returns JSON error for unauthenticated route advice when upstream is unavailable', async () => {
    const previousEnv: Record<string, string | undefined> = {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET,
      SERVICE_JWT_ISSUER: process.env.SERVICE_JWT_ISSUER,
      SERVICE_JWT_SUBJECT: process.env.SERVICE_JWT_SUBJECT,
      API_PROXY_BASE: process.env.API_PROXY_BASE,
      BACKEND_PROXY_BASE: process.env.BACKEND_PROXY_BASE,
      STATIC_ROOT: process.env.STATIC_ROOT,
    };

    const overrides: Record<string, string> = {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-key-1234567890',
      SERVICE_JWT_ISSUER: 'gateway-test',
      SERVICE_JWT_SUBJECT: 'gateway-service-test',
      API_PROXY_BASE: 'http://127.0.0.1:5999',
      BACKEND_PROXY_BASE: 'http://127.0.0.1:5999',
      STATIC_ROOT: '.',
    };

    Object.entries(overrides).forEach(([key, value]) => {
      process.env[key] = value;
    });

    const cleanup = () => {
      Object.entries(overrides).forEach(([key]) => {
        const original = previousEnv[key];
        if (original === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = original;
        }
      });
    };

    let server: http.Server | null = null;

    try {
      const appModule = await import('./index.js');
      const app = appModule.default;

      server = http.createServer(app);
      const port = await new Promise<number>((resolve, reject) => {
        server?.once('error', reject);
        server?.listen(0, () => {
          server?.off('error', reject);
          const address = server.address() as AddressInfo | null;
          if (!address) {
            reject(new Error('Failed to determine listening address'));
            return;
          }
          resolve(address.port);
        });
      });

      const response = await fetch(`http://127.0.0.1:${port}/api/auth/route-advice`, {
        headers: { accept: 'application/json' },
      });

      assert.ok([502, 504].includes(response.status), `Expected 502 or 504 but received ${response.status}`);
      const contentType = response.headers.get('content-type') ?? '';
      const bodyText = await response.text();

      assert.ok(!contentType.includes('text/html'), `Expected non-HTML response but received ${contentType}`);
      assert.ok(!bodyText.toLowerCase().includes('<!doctype html'), 'Expected response body to avoid login HTML');

      if (contentType.includes('application/json')) {
        const payload = JSON.parse(bodyText);
        assert.deepEqual(payload, { error: 'Bad gateway', code: 'UPSTREAM_UNAVAILABLE' });
      } else {
        assert.ok(bodyText.length > 0, 'Expected upstream error response to have a body');
      }
    } finally {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server?.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      }
      cleanup();
    }
  });
});
