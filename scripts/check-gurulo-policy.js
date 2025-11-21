#!/usr/bin/env node
import process from 'node:process';
import { createServiceToken } from '../shared/serviceToken.js';

const DEFAULT_URL = 'https://backend.ai.bakhmaro.co/v1/ai/chat';
const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.GURULO_POLICY_TIMEOUT_MS ?? '6000', 10);

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, label: 'ai-service' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--url' && index + 1 < argv.length) {
      args.url = argv[index + 1];
      index += 1;
    } else if (value === '--label' && index + 1 < argv.length) {
      args.label = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const { url, label } = parseArgs(process.argv.slice(2));
  const token = createServiceToken({
    svc: 'health-check',
    service: 'health-checker',
    permissions: ['chat'],
  });

  const body = {
    message: 'გურულო, ეს არის პოლიტიკის შემოწმება.',
    personalId: 'gurulo-health-check',
    metadata: {
      source: 'quick-health-check',
      intent: 'policy_probe',
    },
    audience: 'public_front',
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Gurulo-Client': 'gurulo-health-check',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error(`[${label}] HTTP ${response.status}`);
      if (text) {
        console.error(text);
      }
      process.exit(1);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      console.error(`[${label}] Failed to parse JSON response`);
      console.error(error.message);
      process.exit(1);
    }

    const policy = payload?.response?.policy || payload?.policy;
    if (!policy || typeof policy !== 'object') {
      console.error(`[${label}] Policy section missing in response`);
      process.exit(1);
    }

    const warningsValid = Array.isArray(policy.warnings);
    const violationsValid = Array.isArray(policy.violations);
    const permissionsValid = policy.permissions && typeof policy.permissions === 'object';

    if (!warningsValid || !violationsValid || !permissionsValid) {
      console.error(`[${label}] Malformed policy payload`);
      console.error(JSON.stringify(policy, null, 2));
      process.exit(1);
    }

    const summary = `${label} policy check passed (warnings=${policy.warnings.length}, violations=${policy.violations.length})`;
    console.log(summary);
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.error(`[${label}] Request timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    } else {
      console.error(`[${label}] ${error.message}`);
    }
    process.exit(1);
  }
}

await main();
