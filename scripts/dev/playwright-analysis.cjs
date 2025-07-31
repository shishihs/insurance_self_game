const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create analysis directory
const analysisDir = path.join(__dirname, '../../analysis');
if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportFile = path.join(analysisDir, `technical-analysis-${timestamp}.json`);
const screenshotFile = path.join(analysisDir, `screenshot-${timestamp}.png`);

async function performTechnicalAnalysis() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Analysis results object
    const analysis = {
        timestamp: new Date().toISOString(),
        url: 'https://shishihs.github.io/insurance_self_game/',
        results: {
            pageLoad: {},
            console: [],
            network: [],
            content: {},
            functionality: {},
            performance: {},
            errors: []
        }
    };

    // 1. Monitor console messages
    page.on('console', msg => {
        analysis.results.console.push({
            timestamp: new Date().toISOString(),
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
    });

    // Monitor page errors
    page.on('pageerror', error => {
        analysis.results.errors.push({
            timestamp: new Date().toISOString(),
            type: 'pageerror',
            message: error.message,
            stack: error.stack
        });
    });

    // Monitor request failures
    page.on('requestfailed', request => {
        analysis.results.errors.push({
            timestamp: new Date().toISOString(),
            type: 'requestfailed',
            url: request.url(),
            failure: request.failure()?.errorText
        });
    });

    // 2. Monitor network requests
    page.on('response', response => {
        analysis.results.network.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            contentType: response.headers()['content-type'],
            size: response.headers()['content-length'],
            timing: response.request().timing()
        });
    });

    console.log('Starting technical analysis...');
    console.log('Navigating to:', analysis.url);

    try {
        // 3. Navigation and page load timing
        const startTime = Date.now();
        await page.goto(analysis.url, { waitUntil: 'networkidle', timeout: 30000 });
        const loadTime = Date.now() - startTime;
        
        analysis.results.pageLoad = {
            loadTime: loadTime,
            title: await page.title(),
            url: page.url(),
            success: true
        };

        console.log(`Page loaded in ${loadTime}ms`);
        console.log('Title:', analysis.results.pageLoad.title);

        // Wait a bit for any dynamic content
        await page.waitForTimeout(3000);

        // 4. Take full-page screenshot
        await page.screenshot({ 
            path: screenshotFile, 
            fullPage: true 
        });
        console.log('Screenshot saved:', screenshotFile);

        // 5. Extract HTML content
        const htmlContent = await page.content();
        analysis.results.content.htmlLength = htmlContent.length;
        analysis.results.content.hasVueApp = htmlContent.includes('vue') || htmlContent.includes('Vue');
        analysis.results.content.hasGameElements = htmlContent.includes('game') || htmlContent.includes('insurance');
        
        // 6. Check for specific elements
        const gameContainer = await page.$('#app');
        analysis.results.content.hasAppContainer = !!gameContainer;
        
        // Check for loading states
        const loadingElements = await page.$$('[class*="loading"], [class*="spinner"]');
        analysis.results.content.hasLoadingElements = loadingElements.length > 0;

        // Check for error messages
        const errorElements = await page.$$('[class*="error"], .error-message');
        analysis.results.content.hasErrorElements = errorElements.length > 0;

        // 7. Functionality testing
        try {
            // Look for clickable elements
            const buttons = await page.$$('button, [role="button"], .btn');
            analysis.results.functionality.buttonCount = buttons.length;
            
            // Try to interact with first button if exists
            if (buttons.length > 0) {
                await buttons[0].click();
                await page.waitForTimeout(1000);
                analysis.results.functionality.firstButtonClickable = true;
            }

            // Check for navigation elements
            const navElements = await page.$$('nav, .navigation, [role="navigation"]');
            analysis.results.functionality.hasNavigation = navElements.length > 0;

        } catch (error) {
            analysis.results.functionality.error = error.message;
        }

        // 8. Performance metrics
        const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
                loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
                domInteractive: navigation?.domInteractive - navigation?.navigationStart,
                firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
            };
        });
        analysis.results.performance = performanceMetrics;

        // 9. Check for Vue.js specific elements
        const vueInfo = await page.evaluate(() => {
            return {
                hasVue: typeof window.Vue !== 'undefined' || document.querySelector('[data-v-]') !== null,
                vueVersion: window.Vue?.version,
                hasVueDevtools: !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__
            };
        });
        analysis.results.content.vueInfo = vueInfo;

        // 10. Check document ready state
        const readyState = await page.evaluate(() => document.readyState);
        analysis.results.content.documentReadyState = readyState;

        console.log('Analysis completed successfully');

    } catch (error) {
        console.error('Error during analysis:', error);
        analysis.results.errors.push({
            timestamp: new Date().toISOString(),
            type: 'analysis_error',
            message: error.message,
            stack: error.stack
        });
        analysis.results.pageLoad.success = false;
        analysis.results.pageLoad.error = error.message;
    }

    await browser.close();

    // Save analysis results
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
    console.log('Analysis report saved:', reportFile);

    return analysis;
}

// Execute analysis
performTechnicalAnalysis()
    .then(analysis => {
        console.log('\n=== TECHNICAL ANALYSIS SUMMARY ===');
        console.log('URL:', analysis.url);
        console.log('Page Load Success:', analysis.results.pageLoad.success);
        console.log('Load Time:', analysis.results.pageLoad.loadTime + 'ms');
        console.log('Console Messages:', analysis.results.console.length);
        console.log('Network Requests:', analysis.results.network.length);
        console.log('Errors Found:', analysis.results.errors.length);
        console.log('Has Vue App:', analysis.results.content.vueInfo?.hasVue);
        console.log('Button Count:', analysis.results.functionality.buttonCount);
        
        if (analysis.results.errors.length > 0) {
            console.log('\n=== ERRORS DETECTED ===');
            analysis.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. [${error.type}] ${error.message}`);
            });
        }
        
        console.log('\nFull report saved to:', reportFile);
        process.exit(0);
    })
    .catch(error => {
        console.error('Analysis failed:', error);
        process.exit(1);
    });