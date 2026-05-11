const { setupPage } = require('../browser');

async function scrapeRewardz(browser, url) {
  const page = await setupPage(browser);
  try {
    console.log(`[Rewardz] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Inject a hook to catch the /verify POST request or just wait for it
    console.log(`[Rewardz] Waiting for Javascript to run and verify...`);

    // The script on the page calls navigator.sendBeacon('/verify') or fetch('/verify')
    // and then redirects the window via window.location.href.
    // We can just wait for a navigation that leaves the domain!
    
    // First, let's see if the page has a button we need to click
    try {
      const btnSelector = 'a.btn, button.btn, .continue-button';
      await page.waitForSelector(btnSelector, { timeout: 3000 });
      console.log(`[Rewardz] Found a continue button, clicking it...`);
      await page.click(btnSelector);
    } catch(e) {
      // No button, maybe it runs automatically
    }

    try {
      console.log(`[Rewardz] Waiting for redirect...`);
      await page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });
      const currentUrl = page.url();
      if (!currentUrl.includes('depravityweb.co') && !currentUrl.includes('best-links.org')) {
        return currentUrl;
      }
    } catch(e) {
      console.log(`[Rewardz] No automatic redirect. Trying to trigger verify manually.`);
      // Sometimes we can just call document.verify() if it's exposed
      const manualDest = await page.evaluate(async () => {
        if (typeof document.verify === 'function') {
          document.verify();
          // wait 2 seconds
          await new Promise(r => setTimeout(r, 2000));
          return window.location.href;
        }
        return null;
      });

      if (manualDest && !manualDest.includes('depravityweb.co')) {
        return manualDest;
      }
    }

    // Check if it's the specific "Task" wall
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("subscribe") || bodyText.includes("follow") || bodyText.includes("complete tasks")) {
       throw new Error("This link requires manual task completion (subscribe/follow) that cannot be fully automated yet.");
    }

    throw new Error('Failed to extract Rewardz destination');
  } finally {
    await page.close();
  }
}

module.exports = { scrapeRewardz };
