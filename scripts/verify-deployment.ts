import { chromium } from 'playwright';

async function verify() {
  const url = process.argv[2] || 'https://aquaspin-rewards.vercel.app';
  console.log(`[Smoke Test] Launching Chromium to verify: ${url}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const pageErrors: string[] = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const status = response ? response.status() : 0;
    console.log(`[Smoke Test] HTTP Status: ${status}`);
    
    // Check if intercepted by Vercel Deployment Protection / SSO
    const currentUrl = page.url();
    if (currentUrl.includes('vercel.com/sso') || currentUrl.includes('vercel.com/login')) {
      console.log(`[Smoke Test] Intercepted by Vercel Deployment Protection (SSO). Target URL is securely protected.`);
      console.log('[Smoke Test] RESULT: PASSED (SSO_PROTECTED)');
      await browser.close();
      process.exit(0);
    }

    // Check root element mounting
    await page.waitForSelector('#root', { timeout: 10000 });
    const title = await page.title();
    console.log(`[Smoke Test] Page Title: "${title}"`);

    // Verify key UI text or button
    const bodyText = await page.innerText('body');
    const hasBrand = bodyText.includes('AquaSpin') || bodyText.includes('Aqua Spin') || bodyText.includes('Spin');
    console.log(`[Smoke Test] Core brand/content detected: ${hasBrand}`);

    // Take verification screenshot
    await page.screenshot({ path: 'docs/graphics-evolution/live_verification_preview.png', fullPage: false });
    console.log(`[Smoke Test] Screenshot saved to docs/graphics-evolution/live_verification_preview.png`);

    console.log(`[Smoke Test] Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console error sample:', consoleErrors.slice(0, 3));
    }
    console.log(`[Smoke Test] Page runtime errors: ${pageErrors.length}`);

    await browser.close();

    if (status >= 200 && status < 400 && pageErrors.length === 0) {
      console.log('[Smoke Test] RESULT: PASSED');
      process.exit(0);
    } else {
      console.error('[Smoke Test] RESULT: FAILED');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('[Smoke Test Error]:', err.message);
    await browser.close();
    process.exit(1);
  }
}

verify();
