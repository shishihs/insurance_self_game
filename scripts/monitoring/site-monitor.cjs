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
   * 🏥 Perform comprehensive health check
   */
  async performHealthCheck() {
    const checkStartTime = Date.now();
    
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
      
      console.log(`  ✅ Check completed: ${overallHealth.status} (${overallHealth.responseTime}ms)`);
      
      return overallHealth;
      
    } catch (error) {
      console.error(`  ❌ Health check failed: ${error.message}`);
      
      this.recordError(error, checkStartTime);
      throw error;
    }
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
    
    // Update success counter
    if (healthResult.status === 'healthy') {
      this.metrics.successfulChecks++;
    }
    
    // Calculate availability
    this.metrics.availability = (this.metrics.successfulChecks / this.metrics.totalChecks) * 100;
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
  }

  /**
   * 📋 Generate report
   */
  generateReport() {
    const avgResponseTime = this.metrics.uptime.length > 0 ?
      this.metrics.uptime.reduce((sum, r) => sum + r.responseTime, 0) / this.metrics.uptime.length : 0;
    
    console.log('\n📋 MONITORING REPORT');
    console.log('===================');
    console.log(`🌐 Target URL: ${this.config.siteUrl}`);
    console.log(`📊 Total Checks: ${this.metrics.totalChecks}`);
    console.log(`✅ Successful Checks: ${this.metrics.successfulChecks}`);
    console.log(`📈 Availability: ${this.metrics.availability.toFixed(2)}%`);
    console.log(`⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`❌ Total Errors: ${this.metrics.errors.length}`);
    
    if (this.metrics.errors.length > 0) {
      console.log('\n🚨 Recent Errors:');
      this.metrics.errors.slice(-3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message}`);
      });
    }
    
    console.log('===================');
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'once';
  
  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--url':
        options.siteUrl = value;
        break;
      case '--timeout':
        options.timeout = parseInt(value) * 1000;
        break;
    }
  }
  
  const monitor = new SiteMonitor(options);
  
  switch (command) {
    case 'once':
      // Single check
      monitor.performHealthCheck().then((result) => {
        monitor.generateReport();
        console.log('✅ Single check completed successfully');
        process.exit(0);
      }).catch((error) => {
        console.error('❌ Check failed:', error.message);
        monitor.generateReport();
        process.exit(1);
      });
      break;
      
    default:
      console.log(`
📊 Site Monitor CLI

Usage:
  node site-monitor.cjs [command] [options]

Commands:
  once      Perform single health check (default)

Options:
  --url <url>          Target URL to monitor
  --timeout <seconds>  Request timeout in seconds (default: 30)

Examples:
  node site-monitor.cjs once
  node site-monitor.cjs once --url https://example.com
      `);
      process.exit(0);
  }
}

module.exports = SiteMonitor;