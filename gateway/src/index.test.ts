import assert from 'node:assert/strict';
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
