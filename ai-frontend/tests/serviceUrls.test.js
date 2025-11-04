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

  assert.equal(buildServiceOrigin(5100), 'https://console.example.dev:5100');
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

  assert.equal(buildServiceOrigin(6100), 'https://ai.bakhmaro.co:6100');
  restoreWindow();
});
