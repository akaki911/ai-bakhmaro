
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configuration
const TESTS = [
  "test_system_integration.js",
  "smoke-test-post-cutover.js",
  "test_activity_full_system.js"
];

const ALWAYS_SKIPPED = [
  "test_ai_scenarios.js",
  "test_github_integration.js",
  "test_gurulo_phoenix.js"
];

const SKIP_REASONS = {
  "test_ai_scenarios.js": "Interactive AI scenario runner that expects a browser context and live AI responses.",
  "test_github_integration.js": "Targets production GitHub proxy endpoints and requires GitHub credentials.",
  "test_gurulo_phoenix.js": "Depends on Phoenix event stream running in production."
};

const REQUIRED_ENDPOINTS = {
  "test_system_integration.js": ["http://127.0.0.1:5002/api/health", "http://127.0.0.1:5001/health"],
  "smoke-test-post-cutover.js": ["http://127.0.0.1:5002/api/health", "http://127.0.0.1:5001/health", "http://127.0.0.1:5000/"],
  "test_activity_full_system.js": ["http://127.0.0.1:5002/api/health"]
};

// State
let ran = 0;
let skipped = 0;
let failed = 0;

// Helper functions
const log = (msg) => console.log(msg);
const logNotice = (msg) => console.log(`::notice::${msg}`);
const logError = (msg) => console.error(`::error::${msg}`);
const logWarning = (msg) => console.warn(`::warning::${msg}`);

function checkEndpoint(url) {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 5000 }, (res) => {
      res.resume(); // Consume response data to free up memory
      resolve(true);
    });

    request.on('error', () => resolve(false));
    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function checkEndpoints(urls) {
  const unavailable = [];
  for (const url of urls) {
    if (!(await checkEndpoint(url))) {
      unavailable.push(url);
    }
  }
  return unavailable;
}

function runTest(testFile) {
    const testPath = path.join(process.cwd(), testFile);
    if (!fs.existsSync(testPath)) {
        logNotice(`Skipping ${testFile}: Test file not found.`);
        skipped++;
        return Promise.resolve();
    }

  return new Promise((resolve) => {
    log("==============================");
    log(`🧪 Running integration test: ${testFile}`);
    log("==============================");

    const nodeProcess = spawn('node', [testPath], { stdio: 'inherit' });

    nodeProcess.on('close', (code) => {
      if (code === 0) {
        ran++;
      } else {
        failed++;
        logError(`Integration test ${testFile} failed`);
      }
      log('\n');
      setTimeout(resolve, 1000); // Simulating sleep 1
    });

    nodeProcess.on('error', (err) => {
      failed++;
      logError(`Failed to start test: ${testFile}. Error: ${err.message}`);
      setTimeout(resolve, 1000);
    });
  });
}

// Main logic
async function main() {
  let testsToRun = [...TESTS];

  if (process.env.INTEGRATION_INCLUDE_EXPERIMENTAL === "1") {
    logWarning("Experimental integration tests enabled via INTEGRATION_INCLUDE_EXPERIMENTAL=1");
    testsToRun.push(...ALWAYS_SKIPPED);
  } else {
    for (const test of ALWAYS_SKIPPED) {
      logNotice(`Skipping ${test}: ${SKIP_REASONS[test]}`);
      skipped++;
    }
  }

  for (const testFile of testsToRun) {
    const requiredUrls = REQUIRED_ENDPOINTS[testFile] || [];
    if (requiredUrls.length > 0) {
      const unavailable = await checkEndpoints(requiredUrls);
      if (unavailable.length > 0) {
        logNotice(`Skipping ${testFile}: Required services are unavailable (${unavailable.join(', ')}).`);
        skipped++;
        continue;
      }
    }
    await runTest(testFile);
  }

  if (ran === 0 && failed === 0) {
    logNotice('No integration tests were executed. Start the local stack to enable them.');
  }

  if (failed > 0) {
    logError(`${failed} integration test(s) failed`);
    process.exit(1);
  }

  log(`✅ Integration test runner finished (executed: ${ran}, skipped: ${skipped}, failed: ${failed})`);
}

main();
