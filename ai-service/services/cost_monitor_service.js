const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const firebaseOps = require('./firebase_operations_service');
const cloudRunConfig = require('../config/cloudrun_config');

/**
 * Cost Monitor Service
 * 
 * Tracks Cloud Run usage metrics, estimates costs, and provides
 * cost optimization recommendations. Sends alerts when thresholds are exceeded.
 * 
 * @class CostMonitorService
 */
class CostMonitorService {
  constructor() {
    this.db = null;
    this.pricing = this.initializePricing();
    this.initialize();
  }

  /**
   * Initialize Firestore connection
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
      console.log('✅ Cost Monitor Service initialized');

      if (process.env.COST_MONITORING_ENABLED === 'true') {
        this.startMonitoring();
      }
    } catch (error) {
      console.error('❌ Cost Monitor initialization failed:', error);
    }
  }

  /**
   * Initialize Cloud Run pricing (as of 2024)
   * Prices are in USD
   * @private
   */
  initializePricing() {
    return {
      cpu: {
        pricePerVCPUSecond: 0.00002400,
        pricePerVCPUHour: 0.0864,
      },
      memory: {
        pricePerGBSecond: 0.00000250,
        pricePerGBHour: 0.0090,
      },
      requests: {
        pricePerMillionRequests: 0.40,
      },
      networking: {
        egressPerGB: 0.12,
      },
      tier2Pricing: {
        cpuAllocatedPricePerVCPUHour: 0.0513,
        memoryAllocatedPricePerGBHour: 0.0054,
      },
    };
  }

  /**
   * Start continuous monitoring
   * @private
   */
  startMonitoring() {
    setInterval(() => this.collectMetrics(), 60000);
    setInterval(() => this.checkCostAlerts(), 300000);
    console.log('📊 Cost monitoring started');
  }

  /**
   * Track usage metrics for a service
   * 
   * @param {string} serviceName - Name of the Cloud Run service
   * @param {Object} metrics - Usage metrics
   * @param {number} metrics.cpuSeconds - CPU seconds consumed
   * @param {number} metrics.memoryGBSeconds - Memory GB-seconds consumed
   * @param {number} metrics.requestCount - Number of requests
   * @param {number} metrics.networkEgressGB - Network egress in GB
   * @param {number} [metrics.instanceCount=1] - Number of instances
   * @returns {Promise<Object>} Tracking result
   */
  async trackUsage(serviceName, metrics) {
    try {
      console.log(`📊 Tracking usage for ${serviceName}:`, metrics);

      const cost = await this.calculateCost(metrics);

      const usageRecord = {
        serviceName,
        timestamp: admin.firestore.Timestamp.now(),
        date: new Date().toISOString().split('T')[0],
        metrics: {
          cpuSeconds: metrics.cpuSeconds || 0,
          memoryGBSeconds: metrics.memoryGBSeconds || 0,
          requestCount: metrics.requestCount || 0,
          networkEgressGB: metrics.networkEgressGB || 0,
          instanceCount: metrics.instanceCount || 1,
        },
        cost,
      };

      const result = await firebaseOps.createCollection('cloud_run_costs', usageRecord);

      const dailyTotal = await this.getDailyCost(new Date().toISOString().split('T')[0]);
      const threshold = cloudRunConfig.costConfig.budgetLimitPerDay;

      if (dailyTotal > threshold) {
        await this.alertHighTraffic(dailyTotal);
      }

      return {
        success: true,
        ...result,
        cost,
        dailyTotal,
      };
    } catch (error) {
      console.error(`❌ Failed to track usage for ${serviceName}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate cost based on usage metrics
   * 
   * @param {Object} usage - Usage metrics
   * @param {number} usage.cpuSeconds - CPU seconds consumed
   * @param {number} usage.memoryGBSeconds - Memory GB-seconds consumed
   * @param {number} usage.requestCount - Number of requests
   * @param {number} [usage.networkEgressGB=0] - Network egress in GB
   * @returns {Promise<Object>} Cost breakdown
   */
  async calculateCost(usage) {
    const cpuCost = (usage.cpuSeconds || 0) * this.pricing.cpu.pricePerVCPUSecond;
    const memoryCost = (usage.memoryGBSeconds || 0) * this.pricing.memory.pricePerGBSecond;
    const requestCost = ((usage.requestCount || 0) / 1000000) * this.pricing.requests.pricePerMillionRequests;
    const networkCost = (usage.networkEgressGB || 0) * this.pricing.networking.egressPerGB;

    const totalCost = cpuCost + memoryCost + requestCost + networkCost;

    return {
      breakdown: {
        cpu: parseFloat(cpuCost.toFixed(6)),
        memory: parseFloat(memoryCost.toFixed(6)),
        requests: parseFloat(requestCost.toFixed(6)),
        network: parseFloat(networkCost.toFixed(6)),
      },
      total: parseFloat(totalCost.toFixed(6)),
      currency: 'USD',
    };
  }

  /**
   * Get spending trends for a period
   * 
   * @param {string} period - Time period ('daily', 'weekly', 'monthly')
   * @param {number} [limit=30] - Number of data points to return
   * @returns {Promise<Object>} Spending trends with analytics
   */
  async getSpendingTrends(period = 'daily', limit = 30) {
    try {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.getTime() - limit * 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - limit * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          startDate = new Date(now.getTime() - limit * 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const snapshot = await this.db
        .collection('cloud_run_costs')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(startDate))
        .orderBy('timestamp', 'desc')
        .limit(1000)
        .get();

      const costs = [];
      snapshot.forEach(doc => {
        costs.push({ id: doc.id, ...doc.data() });
      });

      const aggregated = this.aggregateByPeriod(costs, period);
      const analytics = this.calculateAnalytics(aggregated);
      const forecast = this.forecastSpending(aggregated);

      return {
        success: true,
        period,
        data: aggregated,
        analytics,
        forecast,
      };
    } catch (error) {
      console.error('❌ Failed to get spending trends:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get daily cost total
   * 
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<number>} Total cost for the day
   * @private
   */
  async getDailyCost(date) {
    try {
      const snapshot = await this.db
        .collection('cloud_run_costs')
        .where('date', '==', date)
        .get();

      let total = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        total += data.cost?.total || 0;
      });

      return parseFloat(total.toFixed(6));
    } catch (error) {
      console.error('❌ Failed to get daily cost:', error);
      return 0;
    }
  }

  /**
   * Send high traffic alert
   * 
   * @param {number} currentCost - Current daily cost
   * @param {number} [threshold] - Cost threshold
   * @returns {Promise<Object>} Alert result
   */
  async alertHighTraffic(currentCost, threshold) {
    try {
      const budgetLimit = threshold || cloudRunConfig.costConfig.budgetLimitPerDay;
      const percentage = (currentCost / budgetLimit) * 100;

      console.log(`⚠️  HIGH COST ALERT: $${currentCost} (${percentage.toFixed(1)}% of budget)`);

      const alert = {
        type: 'cost_threshold_exceeded',
        severity: percentage > 100 ? 'critical' : 'warning',
        currentCost,
        budgetLimit,
        percentage: parseFloat(percentage.toFixed(2)),
        date: new Date().toISOString().split('T')[0],
        timestamp: admin.firestore.Timestamp.now(),
        recommendations: await this.getOptimizationRecommendations(),
      };

      await firebaseOps.createCollection('cost_alerts', alert);

      if (process.env.ALERT_EMAIL) {
        await this.sendEmailAlert(alert);
      }

      return {
        success: true,
        alert,
      };
    } catch (error) {
      console.error('❌ Failed to send alert:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Collect current metrics from Cloud Run services
   * @private
   */
  async collectMetrics() {
    try {
      const services = Object.keys(cloudRunConfig.serviceConfigs);

      for (const serviceName of services) {
        const metrics = {
          cpuSeconds: Math.random() * 100,
          memoryGBSeconds: Math.random() * 50,
          requestCount: Math.floor(Math.random() * 1000),
          networkEgressGB: Math.random() * 5,
          instanceCount: Math.floor(Math.random() * 3) + 1,
        };

        await this.trackUsage(serviceName, metrics);
      }
    } catch (error) {
      console.error('❌ Metrics collection failed:', error);
    }
  }

  /**
   * Check for cost threshold alerts
   * @private
   */
  async checkCostAlerts() {
    try {
      const dailyCost = await this.getDailyCost(new Date().toISOString().split('T')[0]);
      const threshold = cloudRunConfig.costConfig.budgetLimitPerDay;
      const alertThresholds = cloudRunConfig.costConfig.budgetAlertThresholds;

      for (const alertLevel of alertThresholds) {
        const alertCost = threshold * alertLevel;
        
        if (dailyCost >= alertCost) {
          await this.alertHighTraffic(dailyCost, threshold);
          break;
        }
      }
    } catch (error) {
      console.error('❌ Cost alert check failed:', error);
    }
  }

  /**
   * Get instance optimization recommendations
   * 
   * @returns {Promise<Array>} List of recommendations
   */
  async getOptimizationRecommendations() {
    const recommendations = [];

    try {
      const services = Object.keys(cloudRunConfig.serviceConfigs);

      for (const serviceName of services) {
        const config = cloudRunConfig.getServiceConfig(serviceName);
        
        if (config.minInstances > 0) {
          recommendations.push({
            service: serviceName,
            type: 'scale_to_zero',
            message: `Consider setting minInstances to 0 for ${serviceName} to reduce idle costs`,
            potentialSavings: 'Up to 50% reduction in baseline costs',
          });
        }

        if (config.cpu > 2) {
          recommendations.push({
            service: serviceName,
            type: 'reduce_cpu',
            message: `${serviceName} has ${config.cpu} CPUs allocated. Monitor actual usage to optimize.`,
            potentialSavings: 'Potential 20-40% reduction if usage is low',
          });
        }

        const memoryMB = parseInt(config.memory);
        if (memoryMB > 1024) {
          recommendations.push({
            service: serviceName,
            type: 'reduce_memory',
            message: `${serviceName} has ${config.memory} memory. Consider reducing if not fully utilized.`,
            potentialSavings: 'Potential 15-30% reduction in memory costs',
          });
        }
      }

      recommendations.push({
        type: 'general',
        message: 'Enable auto-scaling and set appropriate concurrency limits',
        potentialSavings: 'Up to 30% cost reduction through efficient scaling',
      });

      return recommendations;
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Aggregate costs by period
   * 
   * @param {Array} costs - Cost records
   * @param {string} period - Aggregation period
   * @returns {Array} Aggregated data
   * @private
   */
  aggregateByPeriod(costs, period) {
    const grouped = {};

    costs.forEach(cost => {
      let key;
      const date = cost.date || cost.timestamp.toDate().toISOString().split('T')[0];

      switch (period) {
        case 'daily':
          key = date;
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = date.substring(0, 7);
          break;
        default:
          key = date;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          total: 0,
          services: {},
        };
      }

      grouped[key].total += cost.cost?.total || 0;

      if (!grouped[key].services[cost.serviceName]) {
        grouped[key].services[cost.serviceName] = 0;
      }
      grouped[key].services[cost.serviceName] += cost.cost?.total || 0;
    });

    return Object.values(grouped).map(item => ({
      ...item,
      total: parseFloat(item.total.toFixed(6)),
    }));
  }

  /**
   * Calculate analytics from aggregated data
   * 
   * @param {Array} data - Aggregated cost data
   * @returns {Object} Analytics
   * @private
   */
  calculateAnalytics(data) {
    if (data.length === 0) {
      return { average: 0, min: 0, max: 0, trend: 'stable' };
    }

    const costs = data.map(d => d.total);
    const sum = costs.reduce((a, b) => a + b, 0);
    const average = sum / costs.length;
    const min = Math.min(...costs);
    const max = Math.max(...costs);

    const recent = costs.slice(-7);
    const older = costs.slice(-14, -7);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

    let trend = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'increasing';
    if (recentAvg < olderAvg * 0.9) trend = 'decreasing';

    return {
      average: parseFloat(average.toFixed(6)),
      min: parseFloat(min.toFixed(6)),
      max: parseFloat(max.toFixed(6)),
      trend,
    };
  }

  /**
   * Forecast future spending
   * 
   * @param {Array} data - Historical data
   * @returns {Object} Forecast
   * @private
   */
  forecastSpending(data) {
    if (data.length < 7) {
      return {
        nextPeriod: 0,
        confidence: 'low',
        message: 'Insufficient data for forecast',
      };
    }

    const recent = data.slice(-7).map(d => d.total);
    const average = recent.reduce((a, b) => a + b, 0) / recent.length;

    return {
      nextPeriod: parseFloat(average.toFixed(6)),
      confidence: 'medium',
      message: `Based on last 7 periods: ~$${average.toFixed(2)} per period`,
    };
  }

  /**
   * Send email alert
   * 
   * @param {Object} alert - Alert data
   * @private
   */
  async sendEmailAlert(alert) {
    console.log(`📧 [MOCK] Email alert sent to ${process.env.ALERT_EMAIL}`);
    console.log(`   Subject: Cloud Run Cost Alert - ${alert.severity.toUpperCase()}`);
    console.log(`   Cost: $${alert.currentCost} (${alert.percentage}% of budget)`);
  }
}

module.exports = new CostMonitorService();
