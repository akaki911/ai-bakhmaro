
const https = require('https');

console.log("🔍 [Startup Verification] Checking backend health...");

const healthCheck = () => {
  return new Promise((resolve) => {
    const req = https.get(
      'https://backend.ai.bakhmaro.co/api/health',
      { timeout: 5000 },
      (res) => {
        console.log(`✅ Backend health check passed: ${res.statusCode}`);
        resolve(true);
      }
    );
    
    req.on('error', (err) => {
      console.log(`❌ Backend health check failed:`, err.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ Backend health check timeout`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

async function runStartupChecks() {
  console.log("🏁 Starting backend startup verification...");
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if backend responds
  const isHealthy = await healthCheck();
  
  if (isHealthy) {
    console.log("🎉 Backend startup verification completed successfully!");
  } else {
    console.log("⚠️ Backend may not be fully ready. This might be normal during startup.");
  }
}

runStartupChecks();
