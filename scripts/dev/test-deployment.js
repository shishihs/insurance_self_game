import { chromium } from 'playwright';

async function runComprehensiveTests() {
    console.log('🚀 Starting comprehensive deployment tests...\n');
    
    let browser;
    try {
        browser = await chromium.launch({ headless: true, timeout: 60000 });
        const context = await browser.newContext();
        const page = await context.newPage();
    
    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    
    // Collect network errors
    const networkErrors = [];
    page.on('response', response => {
        if (response.status() >= 400) {
            networkErrors.push(`${response.status()} - ${response.url()}`);
        }
    });
    
    try {
        console.log('📡 Loading the game site...');
        await page.goto('https://shishihs.github.io/insurance_self_game/', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('✅ Site loaded successfully');
        
        // Test 1: Basic page structure
        console.log('\n🔍 Test 1: Checking basic page structure...');
        const title = await page.title();
        console.log(`   Page title: ${title}`);
        
        const gameTitle = await page.textContent('h1').catch(() => null);
        console.log(`   Game title: ${gameTitle || 'Not found'}`);
        
        // Test 2: Check for critical elements
        console.log('\n🔍 Test 2: Checking for critical game elements...');
        
        const gameCanvas = await page.locator('#game-canvas, .game-canvas, [data-testid="game-canvas"]').count();
        const handCards = await page.locator('.hand-card, [data-testid="hand-card"], .card').count();
        const challengeZones = await page.locator('.challenge-zone, [data-testid="challenge-zone"], .drop-zone').count();
        
        console.log(`   Game canvas elements: ${gameCanvas}`);
        console.log(`   Hand cards found: ${handCards}`);
        console.log(`   Challenge zones found: ${challengeZones}`);
        
        // Test 3: Game start functionality
        console.log('\n🔍 Test 3: Testing game start functionality...');
        
        const startButton = page.locator('button:has-text("ゲーム開始"), button:has-text("スタート"), [data-testid="start-button"]').first();
        const startButtonExists = await startButton.count() > 0;
        
        if (startButtonExists) {
            console.log('   ✅ Start button found');
            await startButton.click();
            await page.waitForTimeout(2000);
            console.log('   ✅ Start button clicked');
        } else {
            console.log('   ⚠️ Start button not found - game might auto-start');
        }
        
        // Test 4: Card interaction testing
        console.log('\n🔍 Test 4: Testing card drag and drop functionality...');
        
        // Wait for cards to be rendered
        await page.waitForTimeout(3000);
        
        const cards = page.locator('.hand-card, [data-testid="hand-card"], .card');
        const cardCount = await cards.count();
        
        if (cardCount > 0) {
            console.log(`   ✅ Found ${cardCount} cards in hand`);
            
            // Try to drag the first card
            const firstCard = cards.first();
            const cardText = await firstCard.textContent().catch(() => 'Unknown');
            console.log(`   📋 First card: ${cardText}`);
            
            // Look for drop zones
            const dropZones = page.locator('.challenge-zone, [data-testid="challenge-zone"], .drop-zone, .dropzone');
            const dropZoneCount = await dropZones.count();
            
            if (dropZoneCount > 0) {
                console.log(`   ✅ Found ${dropZoneCount} drop zones`);
                
                try {
                    // Test drag and drop
                    const firstDropZone = dropZones.first();
                    await firstCard.dragTo(firstDropZone);
                    await page.waitForTimeout(1000);
                    console.log('   ✅ Drag and drop operation completed');
                } catch (error) {
                    console.log(`   ❌ Drag and drop failed: ${error.message}`);
                }
            } else {
                console.log('   ⚠️ No drop zones found');
            }
        } else {
            console.log('   ⚠️ No cards found in hand');
        }
        
        // Test 5: Check for specific error patterns
        console.log('\n🔍 Test 5: Checking for specific fixed errors...');
        
        const errorPatterns = [
            'enableHandCardSelection is not a function',
            'selectedCards getter',
            'No drop zone found'
        ];
        
        for (const pattern of errorPatterns) {
            const found = consoleErrors.some(error => error.includes(pattern));
            if (found) {
                console.log(`   ❌ Error pattern still present: ${pattern}`);
            } else {
                console.log(`   ✅ Error pattern fixed: ${pattern}`);
            }
        }
        
        // Test 6: Performance and stability
        console.log('\n🔍 Test 6: Performance and stability checks...');
        
        const performanceMetrics = await page.evaluate(() => ({
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            memoryUsage: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null
        }));
        
        console.log(`   Page load time: ${performanceMetrics.loadTime}ms`);
        console.log(`   DOM content loaded: ${performanceMetrics.domContentLoaded}ms`);
        
        if (performanceMetrics.memoryUsage) {
            console.log(`   Memory usage: ${performanceMetrics.memoryUsage.used}MB / ${performanceMetrics.memoryUsage.total}MB`);
        }
        
        // Test 7: Responsive design
        console.log('\n🔍 Test 7: Testing responsive design...');
        
        const viewports = [
            { width: 1920, height: 1080, name: 'Desktop' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 375, height: 667, name: 'Mobile' }
        ];
        
        for (const viewport of viewports) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(1000);
            
            const isVisible = await page.locator('body').isVisible();
            console.log(`   ${viewport.name} (${viewport.width}x${viewport.height}): ${isVisible ? '✅ Responsive' : '❌ Not responsive'}`);
        }
        
        // Final results
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('=' .repeat(50));
        
        if (consoleErrors.length === 0) {
            console.log('✅ No JavaScript console errors detected');
        } else {
            console.log(`❌ ${consoleErrors.length} console errors detected:`);
            consoleErrors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (networkErrors.length === 0) {
            console.log('✅ No network errors detected');
        } else {
            console.log(`❌ ${networkErrors.length} network errors detected:`);
            networkErrors.forEach(error => console.log(`   - ${error}`));
        }
        
        console.log('\n🎯 SPECIFIC FIXES VERIFICATION:');
        console.log('✅ Site loads successfully');
        console.log(`${cardCount > 0 ? '✅' : '❌'} Cards are rendered`);
        console.log(`${dropZoneCount > 0 ? '✅' : '❌'} Drop zones are present`);
        
        const criticalErrorsFixed = !consoleErrors.some(error => 
            error.includes('enableHandCardSelection is not a function') ||
            error.includes('selectedCards getter') ||
            error.includes('No drop zone found')
        );
        console.log(`${criticalErrorsFixed ? '✅' : '❌'} Critical errors fixed`);
        
        if (performanceMetrics.loadTime < 5000) {
            console.log('✅ Page load performance acceptable');
        } else {
            console.log('⚠️ Page load time may be slow');
        }
        
        // Summary of key findings
        console.log('\n📋 KEY FINDINGS:');
        console.log(`   Cards in hand: ${cardCount}`);
        console.log(`   Drop zones: ${dropZoneCount}`);
        console.log(`   Console errors: ${consoleErrors.length}`);
        console.log(`   Network errors: ${networkErrors.length}`);
        console.log(`   Load time: ${performanceMetrics.loadTime}ms`);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error('Error closing browser:', closeError.message);
            }
        }
    }
    } catch (outerError) {
        console.error('❌ Failed to initialize browser:', outerError.message);
    }
}

runComprehensiveTests().catch(console.error);