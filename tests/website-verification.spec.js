import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test results directory
const testResultsDir = path.join(__dirname, '../test-results');
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

test.describe('CUI Game Website Comprehensive Verification', () => {
  let consoleLogs = [];
  let networkErrors = [];
  const performanceMetrics = {};

  test.beforeEach(async ({ page }) => {
    // Reset arrays for each test
    consoleLogs = [];
    networkErrors = [];
    
    // Listen for console messages
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(logEntry);
      console.log(`Console ${msg.type()}: ${msg.text()}`);
    });

    // Listen for network failures
    page.on('requestfailed', request => {
      const error = {
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString()
      };
      networkErrors.push(error);
      console.log(`Network failure: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Listen for page errors
    page.on('pageerror', error => {
      consoleLogs.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.log(`Page error: ${error.message}`);
    });
  });

  test('1. Desktop Browser Basic Verification (1920x1080)', async ({ page }) => {
    const timestamp = getTimestamp();
    
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    console.log('Navigating to website...');
    const startTime = Date.now();
    
    // Navigate with extended timeout
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    performanceMetrics.initialLoadTime = loadTime;
    
    console.log(`Page loaded in ${loadTime}ms`);
    
    // Wait additional time for complete loading
    await page.waitForTimeout(10000);
    
    // Take initial screenshot
    await page.screenshot({
      path: path.join(testResultsDir, `desktop-initial-${timestamp}.png`),
      fullPage: true
    });
    
    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Verify basic page structure
    const bodyExists = await page.locator('body').count() > 0;
    expect(bodyExists).toBe(true);
    
    // Save console logs
    fs.writeFileSync(
      path.join(testResultsDir, `console-logs-desktop-${timestamp}.json`),
      JSON.stringify(consoleLogs, null, 2)
    );
    
    // Save network errors
    fs.writeFileSync(
      path.join(testResultsDir, `network-errors-desktop-${timestamp}.json`),
      JSON.stringify(networkErrors, null, 2)
    );
  });

  test('2. Game Functionality Testing', async ({ page }) => {
    const timestamp = getTimestamp();
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    // Take home screen screenshot
    await page.screenshot({
      path: path.join(testResultsDir, `home-screen-${timestamp}.png`),
      fullPage: true
    });
    
    // Test navigation and buttons
    console.log('Testing game functionality...');
    
    try {
      // Look for common game elements
      const buttons = await page.locator('button').count();
      console.log(`Found ${buttons} buttons on the page`);
      
      // Try to find and click start/play buttons
      const startButton = page.locator('button').filter({ hasText: /start|play|開始|プレイ/i }).first();
      const startButtonExists = await startButton.count() > 0;
      
      if (startButtonExists) {
        console.log('Found start button, testing click...');
        await startButton.click();
        await page.waitForTimeout(3000);
        
        // Take screenshot after click
        await page.screenshot({
          path: path.join(testResultsDir, `after-start-click-${timestamp}.png`),
          fullPage: true
        });
      }
      
      // Test other interactive elements
      const inputs = await page.locator('input').count();
      const selects = await page.locator('select').count();
      const links = await page.locator('a').count();
      
      console.log(`Interactive elements found: ${buttons} buttons, ${inputs} inputs, ${selects} selects, ${links} links`);
      
      // Test all buttons (safely)
      const allButtons = await page.locator('button').all();
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        try {
          const buttonText = await allButtons[i].textContent();
          console.log(`Testing button: ${buttonText}`);
          await allButtons[i].click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after each button click
          await page.screenshot({
            path: path.join(testResultsDir, `button-${i}-clicked-${timestamp}.png`),
            fullPage: true
          });
        } catch (error) {
          console.log(`Error clicking button ${i}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`Game functionality test error: ${error.message}`);
    }
    
    // Save functionality test logs
    fs.writeFileSync(
      path.join(testResultsDir, `functionality-test-logs-${timestamp}.json`),
      JSON.stringify({
        consoleLogs,
        networkErrors,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  });

  test('3. Mobile Viewport Confirmation (375x667)', async ({ page }) => {
    const timestamp = getTimestamp();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    console.log('Testing mobile viewport...');
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    // Take mobile screenshot
    await page.screenshot({
      path: path.join(testResultsDir, `mobile-viewport-${timestamp}.png`),
      fullPage: true
    });
    
    // Test mobile-specific functionality
    try {
      // Test touch operations
      const buttons = await page.locator('button').all();
      if (buttons.length > 0) {
        await buttons[0].tap();
        await page.waitForTimeout(2000);
        
        await page.screenshot({
          path: path.join(testResultsDir, `mobile-after-tap-${timestamp}.png`),
          fullPage: true
        });
      }
      
      // Test scrolling
      await page.evaluate(() => window.scrollTo(0, 200));
      await page.waitForTimeout(1000);
      
      await page.screenshot({
        path: path.join(testResultsDir, `mobile-scrolled-${timestamp}.png`),
        fullPage: true
      });
      
    } catch (error) {
      console.log(`Mobile test error: ${error.message}`);
    }
    
    // Save mobile test logs
    fs.writeFileSync(
      path.join(testResultsDir, `mobile-test-logs-${timestamp}.json`),
      JSON.stringify({
        consoleLogs,
        networkErrors,
        viewport: { width: 375, height: 667 },
        timestamp: new Date().toISOString()
      }, null, 2)
    );
  });

  test('4. Technical Checks - Resource Loading', async ({ page }) => {
    const timestamp = getTimestamp();
    const resourceData = [];
    
    // Monitor all requests
    page.on('request', request => {
      resourceData.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: new Date().toISOString()
      });
    });
    
    page.on('response', response => {
      resourceData.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: Object.fromEntries(response.headers()),
        timestamp: new Date().toISOString()
      });
    });
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    await page.waitForTimeout(10000);
    
    // Check CSS loading
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets).map(sheet => ({
        href: sheet.href,
        rules: sheet.cssRules ? sheet.cssRules.length : 0,
        disabled: sheet.disabled
      }));
    });
    
    // Check JavaScript loading
    const scripts = await page.evaluate(() => {
      return Array.from(document.scripts).map(script => ({
        src: script.src,
        type: script.type,
        async: script.async,
        defer: script.defer
      }));
    });
    
    // Check images
    const images = await page.evaluate(() => {
      return Array.from(document.images).map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
    });
    
    // Check fonts
    const fonts = await page.evaluate(() => {
      const computedStyle = window.getComputedStyle(document.body);
      return {
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight
      };
    });
    
    // Save technical analysis
    fs.writeFileSync(
      path.join(testResultsDir, `technical-analysis-${timestamp}.json`),
      JSON.stringify({
        resourceData,
        stylesheets,
        scripts,
        images,
        fonts,
        consoleLogs,
        networkErrors,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    
    // Take technical state screenshot
    await page.screenshot({
      path: path.join(testResultsDir, `technical-state-${timestamp}.png`),
      fullPage: true
    });
  });

  test('5. Performance Analysis', async ({ page }) => {
    const timestamp = getTimestamp();
    
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Measure performance
    const startTime = Date.now();
    
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const navigationTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceData = await page.evaluate(() => {
      const perfData = window.performance;
      const navigation = perfData.getEntriesByType('navigation')[0];
      const paint = perfData.getEntriesByType('paint');
      
      return {
        navigation: navigation ? {
          domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
          loadEventEnd: navigation.loadEventEnd,
          fetchStart: navigation.fetchStart,
          responseEnd: navigation.responseEnd
        } : null,
        paint: paint.map(entry => ({
          name: entry.name,
          startTime: entry.startTime
        })),
        timing: {
          domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.fetchStart : null,
          loadComplete: navigation ? navigation.loadEventEnd - navigation.fetchStart : null
        }
      };
    });
    
    // Save performance data
    fs.writeFileSync(
      path.join(testResultsDir, `performance-analysis-${timestamp}.json`),
      JSON.stringify({
        navigationTime,
        performanceData,
        consoleLogs,
        networkErrors,
        timestamp: new Date().toISOString()
      }, null, 2)
    );
    
    console.log(`Performance Analysis Complete - Navigation Time: ${navigationTime}ms`);
  });

  test.afterAll(async () => {
    // Generate final summary report
    const timestamp = getTimestamp();
    const summaryReport = {
      testCompletedAt: new Date().toISOString(),
      totalConsoleLogs: consoleLogs.length,
      totalNetworkErrors: networkErrors.length,
      performanceMetrics,
      testResults: 'See individual test files for detailed results'
    };
    
    fs.writeFileSync(
      path.join(testResultsDir, `test-summary-${timestamp}.json`),
      JSON.stringify(summaryReport, null, 2)
    );
    
    console.log('All tests completed. Results saved to test-results directory.');
  });
});