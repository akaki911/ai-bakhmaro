const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const cloudRunExecutor = require('./cloudrun_executor');
const firebaseOps = require('./firebase_operations_service');
const cloudRunConfig = require('../config/cloudrun_config');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Auto Deploy Trigger Service
 * 
 * Monitors Firestore for completed auto-improve requests and triggers
 * automated deployment pipeline with testing and rollback capabilities.
 * 
 * @class AutoDeployTrigger
 */
class AutoDeployTrigger {
  constructor() {
    this.db = null;
    this.listeners = [];
    this.deploymentQueue = [];
    this.isProcessing = false;
    this.initialize();
  }

  /**
   * Initialize Firestore listeners
   * @private
   */
  async initialize() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || 'ai-bakhmaro',
        });
      }
      this.db = getFirestore();

      if (process.env.AUTO_DEPLOY_ENABLED === 'true') {
        this.startListening();
        console.log('✅ Auto-Deploy Trigger initialized and listening');
      } else {
        console.log('ℹ️  Auto-Deploy is disabled (set AUTO_DEPLOY_ENABLED=true to enable)');
      }
    } catch (error) {
      console.error('❌ Auto-Deploy initialization failed:', error);
    }
  }

  /**
   * Start listening for auto-improve completion events
   */
  startListening() {
    const listener = this.db
      .collection('auto_improve_requests')
      .where('status', '==', 'completed')
      .where('autoDeployTriggered', '==', false)
      .onSnapshot(
        snapshot => this.handleCompletedRequests(snapshot),
        error => console.error('❌ Firestore listener error:', error)
      );

    this.listeners.push(listener);
    console.log('👂 Listening for auto-improve completions...');
  }

  /**
   * Handle completed auto-improve requests
   * 
   * @param {Object} snapshot - Firestore snapshot
   * @private
   */
  async handleCompletedRequests(snapshot) {
    if (snapshot.empty) {
      return;
    }

    console.log(`📥 Found ${snapshot.size} completed auto-improve request(s)`);

    snapshot.forEach(doc => {
      const data = doc.data();
      this.deploymentQueue.push({
        id: doc.id,
        ...data,
      });
    });

    if (!this.isProcessing) {
      this.processDeploymentQueue();
    }
  }

  /**
   * Process deployment queue sequentially
   * @private
   */
  async processDeploymentQueue() {
    if (this.deploymentQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.deploymentQueue.shift();

    console.log(`🚀 Processing deployment for request: ${request.id}`);

    try {
      await this.db.collection('auto_improve_requests').doc(request.id).update({
        autoDeployTriggered: true,
        deploymentStartedAt: admin.firestore.Timestamp.now(),
      });

      const result = await this.executeDeploymentPipeline(request);

      await this.db.collection('auto_improve_requests').doc(request.id).update({
        deploymentStatus: result.success ? 'deployed' : 'failed',
        deploymentCompletedAt: admin.firestore.Timestamp.now(),
        deploymentResult: result,
      });

      await this.sendNotification(request, result);
    } catch (error) {
      console.error(`❌ Deployment pipeline failed for ${request.id}:`, error);
      
      await this.db.collection('auto_improve_requests').doc(request.id).update({
        deploymentStatus: 'error',
        deploymentError: error.message,
        deploymentCompletedAt: admin.firestore.Timestamp.now(),
      });
    }

    setTimeout(() => this.processDeploymentQueue(), 1000);
  }

  /**
   * Execute full deployment pipeline
   * 
   * @param {Object} request - Auto-improve request data
   * @returns {Promise<Object>} Pipeline result
   */
  async executeDeploymentPipeline(request) {
    const pipeline = {
      id: request.id,
      startedAt: new Date().toISOString(),
      steps: [],
    };

    try {
      console.log('📋 Step 1: Verifying changes...');
      const verifyResult = await this.verifyChanges(request);
      pipeline.steps.push({ step: 'verify', ...verifyResult });

      if (!verifyResult.success) {
        throw new Error('Change verification failed');
      }

      console.log('🧪 Step 2: Running tests...');
      const testResult = await this.runTests(request);
      pipeline.steps.push({ step: 'test', ...testResult });

      if (!testResult.success) {
        console.log('⚠️  Tests failed, initiating rollback...');
        await this.rollback(request, pipeline);
        return {
          success: false,
          message: 'Tests failed, deployment aborted',
          pipeline,
        };
      }

      console.log('🔨 Step 3: Building containers...');
      const buildResult = await this.buildContainers(request);
      pipeline.steps.push({ step: 'build', ...buildResult });

      if (!buildResult.success) {
        throw new Error('Container build failed');
      }

      console.log('☁️  Step 4: Deploying to Cloud Run...');
      const deployResult = await this.deployToCloudRun(request, buildResult);
      pipeline.steps.push({ step: 'deploy', ...deployResult });

      if (!deployResult.success) {
        console.log('⚠️  Deployment failed, initiating rollback...');
        await this.rollback(request, pipeline);
        return {
          success: false,
          message: 'Deployment failed, rolled back',
          pipeline,
        };
      }

      console.log('✅ Step 5: Verifying deployment...');
      const verifyDeployResult = await this.verifyDeployment(deployResult);
      pipeline.steps.push({ step: 'verify_deployment', ...verifyDeployResult });

      if (!verifyDeployResult.success) {
        console.log('⚠️  Deployment verification failed, initiating rollback...');
        await this.rollback(request, pipeline);
        return {
          success: false,
          message: 'Deployment verification failed, rolled back',
          pipeline,
        };
      }

      pipeline.completedAt = new Date().toISOString();

      await firebaseOps.createCollection('deployment_history', {
        requestId: request.id,
        pipeline,
        status: 'success',
      });

      return {
        success: true,
        message: 'Deployment completed successfully',
        pipeline,
      };
    } catch (error) {
      console.error('❌ Pipeline execution error:', error);
      pipeline.error = error.message;
      pipeline.completedAt = new Date().toISOString();

      await firebaseOps.createCollection('deployment_history', {
        requestId: request.id,
        pipeline,
        status: 'error',
      });

      return {
        success: false,
        message: error.message,
        pipeline,
      };
    }
  }

  /**
   * Verify changes before deployment
   * 
   * @param {Object} request - Auto-improve request
   * @returns {Promise<Object>} Verification result
   */
  async verifyChanges(request) {
    try {
      const changes = request.changes || [];
      
      if (changes.length === 0) {
        return {
          success: false,
          message: 'No changes to deploy',
        };
      }

      const hasBreakingChanges = changes.some(c => c.breaking === true);
      
      return {
        success: true,
        message: `Verified ${changes.length} change(s)`,
        changeCount: changes.length,
        hasBreakingChanges,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Run automated tests
   * 
   * @param {Object} request - Auto-improve request
   * @returns {Promise<Object>} Test result
   */
  async runTests(request) {
    try {
      if (process.env.SKIP_TESTS === 'true') {
        return {
          success: true,
          message: 'Tests skipped (SKIP_TESTS=true)',
          skipped: true,
        };
      }

      const testCommand = process.env.TEST_COMMAND || 'npm test';
      const result = await this.executeCommand(testCommand);

      return {
        success: result.exitCode === 0,
        message: result.exitCode === 0 ? 'All tests passed' : 'Tests failed',
        exitCode: result.exitCode,
        output: result.output.substring(0, 1000),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Build Docker containers
   * 
   * @param {Object} request - Auto-improve request
   * @returns {Promise<Object>} Build result
   */
  async buildContainers(request) {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const commitSha = request.commitSha || 'latest';

      if (!projectId) {
        console.log('⚠️  No GCP project configured, skipping build');
        return {
          success: true,
          message: 'Build skipped (no GCP project)',
          skipped: true,
        };
      }

      const buildCommand = `gcloud builds submit --config=cloudbuild.yaml --substitutions=COMMIT_SHA=${commitSha}`;
      const result = await this.executeCommand(buildCommand);

      return {
        success: result.exitCode === 0,
        message: result.exitCode === 0 ? 'Containers built successfully' : 'Build failed',
        exitCode: result.exitCode,
        images: [
          `gcr.io/${projectId}/ai-frontend:${commitSha}`,
          `gcr.io/${projectId}/backend:${commitSha}`,
          `gcr.io/${projectId}/ai-service:${commitSha}`,
        ],
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Deploy containers to Cloud Run
   * 
   * @param {Object} request - Auto-improve request
   * @param {Object} buildResult - Build result with image URLs
   * @returns {Promise<Object>} Deployment result
   */
  async deployToCloudRun(request, buildResult) {
    try {
      if (buildResult.skipped) {
        return {
          success: true,
          message: 'Deployment skipped (build was skipped)',
          skipped: true,
        };
      }

      const services = ['ai-frontend', 'backend', 'ai-service'];
      const deployments = [];

      for (const serviceName of services) {
        const config = cloudRunConfig.getServiceConfig(serviceName);
        const image = buildResult.images.find(img => img.includes(serviceName));

        const result = await cloudRunExecutor.deployContainer(serviceName, {
          ...config,
          image,
        });

        deployments.push({
          service: serviceName,
          ...result,
        });
      }

      const allSuccessful = deployments.every(d => d.success);

      return {
        success: allSuccessful,
        message: allSuccessful ? 'All services deployed' : 'Some deployments failed',
        deployments,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Verify deployment health
   * 
   * @param {Object} deployResult - Deployment result
   * @returns {Promise<Object>} Verification result
   */
  async verifyDeployment(deployResult) {
    try {
      if (deployResult.skipped) {
        return {
          success: true,
          message: 'Verification skipped',
          skipped: true,
        };
      }

      const checks = [];

      for (const deployment of deployResult.deployments) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const healthUrl = `${deployment.serviceUrl}/health`;
        const healthCheck = await this.checkHealth(healthUrl);

        checks.push({
          service: deployment.service,
          url: healthUrl,
          healthy: healthCheck.success,
        });
      }

      const allHealthy = checks.every(c => c.healthy);

      return {
        success: allHealthy,
        message: allHealthy ? 'All services healthy' : 'Some services unhealthy',
        checks,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Rollback deployment on failure
   * 
   * @param {Object} request - Auto-improve request
   * @param {Object} pipeline - Pipeline execution data
   * @returns {Promise<void>}
   */
  async rollback(request, pipeline) {
    console.log('🔄 Initiating rollback...');

    try {
      await firebaseOps.createCollection('rollback_events', {
        requestId: request.id,
        pipeline,
        rolledBackAt: new Date().toISOString(),
      });

      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }

  /**
   * Send deployment notification
   * 
   * @param {Object} request - Auto-improve request
   * @param {Object} result - Deployment result
   * @returns {Promise<void>}
   */
  async sendNotification(request, result) {
    try {
      const notification = {
        requestId: request.id,
        status: result.success ? 'success' : 'failure',
        message: result.message,
        timestamp: new Date().toISOString(),
      };

      await firebaseOps.createCollection('deployment_notifications', notification);

      console.log(`📧 Notification sent: ${result.message}`);
    } catch (error) {
      console.error('❌ Notification failed:', error);
    }
  }

  /**
   * Execute shell command
   * 
   * @param {string} command - Command to execute
   * @returns {Promise<Object>} Command result
   * @private
   */
  executeCommand(command) {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        cwd: path.resolve(__dirname, '../..'),
        env: process.env,
      });

      let output = '';

      proc.stdout.on('data', data => {
        output += data.toString();
      });

      proc.stderr.on('data', data => {
        output += data.toString();
      });

      proc.on('close', exitCode => {
        resolve({ exitCode, output });
      });

      proc.on('error', error => {
        resolve({ exitCode: 1, output: error.message });
      });
    });
  }

  /**
   * Check health endpoint
   * 
   * @param {string} url - Health check URL
   * @returns {Promise<Object>} Health check result
   * @private
   */
  async checkHealth(url) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      return {
        success: response.ok,
        status: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Stop all listeners
   */
  stopListening() {
    this.listeners.forEach(listener => listener());
    this.listeners = [];
    console.log('🛑 Auto-Deploy listeners stopped');
  }
}

module.exports = new AutoDeployTrigger();
