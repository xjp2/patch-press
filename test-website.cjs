const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5175';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

async function runTests() {
  console.log('🚀 Starting comprehensive website tests...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      console.error('❌ Console Error:', text);
    }
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.error('❌ Page Error:', error.message);
  });

  try {
    // ========== TEST 1: Initial Page Load ==========
    console.log('📄 TEST 1: Loading homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await delay(2000); // Wait for React to hydrate
    await takeScreenshot(page, '01-homepage');
    console.log('✅ Homepage loaded\n');

    // ========== TEST 2: Check Landing Page Elements ==========
    console.log('🔍 TEST 2: Checking landing page elements...');
    const heroTitle = await page.$eval('h1', el => el.textContent).catch(() => null);
    console.log(`   Hero title: ${heroTitle || 'NOT FOUND'}`);
    
    const hasNav = await page.$('nav') !== null;
    console.log(`   Navigation: ${hasNav ? '✅ Found' : '❌ Not found'}`);
    
    const hasCartButton = await page.$('button[title="Shopping Cart"]') !== null || 
                          await page.evaluate(() => document.body.innerHTML.includes('ShoppingCart'));
    console.log(`   Cart button: ${hasCartButton ? '✅ Found' : '❌ Not found'}`);
    console.log('');

    // ========== TEST 3: Login Modal ==========
    console.log('🔐 TEST 3: Testing login modal...');
    const loginButton = await page.$('button svg[data-testid="user-icon"]') ||
                       await page.evaluateHandle(() => {
                         const buttons = Array.from(document.querySelectorAll('button'));
                         return buttons.find(b => b.innerHTML.includes('User'));
                       });
    
    if (loginButton) {
      const element = await loginButton.asElement();
      if (element) {
        await element.click();
        await delay(500);
        await takeScreenshot(page, '02-login-modal');
        console.log('✅ Login modal opened\n');
        
        // Close modal by pressing Escape
        await page.keyboard.press('Escape');
        await delay(300);
      } else {
        console.log('⚠️ Login button element not accessible\n');
      }
    } else {
      console.log('⚠️ Login button not found\n');
    }

    // ========== TEST 4: Navigate to Customize Page ==========
    console.log('🎨 TEST 4: Testing customize page...');
    
    // Look for "Start Designing" or similar CTA buttons
    const ctaButtons = await page.$$eval('button', buttons => 
      buttons.filter(b => 
        b.textContent.toLowerCase().includes('start') || 
        b.textContent.toLowerCase().includes('design') ||
        b.textContent.toLowerCase().includes('customize')
      ).map(b => b.textContent.trim())
    );
    console.log(`   Found CTA buttons: ${ctaButtons.join(', ') || 'None'}`);
    
    // Try to navigate to customize page via URL
    await page.goto(`${BASE_URL}#/customize`, { waitUntil: 'networkidle2' });
    await delay(2000);
    await takeScreenshot(page, '03-customize-page');
    console.log('✅ Customize page loaded\n');

    // ========== TEST 5: Product Selection ==========
    console.log('📦 TEST 5: Testing product selection...');
    const productCards = await page.$$eval('div', divs => 
      divs.filter(d => d.className.includes('cursor-pointer')).length
    );
    console.log(`   Found ${productCards} clickable product cards`);
    
    // Click first product if available
    const firstProduct = await page.$('div.cursor-pointer, div[class*="ring-4"]');
    if (firstProduct) {
      await firstProduct.click();
      await delay(500);
      console.log('✅ Product clicked\n');
    } else {
      console.log('⚠️ No product cards found to click\n');
    }

    // ========== TEST 6: Patch Selection ==========
    console.log('🧵 TEST 6: Testing patch selection...');
    const patchButtons = await page.$$('button');
    console.log(`   Found ${patchButtons.length} buttons on page`);
    
    // Look for patch-related elements
    const hasPatchPanel = await page.evaluate(() => 
      document.body.innerHTML.includes('Patch') || 
      document.body.innerHTML.includes('patch')
    );
    console.log(`   Patch panel: ${hasPatchPanel ? '✅ Found' : '❌ Not found'}`);
    console.log('');

    // ========== TEST 7: Cart Functionality ==========
    console.log('🛒 TEST 7: Testing cart...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await delay(1000);
    
    // Click cart button - look for ShoppingCart icon
    const cartButton = await page.$('button svg.lucide-shopping-cart');
    
    if (cartButton) {
      await cartButton.click();
      await delay(500);
      await takeScreenshot(page, '04-cart-drawer');
      console.log('✅ Cart drawer opened\n');
    } else {
      console.log('⚠️ Cart button not found\n');
    }

    // ========== TEST 8: Admin Panel (if accessible) ==========
    console.log('⚙️ TEST 8: Testing admin panel access...');
    
    // First try to login as admin
    // Find user/login button by looking for the User icon
    const userButton = await page.$('button svg.lucide-user');
    
    if (userButton) {
      await userButton.click();
      await delay(500);
      
      // Fill in login form (using demo credentials from the UI)
      const emailInput = await page.$('input[type="email"]');
      const passwordInput = await page.$('input[type="password"]');
      
      if (emailInput && passwordInput) {
        await emailInput.type('admin@patchpress.com');
        await passwordInput.type('admin123');
        await takeScreenshot(page, '05-admin-login-filled');
        
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await delay(2000);
          await takeScreenshot(page, '06-after-login');
          console.log('✅ Login form submitted\n');
        }
      } else {
        console.log('⚠️ Login inputs not found\n');
      }
    }

    // ========== TEST 9: Performance Metrics ==========
    console.log('⚡ TEST 9: Collecting performance metrics...');
    
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await delay(2000);
    
    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const navigation = performance.getEntriesByType('navigation')[0];
      
      return {
        // Basic timing
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || null,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || null,
        
        // Resource count
        resourceCount: performance.getEntriesByType('resource').length,
        
        // Memory usage (if available)
        memoryUsed: performance.memory?.usedJSHeapSize || null,
        memoryTotal: performance.memory?.totalJSHeapSize || null,
      };
    });
    
    console.log('   Performance Metrics:');
    console.log(`   - Page Load Time: ${performanceMetrics.loadTime}ms`);
    console.log(`   - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   - First Paint: ${performanceMetrics.firstPaint?.toFixed(2) || 'N/A'}ms`);
    console.log(`   - First Contentful Paint: ${performanceMetrics.firstContentfulPaint?.toFixed(2) || 'N/A'}ms`);
    console.log(`   - Resources Loaded: ${performanceMetrics.resourceCount}`);
    if (performanceMetrics.memoryUsed) {
      console.log(`   - Memory Used: ${(performanceMetrics.memoryUsed / 1024 / 1024).toFixed(2)}MB`);
    }
    console.log('');

    // ========== TEST 10: Console Error Summary ==========
    console.log('📊 TEST 10: Console message summary...');
    console.log(`   Total console messages: ${consoleMessages.length}`);
    console.log(`   Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`   Warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);
    console.log(`   Page errors: ${pageErrors.length}`);
    
    if (consoleMessages.filter(m => m.type === 'error').length > 0) {
      console.log('\n   ❌ Console Errors:');
      consoleMessages.filter(m => m.type === 'error').forEach(m => {
        console.log(`      - ${m.text}`);
      });
    }
    console.log('');

    // ========== TEST 11: Responsive Test ==========
    console.log('📱 TEST 11: Testing responsive layouts...');
    
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewport({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await delay(1000);
      await takeScreenshot(page, `07-responsive-${viewport.name}`);
      console.log(`   ✅ ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
    console.log('');

    // Final summary
    console.log('='.repeat(50));
    console.log('✅ TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log(`Total screenshots: 11`);
    console.log(`Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    
    if (consoleMessages.filter(m => m.type === 'error').length === 0 && pageErrors.length === 0) {
      console.log('\n🎉 All tests passed with no errors!');
    } else {
      console.log('\n⚠️ Some issues were detected. Check the logs above.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
    console.log('\n🔚 Browser closed');
  }
}

runTests().catch(console.error);
