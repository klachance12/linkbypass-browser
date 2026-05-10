const { createBrowser, setupPage } = require('./src/browser');
const fs = require('fs');

async function debug() {
  const browser = await createBrowser();
  const page = await setupPage(browser);
  try {
    console.log("Navigating...");
    await page.goto("https://ouo.io/jIARCJHC", { waitUntil: 'networkidle2' });
    
    console.log("Waiting for cloudflare...");
    await page.waitForFunction(() => document.title !== 'Just a moment...', { timeout: 15000 }).catch(()=>console.log("No CF"));
    
    // Wait a bit
    await new Promise(r => setTimeout(r, 5000));
    
    const html = await page.content();
    fs.writeFileSync('ouo_debug.html', html);
    await page.screenshot({ path: 'ouo_debug.png' });
    console.log("Saved ouo_debug.html and ouo_debug.png");
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
}

debug();
