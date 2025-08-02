import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGameStart() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle'
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Try different selectors for the game start button
    const buttonSelectors = [
      'button:has-text("ゲームをプレイ")',
      'text=ゲームをプレイ',
      '[aria-label*="ゲーム"]',
      '.game-start',
      'button[class*="purple"]'
    ];
    
    console.log('Looking for game start button...');
    
    for (const selector of buttonSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`Found button with selector: ${selector}`);
          
          // Take screenshot before click
          await page.screenshot({ 
            path: path.join(__dirname, 'deployment-screenshots', 'before-click.png'),
            fullPage: true 
          });
          
          // Click the button
          await element.click();
          console.log('Clicked the button!');
          
          // Wait for any transition
          await page.waitForTimeout(3000);
          
          // Take screenshot after click
          await page.screenshot({ 
            path: path.join(__dirname, 'deployment-screenshots', 'after-click.png'),
            fullPage: true 
          });
          
          console.log('Screenshots taken');
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} not found`);
      }
    }
    
    // Get all buttons on the page
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent?.trim(),
        class: btn.className,
        id: btn.id,
        ariaLabel: btn.getAttribute('aria-label')
      }))
    );
    
    console.log('All buttons found on page:');
    buttons.forEach((btn, index) => {
      console.log(`${index + 1}. Text: "${btn.text}", Class: "${btn.class}", ID: "${btn.id}", ARIA: "${btn.ariaLabel}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testGameStart().catch(console.error);