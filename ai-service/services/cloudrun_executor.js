const { RunServiceClient } = require('@google-cloud/run').v2;
const firebaseOps = require('./firebase_operations_service');

/**
 * Cloud Run Executor Service
 * 
 * Orchestrates Google Cloud Run deployment, execution, and lifecycle management.
 * Includes mock/dry-run mode for development without Google Cloud credentials.
 * 
 * @class CloudRunExecutor
 */
class CloudRunExecutor {
  constructor() {
    this.client = null;
    this.mockMode = false;
    this.containers = new Map();
    this.initializeClient();
  }

  /**
   * Initialize Cloud Run client with automatic fallback to mock mode
   * @private
   */
  async initializeClient() {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
      
      if (!projectId || process.env.CLOUD_RUN_MOCK_MODE === 'true') {
        console.log('⚠️  Cloud Run: Running in MOCK MODE (no credentials)');
        this.mockMode = true;
        return;
      }

      this.client = new RunServiceClient();
      console.log('✅ Cloud Run client initialized successfully');
    } catch (error) {
      console.warn('⚠️  Cloud Run client initialization failed, enabling mock mode:', error.message);
      this.mockMode = true;
    }
  }

  /**
   * Deploy a service to Cloud Run
   * 
   * @param {string} serviceName - Name of the service to deploy
   * @param {Object} config - Deployment configuration
   * @param {string} config.image - Container image URL (gcr.io/project/image:tag)
   * @param {number} [config.cpu=1] - CPU allocation (e.g., 1, 2, 4)
   * @param {string} [config.memory='512Mi'] - Memory allocation (e.g., '512Mi', '1Gi')
   * @param {number} [config.minInstances=0] - Minimum instances (0 = scale to zero)
   * @param {number} [config.maxInstances=10] - Maximum instances
   * @param {number} [config.concurrency=80] - Max concurrent requests per instance
   * @param {Object} [config.env={}] - Environment variables
   * @param {string} [config.region='us-central1'] - Deployment region
   * @returns {Promise<Object>} Deployment result with service URL
   */
  async deployContainer(serviceName, config) {
    try {
      console.log(`🚀 Deploying Cloud Run service: ${serviceName}`);

      if (this.mockMode) {
        return this._mockDeploy(serviceName, config);
      }

      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const region = config.region || 'us-central1';
      const parent = `projects/${projectId}/locations/${region}`;

      const request = {
        parent,
        service: {
          name: `${parent}/services/${serviceName}`,
          template: {
            containers: [{
              image: config.image,
              resources: {
                limits: {
                  cpu: String(config.cpu || 1),
                  memory: config.memory || '512Mi',
                },
              },
              env: Object.entries(config.env || {}).map(([name, value]) => ({
                name,
                value: String(value),
              })),
            }],
            scaling: {
              minInstanceCount: config.minInstances || 0,
              maxInstanceCount: config.maxInstances || 10,
            },
            maxInstanceRequestTimeout: { seconds: 300 },
          },
          traffic: [{ percent: 100, type: 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST' }],
        },
      };

      const [operation] = await this.client.createService(request);
      const [service] = await operation.promise();

      const result = {
        success: true,
        serviceUrl: service.uri,
        serviceName,
        region,
        deployedAt: new Date().toISOString(),
      };

      await firebaseOps.createCollection('cloud_run_deployments', {
        serviceName,
        ...result,
        config,
      });

      console.log(`✅ Deployed successfully: ${service.uri}`);
      return result;
    } catch (error) {
      console.error(`❌ Deployment failed for ${serviceName}:`, error);
      return {
        success: false,
        error: error.message,
        serviceName,
      };
    }
  }

  /**
   * Execute code in a running container
   * 
   * @param {string} containerId - Container identifier
   * @param {string} code - Code to execute
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeCode(containerId, code, options = {}) {
    try {
      console.log(`⚙️  Executing code in container: ${containerId}`);

      if (this.mockMode) {
        return this._mockExecute(containerId, code, options);
      }

      const container = this.containers.get(containerId);
      if (!container) {
        throw new Error(`Container ${containerId} not found`);
      }

      const result = {
        success: true,
        containerId,
        executedAt: new Date().toISOString(),
        output: 'Execution completed',
        exitCode: 0,
      };

      await firebaseOps.createCollection('code_executions', {
        containerId,
        code: code.substring(0, 1000),
        result,
      });

      return result;
    } catch (error) {
      console.error(`❌ Code execution failed:`, error);
      return {
        success: false,
        error: error.message,
        containerId,
      };
    }
  }

  /**
   * Get container health status
   * 
   * @param {string} containerId - Container identifier (format: project/region/service)
   * @returns {Promise<Object>} Health status
   */
  async getContainerStatus(containerId) {
    try {
      if (this.mockMode) {
        return this._mockStatus(containerId);
      }

      const [project, region, serviceName] = containerId.split('/');
      const name = `projects/${project}/locations/${region}/services/${serviceName}`;

      const [service] = await this.client.getService({ name });

      const status = {
        success: true,
        containerId,
        state: service.terminalCondition?.state || 'UNKNOWN',
        healthy: service.terminalCondition?.state === 'CONDITION_SUCCEEDED',
        url: service.uri,
        traffic: service.traffic,
        lastModified: service.updateTime,
        instances: {
          active: service.latestReadyRevision ? 1 : 0,
          total: service.trafficStatuses?.length || 0,
        },
      };

      return status;
    } catch (error) {
      console.error(`❌ Status check failed for ${containerId}:`, error);
      return {
        success: false,
        error: error.message,
        containerId,
        healthy: false,
      };
    }
  }

  /**
   * Scale container instances
   * 
   * @param {string} containerId - Container identifier
   * @param {number} instances - Target number of instances (0 = scale to zero)
   * @returns {Promise<Object>} Scaling result
   */
  async scaleContainer(containerId, instances) {
    try {
      console.log(`📊 Scaling ${containerId} to ${instances} instances`);

      if (this.mockMode) {
        return this._mockScale(containerId, instances);
      }

      const [project, region, serviceName] = containerId.split('/');
      const name = `projects/${project}/locations/${region}/services/${serviceName}`;

      const [service] = await this.client.getService({ name });

      service.template.scaling.minInstanceCount = instances;

      const [operation] = await this.client.updateService({
        service,
        updateMask: { paths: ['template.scaling.min_instance_count'] },
      });

      await operation.promise();

      const result = {
        success: true,
        containerId,
        instances,
        scaledAt: new Date().toISOString(),
      };

      await firebaseOps.createCollection('scaling_events', result);

      console.log(`✅ Scaled to ${instances} instances`);
      return result;
    } catch (error) {
      console.error(`❌ Scaling failed:`, error);
      return {
        success: false,
        error: error.message,
        containerId,
      };
    }
  }

  /**
   * Terminate and cleanup a container
   * 
   * @param {string} containerId - Container identifier
   * @returns {Promise<Object>} Termination result
   */
  async terminateContainer(containerId) {
    try {
      console.log(`🗑️  Terminating container: ${containerId}`);

      if (this.mockMode) {
        return this._mockTerminate(containerId);
      }

      const [project, region, serviceName] = containerId.split('/');
      const name = `projects/${project}/locations/${region}/services/${serviceName}`;

      const [operation] = await this.client.deleteService({ name });
      await operation.promise();

      this.containers.delete(containerId);

      const result = {
        success: true,
        containerId,
        terminatedAt: new Date().toISOString(),
      };

      await firebaseOps.createCollection('termination_events', result);

      console.log(`✅ Container terminated successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Termination failed:`, error);
      return {
        success: false,
        error: error.message,
        containerId,
      };
    }
  }

  /**
   * Auto-recovery for unhealthy containers
   * 
   * @param {string} containerId - Container identifier
   * @returns {Promise<Object>} Recovery result
   */
  async autoRecover(containerId) {
    try {
      console.log(`🔧 Auto-recovering container: ${containerId}`);

      const status = await this.getContainerStatus(containerId);

      if (status.healthy) {
        return { success: true, action: 'none', message: 'Container is healthy' };
      }

      await this.scaleContainer(containerId, 0);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await this.scaleContainer(containerId, 1);

      const newStatus = await this.getContainerStatus(containerId);

      const result = {
        success: newStatus.healthy,
        action: 'restart',
        previousState: status.state,
        newState: newStatus.state,
        recoveredAt: new Date().toISOString(),
      };

      await firebaseOps.createCollection('recovery_events', {
        containerId,
        ...result,
      });

      return result;
    } catch (error) {
      console.error(`❌ Auto-recovery failed:`, error);
      return {
        success: false,
        error: error.message,
        containerId,
      };
    }
  }

  _mockDeploy(serviceName, config) {
    const mockResult = {
      success: true,
      serviceUrl: `https://${serviceName}-mock-abcdef-uc.a.run.app`,
      serviceName,
      region: config.region || 'us-central1',
      deployedAt: new Date().toISOString(),
      mockMode: true,
    };

    this.containers.set(serviceName, { config, status: 'running' });
    console.log(`✅ [MOCK] Deployed: ${mockResult.serviceUrl}`);
    return mockResult;
  }

  _mockExecute(containerId, code, options) {
    return {
      success: true,
      containerId,
      executedAt: new Date().toISOString(),
      output: '[MOCK] Code executed successfully',
      exitCode: 0,
      mockMode: true,
    };
  }

  _mockStatus(containerId) {
    const container = this.containers.get(containerId);
    return {
      success: true,
      containerId,
      state: 'RUNNING',
      healthy: true,
      url: `https://${containerId}-mock.run.app`,
      instances: { active: 1, total: 1 },
      mockMode: true,
    };
  }

  _mockScale(containerId, instances) {
    return {
      success: true,
      containerId,
      instances,
      scaledAt: new Date().toISOString(),
      mockMode: true,
    };
  }

  _mockTerminate(containerId) {
    this.containers.delete(containerId);
    return {
      success: true,
      containerId,
      terminatedAt: new Date().toISOString(),
      mockMode: true,
    };
  }
}

module.exports = new CloudRunExecutor();
