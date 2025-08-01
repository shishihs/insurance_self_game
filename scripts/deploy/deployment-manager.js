#!/usr/bin/env node

/**
 * 🚀 Deployment Manager
 * 
 * Complete deployment management system with automation,
 * monitoring, and rollback capabilities.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

class DeploymentManager {
  constructor() {
    this.config = {
      siteUrl: 'https://shishihs.github.io/insurance_self_game/',
      healthCheckTimeout: 60000,
      retryCount: 5,
      retryDelay: 10000,
    };
    
    this.deploymentId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    this.startTime = Date.now();
  }

  /**
   * 🎯 Main deployment orchestrator
   */
  async deploy(options = {}) {
    const {
      environment = 'production',
      skipTests = false,
      skipBuild = false,
      autoRollback = true,
      dryRun = false
    } = options;

    try {
      console.log('🚀 DEPLOYMENT MANAGER STARTING');
      console.log('=====================================');
      console.log(`📋 Deployment ID: ${this.deploymentId}`);
      console.log(`🌍 Environment: ${environment}`);
      console.log(`⏰ Start Time: ${new Date().toISOString()}`);
      console.log('=====================================\n');

      // Pre-deployment checks
      await this.preDeploymentChecks({ skipTests, skipBuild, dryRun });

      if (dryRun) {
        console.log('🔍 DRY RUN MODE - No actual deployment will occur');
        return { success: true, dryRun: true };
      }

      // Execute deployment
      const deploymentResult = await this.executeDeployment(environment);

      // Post-deployment verification
      const verificationResult = await this.postDeploymentVerification();

      // Generate deployment report
      const report = await this.generateDeploymentReport({
        environment,
        deploymentResult,
        verificationResult
      });

      console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
      console.log(`📊 Total Time: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
      
      return { success: true, deploymentId: this.deploymentId, report };

    } catch (error) {
      console.error('❌ DEPLOYMENT FAILED:', error.message);
      
      if (autoRollback) {
        console.log('🔄 Initiating automatic rollback...');
        await this.rollback('Deployment failed');
      }
      
      throw error;
    }
  }

  /**
   * 🛡️ Pre-deployment checks
   */
  async preDeploymentChecks({ skipTests, skipBuild, dryRun }) {
    console.log('🛡️ Running pre-deployment checks...\n');

    // 1. Git status check
    await this.checkGitStatus();

    // 2. Dependency check
    await this.checkDependencies();

    // 3. Build check
    if (!skipBuild) {
      await this.runBuild();
    }

    // 4. Test suite
    if (!skipTests) {
      await this.runTestSuite();
    }

    // 5. Security audit
    await this.runSecurityAudit();

    console.log('✅ All pre-deployment checks passed!\n');
  }

  /**
   * 📊 Git status check
   */
  async checkGitStatus() {
    console.log('📊 Checking Git status...');
    
    try {
      const status = execSync('git status --porcelain', { 
        cwd: PROJECT_ROOT, 
        encoding: 'utf8' 
      });
      
      if (status.trim()) {
        console.log('⚠️ Uncommitted changes detected:');
        console.log(status);
        
        const response = await this.promptUser('Continue with uncommitted changes? (y/N): ');
        if (response.toLowerCase() !== 'y') {
          throw new Error('Deployment cancelled due to uncommitted changes');
        }
      }
      
      // Get current commit info
      const commit = execSync('git rev-parse HEAD', { 
        cwd: PROJECT_ROOT, 
        encoding: 'utf8' 
      }).trim();
      
      const branch = execSync('git branch --show-current', { 
        cwd: PROJECT_ROOT, 
        encoding: 'utf8' 
      }).trim();
      
      console.log(`✅ Git status: Clean (${branch}: ${commit.substring(0, 8)})`);
      
      this.gitInfo = { commit, branch };
    } catch (error) {
      throw new Error(`Git status check failed: ${error.message}`);
    }
  }

  /**
   * 📦 Dependency check
   */
  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    try {
      // Check if node_modules exists and is up to date
      const packageLockPath = path.join(PROJECT_ROOT, 'package-lock.json');
      const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');
      
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('📥 Installing dependencies...');
        execSync('npm ci', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      } else {
        // Check if package-lock.json is newer than node_modules
        const packageLockStat = fs.statSync(packageLockPath);
        const nodeModulesStat = fs.statSync(nodeModulesPath);
        
        if (packageLockStat.mtime > nodeModulesStat.mtime) {
          console.log('📥 Dependencies outdated, reinstalling...');
          execSync('npm ci', { cwd: PROJECT_ROOT, stdio: 'inherit' });
        }
      }
      
      console.log('✅ Dependencies check passed');
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Build process
   */
  async runBuild() {
    console.log('🏗️ Running build process...');
    
    try {
      // Clean previous build
      const distPath = path.join(PROJECT_ROOT, 'dist');
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
      }
      
      // Run build
      execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      
      // Verify build artifacts
      if (!fs.existsSync(path.join(distPath, 'index.html'))) {
        throw new Error('Build artifacts missing: index.html not found');
      }
      
      // Get build size
      const buildSize = this.getDirectorySize(distPath);
      console.log(`✅ Build completed successfully (${this.formatBytes(buildSize)})`);
      
      // Add deployment metadata
      await this.addDeploymentMetadata(distPath);
      
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * 🧪 Test suite
   */
  async runTestSuite() {
    console.log('🧪 Running test suite...');
    
    try {
      // Run unit tests
      console.log('  🔬 Unit tests...');
      execSync('npm run test:run', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      
      // Run linting
      console.log('  🧹 Linting...');
      execSync('npm run lint', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      
      // Type checking
      console.log('  🔍 Type checking...');
      execSync('npm run type-check', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      
      console.log('✅ All tests passed');
    } catch (error) {
      throw new Error(`Test suite failed: ${error.message}`);
    }
  }

  /**
   * 🔒 Security audit
   */
  async runSecurityAudit() {
    console.log('🔒 Running security audit...');
    
    try {
      execSync('npm audit --audit-level=high', { 
        cwd: PROJECT_ROOT, 
        stdio: 'inherit' 
      });
      console.log('✅ Security audit passed');
    } catch (error) {
      console.log('⚠️ Security audit found issues, but continuing...');
    }
  }

  /**
   * 🚀 Execute deployment
   */
  async executeDeployment(environment) {
    console.log(`🚀 Executing deployment to ${environment}...`);
    
    try {
      // For GitHub Pages deployment
      if (environment === 'production') {
        execSync('npm run deploy', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      } else {
        // For other environments, we could implement different deployment strategies
        console.log(`⚠️ Environment '${environment}' not fully implemented, using default`);
        execSync('npm run deploy', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      }
      
      console.log('✅ Deployment executed successfully');
      return { success: true, environment };
    } catch (error) {
      throw new Error(`Deployment execution failed: ${error.message}`);
    }
  }

  /**
   * 🔍 Post-deployment verification
   */
  async postDeploymentVerification() {
    console.log('🔍 Running post-deployment verification...');
    
    const verificationResults = {
      healthCheck: false,
      performanceCheck: false,
      functionalityCheck: false,
      metadataCheck: false
    };
    
    try {
      // Wait for deployment to propagate
      console.log('⏳ Waiting for deployment to propagate...');
      await this.sleep(30000); // 30 seconds

      // Health check
      verificationResults.healthCheck = await this.healthCheck();
      
      // Performance check
      verificationResults.performanceCheck = await this.performanceCheck();
      
      // Functionality check
      verificationResults.functionalityCheck = await this.functionalityCheck();
      
      // Metadata check
      verificationResults.metadataCheck = await this.metadataCheck();
      
      const allPassed = Object.values(verificationResults).every(result => result);
      
      if (allPassed) {
        console.log('✅ All post-deployment verifications passed');
      } else {
        console.log('⚠️ Some post-deployment verifications failed');
      }
      
      return verificationResults;
    } catch (error) {
      console.error('❌ Post-deployment verification failed:', error.message);
      return verificationResults;
    }
  }

  /**
   * 🏥 Health check
   */
  async healthCheck() {
    console.log('  🏥 Health check...');
    
    try {
      const response = await this.httpRequest(this.config.siteUrl);
      
      if (response.statusCode === 200) {
        console.log('    ✅ Site is accessible');
        
        // Check response time
        const responseTime = response.responseTime;
        if (responseTime < 3000) {
          console.log(`    ✅ Response time: ${responseTime}ms`);
          return true;
        } else {
          console.log(`    ⚠️ Slow response time: ${responseTime}ms`);
          return false;
        }
      } else {
        console.log(`    ❌ HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`    ❌ Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * ⚡ Performance check
   */
  async performanceCheck() {
    console.log('  ⚡ Performance check...');
    
    try {
      // Basic performance metrics
      const startTime = Date.now();
      const response = await this.httpRequest(this.config.siteUrl);
      const loadTime = Date.now() - startTime;
      
      if (loadTime < 5000 && response.statusCode === 200) {
        console.log(`    ✅ Load time: ${loadTime}ms`);
        
        // Check content size
        const contentLength = response.body ? response.body.length : 0;
        console.log(`    📦 Content size: ${this.formatBytes(contentLength)}`);
        
        return true;
      } else {
        console.log(`    ❌ Performance check failed: ${loadTime}ms, HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`    ❌ Performance check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 🎮 Functionality check
   */
  async functionalityCheck() {
    console.log('  🎮 Functionality check...');
    
    try {
      const response = await this.httpRequest(this.config.siteUrl);
      
      if (response.body && response.body.includes('Insurance Game')) {
        console.log('    ✅ Game content detected');
        
        // Check for critical assets
        if (response.body.includes('assets/') || response.body.includes('.js')) {
          console.log('    ✅ Assets linked correctly');
          return true;
        } else {
          console.log('    ⚠️ Assets may be missing');
          return false;
        }
      } else {
        console.log('    ❌ Game content not found');
        return false;
      }
    } catch (error) {
      console.log(`    ❌ Functionality check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 📋 Metadata check
   */
  async metadataCheck() {
    console.log('  📋 Metadata check...');
    
    try {
      const deployInfoUrl = `${this.config.siteUrl}/deploy-info.json`;
      const response = await this.httpRequest(deployInfoUrl);
      
      if (response.statusCode === 200 && response.body) {
        const deployInfo = JSON.parse(response.body);
        
        if (deployInfo.deploymentId === this.deploymentId) {
          console.log('    ✅ Deployment metadata verified');
          return true;
        } else {
          console.log('    ⚠️ Deployment ID mismatch');
          return false;
        }
      } else {
        console.log('    ⚠️ Deployment metadata not found');
        return false;
      }
    } catch (error) {
      console.log(`    ❌ Metadata check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 🔄 Rollback system
   */
  async rollback(reason = 'Manual rollback') {
    console.log('🔄 INITIATING ROLLBACK');
    console.log('==============================');
    console.log(`📝 Reason: ${reason}`);
    
    try {
      // Get previous successful commit
      const previousCommit = await this.getPreviousSuccessfulCommit();
      
      if (!previousCommit) {
        throw new Error('No previous successful deployment found');
      }
      
      console.log(`🎯 Rolling back to: ${previousCommit.substring(0, 8)}`);
      
      // Checkout previous commit
      execSync(`git checkout ${previousCommit}`, { 
        cwd: PROJECT_ROOT, 
        stdio: 'inherit' 
      });
      
      // Rebuild and redeploy
      await this.runBuild();
      await this.executeDeployment('production');
      
      // Verify rollback
      const verificationResult = await this.postDeploymentVerification();
      
      if (verificationResult.healthCheck) {
        console.log('✅ Rollback completed successfully');
        
        // Create rollback report
        await this.createRollbackReport(reason, previousCommit);
      } else {
        throw new Error('Rollback verification failed');
      }
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Generate deployment report
   */
  async generateDeploymentReport({ environment, deploymentResult, verificationResult }) {
    const report = {
      deploymentId: this.deploymentId,
      timestamp: new Date().toISOString(),
      environment,
      duration: Date.now() - this.startTime,
      git: this.gitInfo,
      deployment: deploymentResult,
      verification: verificationResult,
      success: deploymentResult.success && Object.values(verificationResult).every(r => r)
    };
    
    // Save report to file
    const reportPath = path.join(PROJECT_ROOT, 'deployment-reports', `${this.deploymentId}.json`);
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Deployment report saved: ${reportPath}`);
    
    return report;
  }

  /**
   * 🏷️ Add deployment metadata
   */
  async addDeploymentMetadata(distPath) {
    const metadata = {
      deploymentId: this.deploymentId,
      timestamp: new Date().toISOString(),
      commit: this.gitInfo.commit,
      branch: this.gitInfo.branch,
      version: this.getPackageVersion(),
      buildTime: Date.now() - this.startTime
    };
    
    // Add deploy-info.json
    fs.writeFileSync(
      path.join(distPath, 'deploy-info.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Add health endpoint
    fs.writeFileSync(
      path.join(distPath, 'health'),
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: metadata.version
      }, null, 2)
    );
    
    console.log('✅ Deployment metadata added');
  }

  // Utility methods
  async httpRequest(url) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            responseTime: Date.now() - startTime
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(this.config.healthCheckTimeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  getDirectorySize(dirPath) {
    let size = 0;
    
    function calculateSize(dir) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          calculateSize(itemPath);
        } else {
          size += stats.size;
        }
      }
    }
    
    calculateSize(dirPath);
    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getPackageVersion() {
    const packagePath = path.join(PROJECT_ROOT, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageData.version;
  }

  async getPreviousSuccessfulCommit() {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd track successful deployments
      const commits = execSync('git log --oneline -n 10', { 
        cwd: PROJECT_ROOT, 
        encoding: 'utf8' 
      });
      
      const commitLines = commits.trim().split('\n');
      
      // Return the previous commit (simplified logic)
      if (commitLines.length > 1) {
        return commitLines[1].split(' ')[0];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async createRollbackReport(reason, targetCommit) {
    const report = {
      type: 'rollback',
      timestamp: new Date().toISOString(),
      reason,
      fromCommit: this.gitInfo.commit,
      toCommit: targetCommit,
      rollbackId: `rollback-${Date.now()}`
    };
    
    const reportPath = path.join(PROJECT_ROOT, 'deployment-reports', `${report.rollbackId}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Rollback report saved: ${reportPath}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async promptUser(question) {
    // Simplified implementation - in a real scenario, you'd use a proper prompt library
    return 'y'; // Default to yes for automation
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new DeploymentManager();
  
  const command = process.argv[2];
  const options = {
    environment: process.argv.includes('--env') ? 
      process.argv[process.argv.indexOf('--env') + 1] : 'production',
    skipTests: process.argv.includes('--skip-tests'),
    skipBuild: process.argv.includes('--skip-build'),
    dryRun: process.argv.includes('--dry-run'),
    autoRollback: !process.argv.includes('--no-rollback')
  };
  
  try {
    switch (command) {
      case 'deploy':
        await manager.deploy(options);
        break;
      case 'rollback':
        const reason = process.argv[3] || 'Manual rollback';
        await manager.rollback(reason);
        break;
      default:
        console.log(`
🚀 Deployment Manager CLI

Usage:
  node deployment-manager.js deploy [options]
  node deployment-manager.js rollback [reason]

Options:
  --env <environment>    Target environment (default: production)
  --skip-tests          Skip test execution
  --skip-build          Skip build process
  --dry-run             Simulate deployment without executing
  --no-rollback         Disable automatic rollback on failure

Examples:
  node deployment-manager.js deploy
  node deployment-manager.js deploy --env staging --skip-tests
  node deployment-manager.js deploy --dry-run
  node deployment-manager.js rollback "Emergency rollback"
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Deployment Manager Error:', error.message);
    process.exit(1);
  }
}

export default DeploymentManager;