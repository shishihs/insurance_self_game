#!/usr/bin/env node

/**
 * 📊 Site Monitor
 * 
 * Comprehensive site monitoring system with real-time metrics,
 * alerting, and reporting capabilities.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

class SiteMonitor {
  constructor(config = {}) {
    this.config = {
      siteUrl: 'https://shishihs.github.io/insurance_self_game/',
      checkInterval: 60000, // 1 minute
      timeout: 30000,
      retryCount: 3,
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        availability: 95, // 95%
        errorRate: 5 // 5%
      },
      ...config
    };
    
    this.metrics = {
      uptime: [],
      responseTime: [],
      errors: [],
      availability: 100,
      lastCheck: null,
      totalChecks: 0,
      successfulChecks: 0
    };
    
    this.isRunning = false;
    this.monitoringStartTime = Date.now();
  }

  /**
   * 🚀 Start monitoring
   */
  async startMonitoring(duration = null) {
    console.log('📊 SITE MONITOR STARTING');
    console.log('========================');
    console.log(`🌐 Target URL: ${this.config.siteUrl}`);
    console.log(`⏱️ Check Interval: ${this.config.checkInterval / 1000}s`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log('========================\n');
    
    this.isRunning = true;
    
    // Initial check
    await this.performHealthCheck();
    
    // Set up interval checks
    const intervalId = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(intervalId);
        return;
      }
      
      await this.performHealthCheck();
      this.generateRealTimeReport();
      
      // Check if we should stop (duration-based)
      if (duration && Date.now() - this.monitoringStartTime > duration) {
        this.stopMonitoring();
      }
    }, this.config.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping monitor...');
      this.stopMonitoring();
      clearInterval(intervalId);
    });
    
    // If duration is specified, auto-stop
    if (duration) {
      setTimeout(() => {
        this.stopMonitoring();
        clearInterval(intervalId);
      }, duration);
    }
  }

  /**
   * 🛑 Stop monitoring
   */
  stopMonitoring() {
    this.isRunning = false;
    console.log('\n🛑 MONITORING STOPPED');
    console.log('=====================');
    
    this.generateFinalReport();
    this.saveMetricsToFile();
  }

  /**
   * 🏥 Perform comprehensive health check
   */
  async performHealthCheck() {
    const checkStartTime = Date.now();
    const checkId = `check-${Date.now()}`;
    
    this.metrics.totalChecks++;
    
    try {
      console.log(`🔍 Health Check ${this.metrics.totalChecks}...`);
      
      // Main site check
      const mainSiteResult = await this.checkEndpoint(this.config.siteUrl);
      
      // Health endpoint check
      const healthResult = await this.checkEndpoint(`${this.config.siteUrl}/health`);
      
      // Deploy info check
      const deployInfoResult = await this.checkEndpoint(`${this.config.siteUrl}/deploy-info.json`);
      
      // Calculate overall health
      const overallHealth = this.calculateOverallHealth([
        mainSiteResult,
        healthResult,
        deployInfoResult
      ]);
      
      // Record metrics
      this.recordMetrics(overallHealth, checkStartTime);
      
      // Check for alerts
      await this.checkAlertConditions(overallHealth);
      
      console.log(`  ✅ Check completed: ${overallHealth.status} (${overallHealth.responseTime}ms)\n`);
      
    } catch (error) {
      console.error(`  ❌ Health check failed: ${error.message}\n`);
      
      this.recordError(error, checkStartTime);
      await this.handleCriticalError(error);
    }
    
    this.metrics.lastCheck = new Date().toISOString();
  }

  /**
   * 🌐 Check individual endpoint
   */
  async checkEndpoint(url, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, {
        timeout: this.config.timeout
      }, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          resolve({
            url,
            statusCode: res.statusCode,
            responseTime,
            contentLength: Buffer.byteLength(body),
            body: body.substring(0, 1000), // First 1000 chars
            success: res.statusCode >= 200 && res.statusCode < 400,
            timestamp: new Date().toISOString()
          });
        });
      });
      
      req.on('error', (error) => {
        if (retryCount < this.config.retryCount) {
          console.log(`    🔄 Retrying ${url} (${retryCount + 1}/${this.config.retryCount})...`);
          setTimeout(() => {
            this.checkEndpoint(url, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1));
        } else {
          reject(new Error(`${url}: ${error.message}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`${url}: Request timeout`));
      });
    });
  }

  /**
   * 📊 Calculate overall health
   */
  calculateOverallHealth(results) {
    const successfulResults = results.filter(r => r.success);
    const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    const avgResponseTime = Math.round(totalResponseTime / results.length);
    
    const healthScore = (successfulResults.length / results.length) * 100;
    
    let status = 'healthy';
    if (healthScore < 50) {
      status = 'critical';
    } else if (healthScore < 80) {
      status = 'degraded';
    } else if (healthScore < 100) {
      status = 'warning';
    }
    
    return {
      status,
      healthScore,
      responseTime: avgResponseTime,
      successfulChecks: successfulResults.length,
      totalChecks: results.length,
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📈 Record metrics
   */
  recordMetrics(healthResult, checkStartTime) {
    const checkDuration = Date.now() - checkStartTime;
    
    // Record uptime
    this.metrics.uptime.push({
      timestamp: new Date().toISOString(),
      status: healthResult.status,
      responseTime: healthResult.responseTime,
      healthScore: healthResult.healthScore
    });
    
    // Record response time
    this.metrics.responseTime.push({
      timestamp: new Date().toISOString(),
      time: healthResult.responseTime,
      checkDuration
    });
    
    // Update success counter
    if (healthResult.status === 'healthy') {
      this.metrics.successfulChecks++;
    }
    
    // Calculate availability
    this.metrics.availability = (this.metrics.successfulChecks / this.metrics.totalChecks) * 100;
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.metrics.uptime.length > 1000) {
      this.metrics.uptime = this.metrics.uptime.slice(-1000);
    }
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  /**
   * ❌ Record error
   */
  recordError(error, checkStartTime) {
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      checkDuration: Date.now() - checkStartTime
    });
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
  }

  /**
   * 🚨 Check alert conditions
   */
  async checkAlertConditions(healthResult) {
    const alerts = [];
    
    // Response time alert
    if (healthResult.responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Response time ${healthResult.responseTime}ms exceeds threshold ${this.config.alertThresholds.responseTime}ms`
      });
    }
    
    // Availability alert
    if (this.metrics.availability < this.config.alertThresholds.availability) {
      alerts.push({
        type: 'availability',
        severity: 'critical',
        message: `Availability ${this.metrics.availability.toFixed(2)}% below threshold ${this.config.alertThresholds.availability}%`
      });
    }
    
    // Health status alert
    if (healthResult.status === 'critical') {
      alerts.push({
        type: 'critical_status',
        severity: 'critical',
        message: 'Site is in critical state'
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  /**
   * 📢 Send alert
   */
  async sendAlert(alert) {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Save alert to file
    const alertsFile = path.join(PROJECT_ROOT, 'monitoring-data', 'alerts.json');
    
    try {
      let alerts = [];
      if (fs.existsSync(alertsFile)) {
        alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf8'));
      }
      
      alerts.push({
        ...alert,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
      
      // Keep only last 50 alerts
      if (alerts.length > 50) {
        alerts = alerts.slice(-50);
      }
      
      fs.mkdirSync(path.dirname(alertsFile), { recursive: true });
      fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Failed to save alert:', error.message);
    }
  }

  /**
   * 🚨 Handle critical error
   */
  async handleCriticalError(error) {
    console.log('🚨 CRITICAL ERROR DETECTED');
    console.log(`Error: ${error.message}`);
    
    // Could trigger rollback or other emergency procedures here
    // For now, just log and continue monitoring
  }

  /**
   * 📊 Generate real-time report
   */
  generateRealTimeReport() {
    if (this.metrics.totalChecks % 5 === 0) { // Every 5th check
      console.log('📊 MONITORING STATUS');
      console.log('===================');
      console.log(`⏱️ Running for: ${this.formatDuration(Date.now() - this.monitoringStartTime)}`);
      console.log(`✅ Successful checks: ${this.metrics.successfulChecks}/${this.metrics.totalChecks}`);
      console.log(`📈 Availability: ${this.metrics.availability.toFixed(2)}%`);
      
      if (this.metrics.responseTime.length > 0) {
        const recentTimes = this.metrics.responseTime.slice(-10).map(r => r.time);
        const avgTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;
        console.log(`⚡ Avg response time (last 10): ${Math.round(avgTime)}ms`);
      }
      
      console.log(`❌ Errors: ${this.metrics.errors.length}`);
      console.log('===================\n');
    }
  }

  /**
   * 📋 Generate final report
   */
  generateFinalReport() {
    const duration = Date.now() - this.monitoringStartTime;
    const avgResponseTime = this.metrics.responseTime.length > 0 ?
      this.metrics.responseTime.reduce((sum, r) => sum + r.time, 0) / this.metrics.responseTime.length : 0;
    
    console.log('📋 FINAL MONITORING REPORT');
    console.log('==========================');
    console.log(`⏱️ Total Duration: ${this.formatDuration(duration)}`);
    console.log(`🌐 Target URL: ${this.config.siteUrl}`);
    console.log(`📊 Total Checks: ${this.metrics.totalChecks}`);
    console.log(`✅ Successful Checks: ${this.metrics.successfulChecks}`);
    console.log(`📈 Final Availability: ${this.metrics.availability.toFixed(2)}%`);
    console.log(`⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`❌ Total Errors: ${this.metrics.errors.length}`);
    
    if (this.metrics.errors.length > 0) {
      console.log('\n🚨 Recent Errors:');
      this.metrics.errors.slice(-5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.timestamp}: ${error.message}`);
      });
    }
    
    console.log('==========================');
  }

  /**
   * 💾 Save metrics to file
   */
  saveMetricsToFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monitoring-report-${timestamp}.json`;
    const filepath = path.join(PROJECT_ROOT, 'monitoring-data', filename);
    
    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        duration: Date.now() - this.monitoringStartTime,
        siteUrl: this.config.siteUrl,
        configuration: this.config
      },
      summary: {
        totalChecks: this.metrics.totalChecks,
        successfulChecks: this.metrics.successfulChecks,
        availability: this.metrics.availability,
        averageResponseTime: this.metrics.responseTime.length > 0 ?
          this.metrics.responseTime.reduce((sum, r) => sum + r.time, 0) / this.metrics.responseTime.length : 0,
        totalErrors: this.metrics.errors.length
      },
      metrics: this.metrics
    };
    
    try {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`💾 Monitoring data saved: ${filepath}`);
    } catch (error) {
      console.error('Failed to save monitoring data:', error.message);
    }
  }

  /**
   * ⏱️ Format duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 📊 Get current metrics
   */
  getCurrentMetrics() {
    return {
      ...this.metrics,
      uptime: this.formatDuration(Date.now() - this.monitoringStartTime),
      isRunning: this.isRunning
    };
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--url':
        options.siteUrl = value;
        break;
      case '--interval':
        options.checkInterval = parseInt(value) * 1000;
        break;
      case '--timeout':
        options.timeout = parseInt(value) * 1000;
        break;
      case '--duration':
        options.duration = parseInt(value) * 1000;
        break;
    }
  }
  
  const monitor = new SiteMonitor(options);
  
  switch (command) {
    case 'start':
      const duration = options.duration || null;
      monitor.startMonitoring(duration);
      break;
      
    case 'once':
      // Single check
      monitor.performHealthCheck().then(() => {
        console.log('Single check completed');
        process.exit(0);
      }).catch((error) => {
        console.error('Check failed:', error.message);
        process.exit(1);
      });
      break;
      
    default:
      console.log(`
📊 Site Monitor CLI

Usage:
  node site-monitor.js [command] [options]

Commands:
  start     Start continuous monitoring (default)
  once      Perform single health check

Options:
  --url <url>          Target URL to monitor
  --interval <seconds> Check interval in seconds (default: 60)
  --timeout <seconds>  Request timeout in seconds (default: 30)
  --duration <seconds> Monitor duration in seconds (default: unlimited)

Examples:
  node site-monitor.js start
  node site-monitor.js start --interval 30 --duration 3600
  node site-monitor.js once --url https://example.com
      `);
      process.exit(0);
  }
}

module.exports = SiteMonitor;