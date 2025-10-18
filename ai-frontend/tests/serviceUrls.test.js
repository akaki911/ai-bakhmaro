import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServiceOrigin } from '../src/features/devconsole-v2/utils/serviceUrls.js';

const originalWindow = globalThis.window;

const restoreWindow = () => {
  if (originalWindow === undefined) {
    delete globalThis.window;
    return;
  }
  globalThis.window = originalWindow;
};

test('uses the current window origin when available', () => {
  globalThis.window = {
    location: {
      origin: 'https://console.example.dev:4444',
    },
  };

  assert.equal(buildServiceOrigin(5001), 'https://console.example.dev:5001');
  restoreWindow();
});

test('omits default HTTPS port when targeting 443', () => {
  globalThis.window = {
    location: {
      origin: 'https://console.example.dev',
    },
  };

  assert.equal(buildServiceOrigin(443), 'https://console.example.dev');
  restoreWindow();
});

test('falls back to the default host when window is unavailable', () => {
  delete globalThis.window;

  assert.equal(buildServiceOrigin(5002), 'http://localhost:5002');
  restoreWindow();
});
