#!/bin/bash
set -euo pipefail

# This script coordinates integration tests that depend on the full service stack.
# When the dependent services are not available (for example on CI without docker-compose),
# the tests are skipped with a clear notice so developers know how to enable them locally.

if ! command -v curl >/dev/null 2>&1; then
  echo "::error::Integration tests require 'curl' to probe service availability."
  exit 1
fi

TESTS=(
  "test_system_integration.js"
  "smoke-test-post-cutover.js"
  "test_activity_full_system.js"
)

# Map of required health endpoints per test file. If any endpoint is unreachable the
# corresponding test will be skipped. Developers can start the stack with
#   ./scripts/reliable-service-start.sh
# or an equivalent docker-compose setup to make the endpoints available.
declare -A REQUIRED_ENDPOINTS=(
  ["test_system_integration.js"]="http://127.0.0.1:5002/api/health http://127.0.0.1:5001/health"
  ["smoke-test-post-cutover.js"]="http://127.0.0.1:5002/api/health http://127.0.0.1:5001/health http://127.0.0.1:5000/"
  ["test_activity_full_system.js"]="http://127.0.0.1:5002/api/health"
)

# Tests that require production services or external credentials are skipped by default.
ALWAYS_SKIPPED=(
  "test_ai_scenarios.js"
  "test_github_integration.js"
  "test_gurulo_phoenix.js"
)

declare -A SKIP_REASONS=(
  ["test_ai_scenarios.js"]="Interactive AI scenario runner that expects a browser context and live AI responses."
  ["test_github_integration.js"]="Targets production GitHub proxy endpoints and requires GitHub credentials."
  ["test_gurulo_phoenix.js"]="Depends on Phoenix event stream running in production."
)

ran=0
skipped=0
failed=0

skip_test() {
  local test_file="$1"
  local reason="$2"
  skipped=$((skipped + 1))
  echo "::notice::Skipping ${test_file}: ${reason}"
}

check_endpoints() {
  local endpoints=($1)
  local unavailable=()
  for url in "${endpoints[@]}"; do
    if ! curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      unavailable+=("$url")
    fi
  done

  if [ ${#unavailable[@]} -gt 0 ]; then
    printf '%s\n' "${unavailable[@]}"
    return 1
  fi

  return 0
}

# Handle tests that we always skip unless explicitly forced
if [ "${INTEGRATION_INCLUDE_EXPERIMENTAL:-0}" != "1" ]; then
  for test in "${ALWAYS_SKIPPED[@]}"; do
    skip_test "$test" "${SKIP_REASONS[$test]}"
  done
else
  echo "::warning::Experimental integration tests enabled via INTEGRATION_INCLUDE_EXPERIMENTAL=1"
  TESTS+=("${ALWAYS_SKIPPED[@]}")
fi

for test_file in "${TESTS[@]}"; do
  if [ ! -f "$test_file" ]; then
    skip_test "$test_file" "Test file not found."
    continue
  fi

  required_urls=${REQUIRED_ENDPOINTS[$test_file]:-}
  if [ -n "$required_urls" ]; then
    if ! missing=$(check_endpoints "$required_urls"); then
      skip_test "$test_file" "Required services are unavailable (${missing//$'\n'/, })."
      continue
    fi
  fi

  echo "=============================="
  echo "🧪 Running integration test: $test_file"
  echo "=============================="
  if node "$test_file"; then
    ran=$((ran + 1))
  else
    failed=$((failed + 1))
    echo "::error::Integration test ${test_file} failed"
  fi
  echo
  sleep 1
done

if [ $ran -eq 0 ]; then
  echo "::notice::No integration tests were executed. Start the local stack with \"./scripts/reliable-service-start.sh\" or an equivalent docker-compose stack to enable them."
fi

if [ $failed -gt 0 ]; then
  echo "::error::${failed} integration test(s) failed"
  exit 1
fi

echo "✅ Integration test runner finished (executed: $ran, skipped: $skipped, failed: $failed)"
