
#!/bin/bash

echo "🧪 Backend JSON-Only Verification"
echo "=================================="

# Test root endpoint
echo ""
echo "✓ Testing GET /"
curl -s https://backend.ai.bakhmaro.co/ | jq .

# Test health endpoint
echo ""
echo "✓ Testing GET /api/auth/health"
curl -s https://backend.ai.bakhmaro.co/api/auth/health | jq .

# Test 404 handling
echo ""
echo "✓ Testing 404 (should return JSON)"
curl -s https://backend.ai.bakhmaro.co/non-existent-route | jq .

echo ""
echo "=================================="
echo "✅ Verification complete"
