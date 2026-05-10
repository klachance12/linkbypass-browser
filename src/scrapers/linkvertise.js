const { setupPage } = require('../browser');

/**
 * Linkvertise Puppeteer Scraper
 */
async function scrapeLinkvertise(browser, url) {
  const page = await setupPage(browser);
  
  // Anti-bot evasions
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    console.log(`[Linkvertise] Navigating to ${url}`);
    
    // We go to the URL and wait until the network is mostly idle (to let Cloudflare load)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Step 1: Check for __NEXT_DATA__ payload which often contains the destination
    const nextData = await page.evaluate(() => {
      const script = document.getElementById('__NEXT_DATA__');
      return script ? JSON.parse(script.innerHTML) : null;
    });

    if (nextData) {
      // Linkvertise sometimes stores the target URL in the page props
      try {
        const target = nextData.props?.pageProps?.page?.link?.target_url || 
                       nextData.props?.pageProps?.link?.url;
        if (target) {
          console.log(`[Linkvertise] Found target in NEXT_DATA: ${target}`);
          await page.close();
          return target;
        }
      } catch (e) {
        console.log(`[Linkvertise] Could not parse NEXT_DATA target`);
      }
    }

    // Step 2: Try to find and click the "Free Access" button if it exists
    try {
      const freeButton = await page.$('.free-access-button, button:contains("Free Access"), a:contains("Free Access")');
      if (freeButton) {
        console.log(`[Linkvertise] Found Free Access button, clicking...`);
        await freeButton.click();
        
        // Wait for potential tasks window
        await page.waitForTimeout(2000);
        
        // Sometimes clicking it immediately resolves the link
        const currentUrl = page.url();
        if (!currentUrl.includes('linkvertise.com') && !currentUrl.includes('link-to.net')) {
          await page.close();
          return currentUrl;
        }
      }
    } catch (e) {
      console.log(`[Linkvertise] No Free Access button found or error clicking it.`);
    }

    // Step 3: Wait for a redirect away from Linkvertise
    console.log(`[Linkvertise] Waiting for potential auto-redirect...`);
    try {
      await page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });
      const finalUrl = page.url();
      if (!finalUrl.includes('linkvertise.com') && !finalUrl.includes('link-to.net')) {
        await page.close();
        return finalUrl;
      }
    } catch (e) {
      console.log(`[Linkvertise] No auto-redirect occurred.`);
    }

    // Step 4: Final fallback, check if there's any external link on the page that looks like the target
    const externalLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href && href.startsWith('http') && !href.includes('linkvertise') && !href.includes('link-to'));
    });

    if (externalLinks.length > 0) {
      console.log(`[Linkvertise] Falling back to found external link: ${externalLinks[0]}`);
      await page.close();
      return externalLinks[0];
    }

    throw new Error('Could not bypass Linkvertise. The protection may have updated.');
  } catch (error) {
    if (!page.isClosed()) {
      await page.close();
    }
    throw error;
  }
}

module.exports = { scrapeLinkvertise };
