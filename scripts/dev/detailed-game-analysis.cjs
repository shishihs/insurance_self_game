const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const analysisDir = path.join(__dirname, '../../analysis');
if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

async function performDetailedGameAnalysis() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    const analysis = {
        timestamp: new Date().toISOString(),
        url: 'https://shishihs.github.io/insurance_self_game/',
        gameAnalysis: {
            ui: {},
            gameplay: {},
            technical: {},
            issues: [],
            recommendations: []
        }
    };

    console.log('Starting detailed game analysis...');

    try {
        // Navigate to the page
        await page.goto(analysis.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Take screenshot of initial state
        await page.screenshot({ 
            path: path.join(analysisDir, `game-initial-${timestamp}.png`), 
            fullPage: true 
        });

        // 1. UI/Visual Analysis
        console.log('Analyzing UI elements...');
        
        // Check game board/canvas
        const gameCanvas = await page.$('canvas');
        const gameContainer = await page.$('#app');
        
        analysis.gameAnalysis.ui = {
            hasCanvas: !!gameCanvas,
            hasGameContainer: !!gameContainer,
            canvasSize: gameCanvas ? await gameCanvas.evaluate(el => ({ width: el.width, height: el.height })) : null
        };

        // Get all visible text content
        const textContent = await page.evaluate(() => {
            return {
                title: document.title,
                headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => h.textContent.trim()),
                buttonTexts: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent.trim()),
                visibleText: Array.from(document.querySelectorAll('body *')).filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden' && el.textContent.trim();
                }).slice(0, 10).map(el => el.textContent.trim())
            };
        });
        analysis.gameAnalysis.ui.content = textContent;

        // 2. Interactive Elements Analysis
        console.log('Testing interactive elements...');
        
        const buttons = await page.$$('button');
        analysis.gameAnalysis.ui.buttonCount = buttons.length;
        
        for (let i = 0; i < Math.min(buttons.length, 5); i++) {
            try {
                const buttonText = await buttons[i].textContent();
                console.log(`Testing button ${i + 1}: "${buttonText}"`);
                
                // Click the button and observe changes
                await buttons[i].click();
                await page.waitForTimeout(1500);
                
                // Take screenshot after interaction
                await page.screenshot({ 
                    path: path.join(analysisDir, `game-after-click-${i + 1}-${timestamp}.png`), 
                    fullPage: true 
                });
                
            } catch (error) {
                analysis.gameAnalysis.issues.push({
                    type: 'interaction_error',
                    element: `button_${i + 1}`,
                    error: error.message
                });
            }
        }

        // 3. Game State Analysis
        console.log('Analyzing game state...');
        
        const gameState = await page.evaluate(() => {
            // Try to access common game state variables
            const possibleGameStates = [];
            
            // Check for Vue app data
            if (window.Vue && window.Vue._instance) {
                possibleGameStates.push({ type: 'vue_data', data: 'Vue app detected' });
            }
            
            // Check for global game variables
            if (window.game) {
                possibleGameStates.push({ type: 'global_game', data: 'Global game object found' });
            }
            
            // Check localStorage for game data
            const localStorageKeys = Object.keys(localStorage);
            possibleGameStates.push({ type: 'localStorage', keys: localStorageKeys });
            
            // Check for canvas content
            const canvas = document.querySelector('canvas');
            if (canvas) {
                possibleGameStates.push({ 
                    type: 'canvas', 
                    dimensions: { width: canvas.width, height: canvas.height }
                });
            }
            
            return possibleGameStates;
        });
        analysis.gameAnalysis.technical.gameState = gameState;

        // 4. Performance Analysis
        console.log('Analyzing performance...');
        
        const performanceMetrics = await page.evaluate(() => {
            const timing = performance.timing;
            return {
                pageLoadTime: timing.loadEventEnd - timing.navigationStart,
                domContentLoadedTime: timing.domContentLoadedEventEnd - timing.navigationStart,
                renderTime: timing.domComplete - timing.domLoading,
                resourceCount: performance.getEntriesByType('resource').length,
                jsHeapSize: performance.memory ? performance.memory.usedJSHeapSize : null
            };
        });
        analysis.gameAnalysis.technical.performance = performanceMetrics;

        // 5. Responsive Design Test
        console.log('Testing responsive design...');
        
        const viewports = [
            { width: 375, height: 667, name: 'mobile' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 1920, height: 1080, name: 'desktop' }
        ];
        
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
                path: path.join(analysisDir, `game-${viewport.name}-${timestamp}.png`), 
                fullPage: false 
            });
            
            // Check if elements are still visible and accessible
            const elementsVisible = await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                const canvas = document.querySelector('canvas');
                return {
                    buttonsVisible: Array.from(buttons).filter(btn => {
                        const rect = btn.getBoundingClientRect();
                        return rect.width > 0 && rect.height > 0;
                    }).length,
                    canvasVisible: canvas ? canvas.getBoundingClientRect().width > 0 : false
                };
            });
            
            analysis.gameAnalysis.ui.responsive = analysis.gameAnalysis.ui.responsive || {};
            analysis.gameAnalysis.ui.responsive[viewport.name] = elementsVisible;
        }

        // 6. Accessibility Check
        console.log('Checking accessibility...');
        
        const a11yCheck = await page.evaluate(() => {
            return {
                hasAltText: Array.from(document.querySelectorAll('img')).every(img => img.alt),
                hasAriaLabels: document.querySelectorAll('[aria-label]').length,
                hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
                focusableElements: document.querySelectorAll('button, input, select, textarea, a[href], [tabindex]').length,
                colorContrast: 'manual_check_required'
            };
        });
        analysis.gameAnalysis.technical.accessibility = a11yCheck;

        // 7. Error Detection
        console.log('Scanning for common issues...');
        
        // Check for missing resources
        const missingResources = await page.evaluate(() => {
            const brokenImages = Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0);
            return {
                brokenImages: brokenImages.length,
                emptyElements: document.querySelectorAll(':empty').length
            };
        });
        
        if (missingResources.brokenImages > 0) {
            analysis.gameAnalysis.issues.push({
                type: 'missing_resources',
                description: `${missingResources.brokenImages} broken images found`
            });
        }

        // Generate recommendations
        analysis.gameAnalysis.recommendations = generateRecommendations(analysis);

        console.log('Analysis completed successfully');

    } catch (error) {
        console.error('Error during analysis:', error);
        analysis.gameAnalysis.issues.push({
            type: 'analysis_error',
            error: error.message,
            stack: error.stack
        });
    }

    await browser.close();

    // Save analysis
    const reportFile = path.join(analysisDir, `detailed-game-analysis-${timestamp}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(analysis, null, 2));
    console.log('Detailed analysis saved:', reportFile);

    return analysis;
}

function generateRecommendations(analysis) {
    const recommendations = [];
    
    if (!analysis.gameAnalysis.ui.hasCanvas) {
        recommendations.push({
            priority: 'high',
            category: 'functionality',
            issue: 'No game canvas detected',
            suggestion: 'Ensure the game canvas is properly rendered and visible'
        });
    }
    
    if (analysis.gameAnalysis.issues.length > 0) {
        recommendations.push({
            priority: 'medium',
            category: 'stability',
            issue: 'Interaction errors detected',
            suggestion: 'Review and fix interactive element functionality'
        });
    }
    
    if (!analysis.gameAnalysis.technical.accessibility.hasHeadings) {
        recommendations.push({
            priority: 'medium',
            category: 'accessibility',
            issue: 'No heading structure found',
            suggestion: 'Add proper heading hierarchy for screen readers'
        });
    }
    
    return recommendations;
}

// Execute analysis
performDetailedGameAnalysis()
    .then(analysis => {
        console.log('\n=== DETAILED GAME ANALYSIS SUMMARY ===');
        console.log('Game Canvas Present:', analysis.gameAnalysis.ui.hasCanvas);
        console.log('Interactive Buttons:', analysis.gameAnalysis.ui.buttonCount);
        console.log('Issues Found:', analysis.gameAnalysis.issues.length);
        console.log('Recommendations:', analysis.gameAnalysis.recommendations.length);
        
        if (analysis.gameAnalysis.issues.length > 0) {
            console.log('\n=== ISSUES DETECTED ===');
            analysis.gameAnalysis.issues.forEach((issue, index) => {
                console.log(`${index + 1}. [${issue.type}] ${issue.error || issue.description}`);
            });
        }
        
        if (analysis.gameAnalysis.recommendations.length > 0) {
            console.log('\n=== RECOMMENDATIONS ===');
            analysis.gameAnalysis.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.suggestion}`);
            });
        }
        
        process.exit(0);
    })
    .catch(error => {
        console.error('Analysis failed:', error);
        process.exit(1);
    });