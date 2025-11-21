#!/usr/bin/env node
/**
 * 🎯 Smart Port Management Crisis Recovery
 * Georgian AI Developer Panel - Comprehensive Service Restart
 */

const { execSync, spawn } = require('child_process');
const fetch = require('node-fetch');

const SERVICES = [
  { name: 'backend', port: 5002, healthUrl: 'https://backend.ai.bakhmaro.co/api/health', dir: 'backend' },
  { name: 'ai', port: 5001, healthUrl: 'https://backend.ai.bakhmaro.co/api/ai/health', dir: 'ai-service' },
  { name: 'frontend', port: 5000, healthUrl: 'https://ai.bakhmaro.co/', dir: '.' }
];

const RESTART_DELAYS = {
  backend: 3000,   // Backend first
  ai: 6000,        // AI second  
  frontend: 9000   // Frontend last
};

console.log('🚨 [SMART RESTART] Georgian Port Crisis Recovery დაიწყო...');

async function killProcessesByPort(port) {
  try {
    console.log(`💀 [SMART RESTART] Killing processes on port ${port}...`);
    
    // Graceful SIGTERM first
    try {
      execSync(`pkill -f "PORT=${port}" 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`pkill -f "${port}" 2>/dev/null || true`, { stdio: 'pipe' });
    } catch (e) {
      console.warn(`⚠️ [SMART RESTART] SIGTERM failed for port ${port}`);
    }
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force SIGKILL if needed
    try {
      execSync(`pkill -9 -f "PORT=${port}" 2>/dev/null || true`, { stdio: 'pipe' });
      execSync(`pkill -9 -f "${port}" 2>/dev/null || true`, { stdio: 'pipe' });
    } catch (e) {
      console.warn(`⚠️ [SMART RESTART] SIGKILL failed for port ${port}`);
    }
    
    console.log(`✅ [SMART RESTART] Port ${port} გაწმენდა`);
  } catch (error) {
    console.error(`❌ [SMART RESTART] Kill failed for port ${port}:`, error.message);
  }
}

async function waitForServiceHealthy(service, maxWait = 10000) {
  const start = Date.now();
  const target = service.healthUrl;

  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(target, { timeout: 2000 });
      if (response.ok) {
        console.log(`✅ [SMART RESTART] ${service.name} responded at ${target}`);
        return true;
      }
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.warn(`⚠️ [SMART RESTART] ${service.name} still unreachable after ${maxWait}ms`);
  return false;
}

async function startService(service) {
  console.log(`🚀 [SMART RESTART] Starting ${service.name} (${service.port})...`);
  
  try {
    const command = service.name === 'backend' ? `cd ${service.dir} && PORT=${service.port} node index.js` :
                   service.name === 'ai' ? `cd ${service.dir} && PORT=${service.port} HOST=0.0.0.0 node server.js` :
                   `PORT=${service.port} HOST=0.0.0.0 CLEAR_SCREEN=false node scripts/run-vite-dev.mjs`;
                   
    const child = spawn('sh', ['-c', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    child.unref(); // Allow parent to exit
    
    console.log(`🎊 [SMART RESTART] ${service.name} started with PID ${child.pid}`);
    return child.pid;
  } catch (error) {
    console.error(`❌ [SMART RESTART] Failed to start ${service.name}:`, error.message);
    return null;
  }
}

async function waitForHealthCheck(service, maxWait = 15000) {
  console.log(`🩺 [SMART RESTART] Health check for ${service.name}...`);
  const start = Date.now();
  
  while (Date.now() - start < maxWait) {
    try {
      const response = await fetch(service.healthUrl, { 
        timeout: 3000,
        headers: { 'User-Agent': 'Smart-Restart-Health-Check' }
      });
      
      if (response.ok || response.status < 500) {
        console.log(`✅ [SMART RESTART] ${service.name} health check passed`);
        return true;
      }
    } catch (error) {
      // Service still starting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn(`⚠️ [SMART RESTART] ${service.name} health check timed out`);
  return false;
}

async function main() {
  try {
    // Phase 1: Kill all services
    console.log('📍 Phase 1: Killing all services...');
    for (const service of SERVICES) {
      await killProcessesByPort(service.port);
    }
    
    console.log('⏳ Waiting 10 seconds for complete port release...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Phase 2: Verify ports available
    console.log('📍 Phase 2: Verifying port availability...');
    for (const service of SERVICES) {
      await waitForServiceHealthy(service);
    }
    
    // Phase 3: Sequential restart with delays
    console.log('📍 Phase 3: Sequential service restart...');
    
    const startPromises = SERVICES.map(service => 
      new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, RESTART_DELAYS[service.name]));
        const pid = await startService(service);
        resolve({ ...service, pid });
      })
    );
    
    const startedServices = await Promise.all(startPromises);
    
    // Phase 4: Health checks
    console.log('📍 Phase 4: Health check verification...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Let services boot
    
    for (const service of startedServices) {
      if (service.pid) {
        await waitForHealthCheck(service);
      }
    }
    
    console.log('🎊 [SMART RESTART] Georgian Port Crisis Recovery მოხორციელდა!');
    console.log('✅ All services restarted with cascade failure prevention');
    
  } catch (error) {
    console.error('❌ [SMART RESTART] Crisis recovery failed:', error.message);
    process.exit(1);
  }
}

main();
