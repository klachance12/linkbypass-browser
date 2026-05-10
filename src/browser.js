const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function createBrowser() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--proxy-server=http://p.webshare.io:80' // Webshare Residential Proxy pool
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  return browser;
}

// Function to setup a new page with proxy auth and standard headers
async function setupPage(browser) {
  const page = await browser.newPage();
  
  // We need to use one of the residential proxy usernames (e.g. hmeibgbs-gb-1)
  // For now we'll pick a static one, or we can round-robin.
  const proxyUser = process.env.WEBSHARE_PROXY_USER || 'hmeibgbs-gb-1';
  const proxyPass = process.env.WEBSHARE_PROXY_PASS || 'z8oyewo3c5qp';
  
  await page.authenticate({
    username: proxyUser,
    password: proxyPass
  });

  await page.setViewport({ width: 1280, height: 720 });
  await page.setDefaultNavigationTimeout(30000); // 30s timeout

  return page;
}

module.exports = { createBrowser, setupPage };
