/**
 * Cloud Run Service Configuration
 * 
 * Defines resource allocation, scaling, and runtime settings for Cloud Run services.
 * Use environment variables to override defaults in production.
 */

/**
 * Service configurations for different components
 * @type {Object}
 */
const serviceConfigs = {
  'ai-frontend': {
    cpu: parseInt(process.env.FRONTEND_CPU) || 1,
    memory: process.env.FRONTEND_MEMORY || '512Mi',
    minInstances: parseInt(process.env.FRONTEND_MIN_INSTANCES) || 0,
    maxInstances: parseInt(process.env.FRONTEND_MAX_INSTANCES) || 10,
    concurrency: parseInt(process.env.FRONTEND_CONCURRENCY) || 80,
    timeout: 60,
    port: 80,
    allowUnauthenticated: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      VITE_ENV_MODE: 'production',
    },
  },

  'backend': {
    cpu: parseInt(process.env.BACKEND_CPU) || 2,
    memory: process.env.BACKEND_MEMORY || '1Gi',
    minInstances: parseInt(process.env.BACKEND_MIN_INSTANCES) || 1,
    maxInstances: parseInt(process.env.BACKEND_MAX_INSTANCES) || 20,
    concurrency: parseInt(process.env.BACKEND_CONCURRENCY) || 100,
    timeout: 120,
    port: 3000,
    allowUnauthenticated: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      DATABASE_URL: process.env.DATABASE_URL,
      REDIS_URL: process.env.REDIS_URL,
    },
  },

  'ai-service': {
    cpu: parseInt(process.env.AI_SERVICE_CPU) || 4,
    memory: process.env.AI_SERVICE_MEMORY || '2Gi',
    minInstances: parseInt(process.env.AI_SERVICE_MIN_INSTANCES) || 1,
    maxInstances: parseInt(process.env.AI_SERVICE_MAX_INSTANCES) || 50,
    concurrency: parseInt(process.env.AI_SERVICE_CONCURRENCY) || 80,
    timeout: 300,
    port: 8080,
    allowUnauthenticated: false,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    },
  },

  'gateway': {
    cpu: parseInt(process.env.GATEWAY_CPU) || 1,
    memory: process.env.GATEWAY_MEMORY || '512Mi',
    minInstances: parseInt(process.env.GATEWAY_MIN_INSTANCES) || 1,
    maxInstances: parseInt(process.env.GATEWAY_MAX_INSTANCES) || 10,
    concurrency: parseInt(process.env.GATEWAY_CONCURRENCY) || 100,
    timeout: 60,
    port: 8080,
    allowUnauthenticated: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
    },
  },
};

/**
 * Region configuration
 * @type {Object}
 */
const regionConfig = {
  primary: process.env.CLOUD_RUN_REGION || 'us-central1',
  fallback: process.env.CLOUD_RUN_FALLBACK_REGION || 'us-east1',
  multiRegion: process.env.CLOUD_RUN_MULTI_REGION === 'true',
};

/**
 * Authentication and IAM settings
 * @type {Object}
 */
const authConfig = {
  serviceAccount: process.env.CLOUD_RUN_SERVICE_ACCOUNT || null,
  iamBindings: {
    'ai-frontend': ['allUsers'],
    'backend': ['allUsers'],
    'ai-service': [],
    'gateway': ['allUsers'],
  },
  invokerRole: 'roles/run.invoker',
};

/**
 * Scaling and performance settings
 * @type {Object}
 */
const scalingConfig = {
  autoScaling: {
    enabled: true,
    targetCPUUtilization: 0.7,
    targetMemoryUtilization: 0.8,
    targetConcurrency: 0.75,
  },
  coldStart: {
    minimizeEnabled: true,
    minInstancesSchedule: {
      enabled: process.env.CLOUD_RUN_SCHEDULED_SCALING === 'true',
      businessHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/New_York',
        minInstances: 2,
      },
      offHours: {
        minInstances: 0,
      },
    },
  },
};

/**
 * Cost optimization settings
 * @type {Object}
 */
const costConfig = {
  budgetLimitPerDay: parseFloat(process.env.CLOUD_RUN_DAILY_BUDGET) || 50.0,
  budgetAlertThresholds: [0.5, 0.75, 0.9, 1.0],
  scaleToZeroTimeout: 300,
  idleTimeout: 600,
  costOptimization: {
    enableScaleToZero: process.env.CLOUD_RUN_SCALE_TO_ZERO !== 'false',
    preferPreemptible: false,
    maxInstanceLifetime: 3600,
  },
};

/**
 * Networking and security
 * @type {Object}
 */
const networkConfig = {
  vpcConnector: process.env.VPC_CONNECTOR_NAME || null,
  vpcEgress: process.env.VPC_EGRESS || 'private-ranges-only',
  cloudSQLConnections: process.env.CLOUD_SQL_CONNECTIONS?.split(',') || [],
  customDomains: {
    'ai-frontend': process.env.FRONTEND_DOMAIN || null,
    'backend': process.env.BACKEND_DOMAIN || null,
    'ai-service': process.env.AI_SERVICE_DOMAIN || null,
    'gateway': process.env.GATEWAY_DOMAIN || null,
  },
};

/**
 * Logging and monitoring
 * @type {Object}
 */
const monitoringConfig = {
  logLevel: process.env.LOG_LEVEL || 'info',
  enableStructuredLogging: true,
  enableTracing: process.env.ENABLE_TRACING === 'true',
  enableProfiling: process.env.ENABLE_PROFILING === 'true',
  metricsRetention: 30,
  alerting: {
    errorRateThreshold: 0.05,
    latencyThreshold: 1000,
    notificationChannels: process.env.ALERT_CHANNELS?.split(',') || [],
  },
};

/**
 * Get configuration for a specific service
 * 
 * @param {string} serviceName - Name of the service
 * @returns {Object} Service configuration
 */
function getServiceConfig(serviceName) {
  const config = serviceConfigs[serviceName];
  
  if (!config) {
    throw new Error(`Unknown service: ${serviceName}`);
  }

  return {
    ...config,
    region: regionConfig.primary,
    serviceAccount: authConfig.serviceAccount,
  };
}

/**
 * Get all service configurations
 * 
 * @returns {Object} All service configurations
 */
function getAllConfigs() {
  return {
    services: serviceConfigs,
    region: regionConfig,
    auth: authConfig,
    scaling: scalingConfig,
    cost: costConfig,
    network: networkConfig,
    monitoring: monitoringConfig,
  };
}

/**
 * Validate configuration for production deployment
 * 
 * @returns {Object} Validation result
 */
function validateConfig() {
  const errors = [];
  const warnings = [];

  if (!authConfig.serviceAccount && process.env.NODE_ENV === 'production') {
    warnings.push('No service account specified for production deployment');
  }

  if (costConfig.budgetLimitPerDay < 10) {
    warnings.push('Daily budget is very low, may cause service interruptions');
  }

  Object.entries(serviceConfigs).forEach(([name, config]) => {
    if (config.maxInstances < config.minInstances) {
      errors.push(`${name}: maxInstances must be >= minInstances`);
    }

    if (config.memory.includes('Mi') && parseInt(config.memory) < 256) {
      warnings.push(`${name}: Memory allocation is very low (< 256Mi)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

module.exports = {
  serviceConfigs,
  regionConfig,
  authConfig,
  scalingConfig,
  costConfig,
  networkConfig,
  monitoringConfig,
  getServiceConfig,
  getAllConfigs,
  validateConfig,
};
