import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'deployment-screenshots');

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function verifyDeployment() {
  const results = {
    timestamp: new Date().toISOString(),
    url: 'https://shishihs.github.io/insurance_self_game/',
    checks: [],
    screenshots: [],
    consoleLogs: [],
    errors: []
  };

  let browser;
  
  try {
    await ensureDir(screenshotsDir);
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Capture console logs
    page.on('console', msg => {
      results.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      results.errors.push({
        message: error.message,
        stack: error.stack
      });
    });
    
    console.log('🔍 Starting deployment verification...\n');
    
    // Test 1: Page Load Status
    console.log('1️⃣ Testing page load status...');
    try {
      const response = await page.goto(results.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const status = response.status();
      const check1 = {
        name: 'Page Load Status',
        status: status === 200 ? 'PASS' : 'FAIL',
        details: `HTTP Status: ${status}`,
        statusCode: status
      };
      results.checks.push(check1);
      console.log(`   ${check1.status === 'PASS' ? '✅' : '❌'} ${check1.details}`);
      
      // Take initial screenshot
      const screenshot1 = `${screenshotsDir}/01-initial-load.png`;
      await page.screenshot({ path: screenshot1, fullPage: true });
      results.screenshots.push({ name: 'Initial Load', path: screenshot1 });
      
    } catch (error) {
      results.checks.push({
        name: 'Page Load Status',
        status: 'FAIL',
        details: `Failed to load page: ${error.message}`
      });
      console.log(`   ❌ Failed to load page: ${error.message}`);
    }
    
    // Test 2: Vue.js App Initialization
    console.log('\n2️⃣ Testing Vue.js app initialization...');
    try {
      // Wait for Vue app to mount
      await page.waitForSelector('#app', { timeout: 10000 });
      
      // Check if Vue is available
      const vueInitialized = await page.evaluate(() => {
        return typeof window.Vue !== 'undefined' || 
               document.querySelector('#app').__vue_app__ !== undefined ||
               document.querySelector('#app')._vnode !== undefined;
      });
      
      // Check for app content
      const appContent = await page.evaluate(() => {
        const app = document.querySelector('#app');
        return {
          exists: !!app,
          hasContent: app ? app.innerHTML.length > 0 : false,
          innerHTML: app ? app.innerHTML.substring(0, 200) : ''
        };
      });
      
      const check2 = {
        name: 'Vue.js App Initialization',
        status: appContent.exists && appContent.hasContent ? 'PASS' : 'FAIL',
        details: `App element exists: ${appContent.exists}, Has content: ${appContent.hasContent}`,
        vueDetected: vueInitialized
      };
      results.checks.push(check2);
      console.log(`   ${check2.status === 'PASS' ? '✅' : '❌'} ${check2.details}`);
      
    } catch (error) {
      results.checks.push({
        name: 'Vue.js App Initialization',
        status: 'FAIL',
        details: `Failed to verify Vue app: ${error.message}`
      });
      console.log(`   ❌ Failed to verify Vue app: ${error.message}`);
    }
    
    // Test 3: Game Start Button
    console.log('\n3️⃣ Testing game start button...');
    try {
      // Look for game start button
      const buttonSelectors = [
        'button:has-text("ゲーム開始")',
        'button:has-text("ゲームを開始")',
        'button:has-text("スタート")',
        '.game-start-button',
        '[data-testid="game-start"]'
      ];
      
      let buttonFound = false;
      let buttonSelector = null;
      
      for (const selector of buttonSelectors) {
        try {
          const button = await page.locator(selector).first();
          if (await button.isVisible({ timeout: 5000 })) {
            buttonFound = true;
            buttonSelector = selector;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (buttonFound) {
        const screenshot2 = `${screenshotsDir}/02-game-start-button.png`;
        await page.screenshot({ path: screenshot2, fullPage: true });
        results.screenshots.push({ name: 'Game Start Button Found', path: screenshot2 });
        
        // Try clicking the button
        await page.locator(buttonSelector).first().click();
        await page.waitForTimeout(2000); // Wait for any transitions
        
        const screenshot3 = `${screenshotsDir}/03-after-button-click.png`;
        await page.screenshot({ path: screenshot3, fullPage: true });
        results.screenshots.push({ name: 'After Button Click', path: screenshot3 });
        
        results.checks.push({
          name: 'Game Start Button',
          status: 'PASS',
          details: 'Game start button found and clicked successfully'
        });
        console.log(`   ✅ Game start button found and clicked`);
      } else {
        results.checks.push({
          name: 'Game Start Button',
          status: 'FAIL',
          details: 'Game start button not found on page'
        });
        console.log(`   ❌ Game start button not found`);
      }
      
    } catch (error) {
      results.checks.push({
        name: 'Game Start Button',
        status: 'FAIL',
        details: `Error testing button: ${error.message}`
      });
      console.log(`   ❌ Error testing button: ${error.message}`);
    }
    
    // Test 4: JavaScript Console Errors
    console.log('\n4️⃣ Checking for JavaScript console errors...');
    const errorLogs = results.consoleLogs.filter(log => 
      log.type === 'error' || log.type === 'warning'
    );
    
    const check4 = {
      name: 'JavaScript Console Errors',
      status: errorLogs.length === 0 ? 'PASS' : 'WARN',
      details: `Found ${errorLogs.length} errors/warnings`,
      errors: errorLogs
    };
    results.checks.push(check4);
    console.log(`   ${check4.status === 'PASS' ? '✅' : '⚠️'} ${check4.details}`);
    
    if (errorLogs.length > 0) {
      errorLogs.forEach(log => {
        console.log(`      - ${log.type}: ${log.text}`);
      });
    }
    
    // Test 5: CSS Styles Loading
    console.log('\n5️⃣ Verifying CSS styles are loaded...');
    try {
      const stylesInfo = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        const computedStyles = window.getComputedStyle(document.body);
        
        return {
          stylesheetCount: stylesheets.length,
          hasStyles: stylesheets.length > 0,
          bodyBackground: computedStyles.backgroundColor,
          bodyFont: computedStyles.fontFamily,
          // Check if any custom styles are applied
          hasCustomStyles: !computedStyles.backgroundColor.includes('rgba(0, 0, 0, 0)')
        };
      });
      
      const check5 = {
        name: 'CSS Styles Loading',
        status: stylesInfo.hasStyles && stylesInfo.hasCustomStyles ? 'PASS' : 'FAIL',
        details: `${stylesInfo.stylesheetCount} stylesheets loaded`,
        styleInfo: stylesInfo
      };
      results.checks.push(check5);
      console.log(`   ${check5.status === 'PASS' ? '✅' : '❌'} ${check5.details}`);
      
    } catch (error) {
      results.checks.push({
        name: 'CSS Styles Loading',
        status: 'FAIL',
        details: `Error checking styles: ${error.message}`
      });
      console.log(`   ❌ Error checking styles: ${error.message}`);
    }
    
    // Test 6: Basic Game Functionality
    console.log('\n6️⃣ Testing basic game functionality...');
    try {
      // Check for game elements
      const gameElements = await page.evaluate(() => {
        const elements = {
          canvas: !!document.querySelector('canvas'),
          gameContainer: !!document.querySelector('.game-container, #game-container, [class*="game"]'),
          buttons: document.querySelectorAll('button').length,
          forms: document.querySelectorAll('form, input, select').length,
          hasInteractiveElements: false
        };
        
        elements.hasInteractiveElements = elements.buttons > 0 || elements.forms > 0;
        return elements;
      });
      
      const check6 = {
        name: 'Basic Game Functionality',
        status: gameElements.hasInteractiveElements ? 'PASS' : 'WARN',
        details: `Found ${gameElements.buttons} buttons, ${gameElements.forms} form elements`,
        elements: gameElements
      };
      results.checks.push(check6);
      console.log(`   ${check6.status === 'PASS' ? '✅' : '⚠️'} ${check6.details}`);
      
      // Take final screenshot
      const screenshot4 = `${screenshotsDir}/04-final-state.png`;
      await page.screenshot({ path: screenshot4, fullPage: true });
      results.screenshots.push({ name: 'Final State', path: screenshot4 });
      
    } catch (error) {
      results.checks.push({
        name: 'Basic Game Functionality',
        status: 'FAIL',
        details: `Error checking functionality: ${error.message}`
      });
      console.log(`   ❌ Error checking functionality: ${error.message}`);
    }
    
    // Test 7: Mobile Responsiveness
    console.log('\n7️⃣ Testing mobile responsiveness...');
    try {
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      const screenshot5 = `${screenshotsDir}/05-mobile-view.png`;
      await page.screenshot({ path: screenshot5, fullPage: true });
      results.screenshots.push({ name: 'Mobile View', path: screenshot5 });
      
      const mobileLayout = await page.evaluate(() => {
        const body = document.body;
        const app = document.querySelector('#app');
        return {
          bodyWidth: body.scrollWidth,
          hasHorizontalScroll: body.scrollWidth > window.innerWidth,
          appWidth: app ? app.scrollWidth : 0
        };
      });
      
      const check7 = {
        name: 'Mobile Responsiveness',
        status: !mobileLayout.hasHorizontalScroll ? 'PASS' : 'WARN',
        details: mobileLayout.hasHorizontalScroll ? 'Has horizontal scroll on mobile' : 'No horizontal scroll detected',
        layout: mobileLayout
      };
      results.checks.push(check7);
      console.log(`   ${check7.status === 'PASS' ? '✅' : '⚠️'} ${check7.details}`);
      
    } catch (error) {
      results.checks.push({
        name: 'Mobile Responsiveness',
        status: 'FAIL',
        details: `Error checking mobile view: ${error.message}`
      });
      console.log(`   ❌ Error checking mobile view: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Fatal error during verification:', error);
    results.fatalError = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate summary
  const passCount = results.checks.filter(c => c.status === 'PASS').length;
  const failCount = results.checks.filter(c => c.status === 'FAIL').length;
  const warnCount = results.checks.filter(c => c.status === 'WARN').length;
  
  results.summary = {
    totalChecks: results.checks.length,
    passed: passCount,
    failed: failCount,
    warnings: warnCount,
    overallStatus: failCount === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
  };
  
  // Save results to JSON
  const reportPath = path.join(__dirname, 'deployment-report.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 DEPLOYMENT VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`URL: ${results.url}`);
  console.log(`Time: ${results.timestamp}`);
  console.log(`\nResults:`);
  console.log(`  ✅ Passed: ${passCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  ⚠️  Warnings: ${warnCount}`);
  console.log(`\nOverall Status: ${results.summary.overallStatus}`);
  console.log(`\nDetailed report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${screenshotsDir}/`);
  
  return results;
}

// Run verification
verifyDeployment().catch(console.error);