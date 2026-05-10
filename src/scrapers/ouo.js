const { setupPage } = require('../browser');

async function scrapeOuo(browser, url) {
  const page = await setupPage(browser);
  try {
    console.log(`[ouo.io] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for Cloudflare to pass
    console.log(`[ouo.io] Waiting for Cloudflare challenge to pass...`);
    await page.waitForFunction(() => document.title !== 'Just a moment...', { timeout: 15000 });

    // Look for the "I am a human" button or the main form
    const btnSelector = '#btn-main'; // Ouo.io uses #btn-main
    try {
      await page.waitForSelector(btnSelector, { timeout: 5000, visible: true });
      console.log(`[ouo.io] Found main button, clicking...`);
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        page.click(btnSelector)
      ]);
    } catch (e) {
      console.log(`[ouo.io] No first button found, maybe already on second page.`);
    }

    // Now on the second page, wait for the Get Link button
    console.log(`[ouo.io] Waiting for Get Link button...`);
    await page.waitForSelector('#btn-main', { timeout: 10000, visible: true });
    
    // The button takes a few seconds to activate on ouo.io
    await new Promise(r => setTimeout(r, 4000));
    
    console.log(`[ouo.io] Clicking final Get Link button...`);
    // Ouo.io's second button is a form submit that redirects
    
    // Intercept requests to catch the final destination
    let finalDestination = null;
    page.on('response', async (res) => {
      if ([301, 302, 303, 307, 308].includes(res.status())) {
        const loc = res.headers().location;
        if (loc && !loc.includes('ouo.io')) {
          finalDestination = loc;
        }
      }
    });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {}),
      page.click('#btn-main')
    ]);

    if (finalDestination) return finalDestination;

    // Fallback if no redirect was caught
    const currentUrl = page.url();
    if (!currentUrl.includes('ouo.io')) return currentUrl;

    throw new Error('Failed to extract ouo destination');
  } finally {
    await page.close();
  }
}

module.exports = { scrapeOuo };
