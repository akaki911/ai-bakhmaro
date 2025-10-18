import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAllowedOriginsSet, createCorsOriginValidator } from '../dist/cors.js';

const runValidator = (validator, origin) => {
  return new Promise((resolve, reject) => {
    validator(origin, (err, allow) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allow);
    });
  });
};

const expectRejected = (validator, origin) => {
  return new Promise((resolve, reject) => {
    validator(origin, (err) => {
      if (err) {
        resolve(err);
        return;
      }
      reject(new Error('Expected origin to be rejected'));
    });
  });
};

test('gateway CORS validator allows default origin and rejects others', async () => {
  const allowedOrigins = buildAllowedOriginsSet('https://ai.bakhmaro.co');
  const validator = createCorsOriginValidator(allowedOrigins);

  const allowUndefined = await runValidator(validator, undefined);
  assert.equal(allowUndefined, true);

  const allowPrimary = await runValidator(validator, 'https://ai.bakhmaro.co');
  assert.equal(allowPrimary, true);

  const rejection = await expectRejected(validator, 'http://localhost:5173');
  assert.match(rejection.message, /localhost:5173/);
});
