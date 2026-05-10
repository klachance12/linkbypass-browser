const { setupPage } = require('../browser');

async function scrapeGPLinks(browser, url) {
  const page = await setupPage(browser);
  try {
    console.log(`[GPLinks] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    console.log(`[GPLinks] Waiting for Cloudflare challenge to pass...`);
    await page.waitForFunction(() => document.title !== 'Just a moment...', { timeout: 15000 });

    console.log(`[GPLinks] Checking for #go-link form...`);
    await page.waitForSelector('#go-link', { timeout: 10000 });

    // Wait 6 seconds for timer
    await new Promise(r => setTimeout(r, 6000));

    // Submit the form dynamically via page.evaluate
    const destination = await page.evaluate(async () => {
      const form = document.querySelector('#go-link');
      if (!form) return null;
      
      const formData = new URLSearchParams();
      form.querySelectorAll('input').forEach(el => {
        if (el.name && el.value) formData.append(el.name, el.value);
      });

      const action = form.getAttribute('action');
      const postUrl = action ? new URL(action, window.location.href).href : window.location.origin + '/links/go';
      
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData.toString()
      });
      const data = await res.json();
      return data.url;
    });

    if (destination && destination.startsWith('http')) {
      console.log(`[GPLinks] Successfully extracted: ${destination}`);
      return destination;
    }
    throw new Error("Failed to extract destination from GPLinks clone form.");
  } finally {
    await page.close();
  }
}

module.exports = { scrapeGPLinks };
