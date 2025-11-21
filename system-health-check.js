const fs = require('node:fs');
const path = require('node:path');
const fetch = require('node-fetch');

const RETRY_ATTEMPTS = Number.parseInt(process.env.SYSTEM_HEALTH_RETRIES ?? '3', 10);
const BACKOFF_MS = Number.parseInt(process.env.SYSTEM_HEALTH_BACKOFF_MS ?? '1500', 10);
const TIMEOUT_MS = Number.parseInt(process.env.SYSTEM_HEALTH_TIMEOUT_MS ?? '5000', 10);
const OUTPUT_PATH = process.env.SYSTEM_HEALTH_OUTPUT ?? path.join(__dirname, 'artifacts', 'system-health-report.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const TARGETS = [
  {
    key: 'backend',
    label: 'Backend',
    url: 'https://backend.ai.bakhmaro.co/api/health',
    expectJson: true,
  },
  {
    key: 'ai-service',
    label: 'AI Service',
    url: 'https://backend.ai.bakhmaro.co/api/ai/health',
    expectJson: true,
  },
  {
    key: 'gateway',
    label: 'Gateway',
    url: 'https://backend.ai.bakhmaro.co/api/health/system-status',
    expectJson: true,
    optional: true,
  },
  {
    key: 'webauthn-debug',
    label: 'WebAuthn Debug',
    url: 'https://backend.ai.bakhmaro.co/api/admin/auth/webauthn/debug',
    expectJson: true,
    optional: true,
  },
  {
    key: 'admin-session',
    label: 'Admin Session',
    url: 'https://backend.ai.bakhmaro.co/api/admin/auth/me',
    options: { headers: { Cookie: '' } },
    expectJson: true,
    interpret: (result) => {
      if (!result.response) {
        return { state: 'ERROR', summary: 'ვერ მოხერხდა კავშირის დამყარება' };
      }

      const status = result.response.status;
      if (status === 200) {
        return { state: 'OK', summary: 'სესია აქტიურია' };
      }

      if (status === 401 || status === 403) {
        return { state: 'WARN', summary: `სესია არააქტიურია (${status})` };
      }

      return { state: 'ERROR', summary: `მოულოდნელი პასუხი (${status})` };
    },
  },
];

const STATE_ICONS = {
  OK: '✅',
  WARN: '⚠️',
  ERROR: '❌',
};

async function probeTarget(target) {
  let lastError;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await withTimeout(target.url, target.options);
      const durationMs = Date.now() - startedAt;

      let payload = null;
      if (target.expectJson) {
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (contentType.includes('application/json')) {
          payload = await response.json();
        }
      }

      return { response, attempt, durationMs, payload };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < RETRY_ATTEMPTS) {
        const waitTime = BACKOFF_MS * attempt;
        await delay(waitTime);
        continue;
      }
    }
  }

  return { response: null, attempt: RETRY_ATTEMPTS, durationMs: null, payload: null, error: lastError };
}

const defaultInterpret = (result) => {
  if (!result.response) {
    return { state: 'ERROR', summary: result.error ? result.error.message : 'მოუწვდომელია' };
  }

  return result.response.ok
    ? { state: 'OK', summary: `HTTP ${result.response.status}` }
    : { state: 'ERROR', summary: `HTTP ${result.response.status}` };
};

const normaliseState = (state) => {
  if (state === 'OK' || state === 'WARN' || state === 'ERROR') {
    return state;
  }
  return 'ERROR';
};

async function checkSystemHealth() {
  console.log('🔧 სისტემის ჯანმრთელობის შემოწმება...\n');

  const results = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const target of TARGETS) {
    const probe = await probeTarget(target);

    const interpretation = target.interpret ? target.interpret(probe) : defaultInterpret(probe);
    const state = normaliseState(interpretation.state);
    const summary = interpretation.summary ?? '';

    const icon = STATE_ICONS[state] ?? '❔';
    const statusText = probe.response ? `HTTP ${probe.response.status}` : 'OFFLINE';
    const durationText = typeof probe.durationMs === 'number' ? `${probe.durationMs}ms` : '—';

    if (state === 'ERROR') {
      console.log(`${icon} ${target.label}: ${summary} (${statusText}, ${durationText}, მცდელობა ${probe.attempt})`);
    } else if (state === 'WARN') {
      console.log(`${icon} ${target.label}: ${summary} (${statusText}, ${durationText}, მცდელობა ${probe.attempt})`);
    } else {
      console.log(`${icon} ${target.label}: ${summary} (${statusText}, ${durationText})`);
    }

    results.push({
      key: target.key,
      label: target.label,
      state,
      summary,
      attempt: probe.attempt,
      status: probe.response?.status ?? null,
      durationMs: probe.durationMs,
      optional: target.optional === true,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    retryAttempts: RETRY_ATTEMPTS,
    backoffMs: BACKOFF_MS,
    timeoutMs: TIMEOUT_MS,
    results,
  };

  try {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n🗂️  სტატუსის არტიფაქტი შენახულია: ${OUTPUT_PATH}`);
  } catch (error) {
    console.warn('\n⚠️ სტატუსის არტიფაქტის შენახვა ვერ მოხერხდა:', error instanceof Error ? error.message : error);
  }

  console.log('\n🏁 შემოწმება დასრულდა');
}

checkSystemHealth().catch((error) => {
  console.error('❌ ჯანმრთელობის შემოწმება ჩავარდა:', error);
  process.exitCode = 1;
});
