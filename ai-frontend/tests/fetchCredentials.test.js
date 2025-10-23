import test from 'node:test';
import assert from 'node:assert/strict';
import { setupGlobalFetch } from './setupFetch.js';

const createFakeWindow = () => {
  const calls = [];
  const fakeWindow = {
    location: {
      origin: 'https://app.example.com',
    },
    fetch: (input, init) => {
      calls.push({ input, init });
      return Promise.resolve();
    },
  };

  return { fakeWindow, calls };
};

test('securetoken requests clone Request objects with credentials omitted', async () => {
  const { fakeWindow, calls } = createFakeWindow();
  setupGlobalFetch(fakeWindow);

  const request = new Request('https://securetoken.googleapis.com/v1/token', {
    credentials: 'include',
  });

  await fakeWindow.fetch(request);

  assert.equal(calls.length, 1, 'browser fetch should be called once');
  const [{ input, init }] = calls;

  assert.ok(input instanceof Request, 'fetch should receive a Request object');
  assert.equal(input.credentials, 'omit', 'cloned Request must omit credentials');
  assert.equal(init.credentials, 'omit', 'init credentials must be set to omit');
});

test('other googleapis hosts also omit credentials', async () => {
  const { fakeWindow, calls } = createFakeWindow();
  setupGlobalFetch(fakeWindow);

  const request = new Request('https://firestore.googleapis.com/v1/projects', {
    credentials: 'include',
  });

  await fakeWindow.fetch(request);

  assert.equal(calls.length, 1);
  const [{ input, init }] = calls;

  assert.equal(input.credentials, 'omit');
  assert.equal(init.credentials, 'omit');
});
