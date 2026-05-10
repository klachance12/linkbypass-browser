require('dotenv').config();
const express = require('express');
const { createBrowser } = require('./browser');
const { scrapeOuo } = require('./scrapers/ouo');
const { scrapeGPLinks } = require('./scrapers/gplinks');

const app = express();
app.use(express.json());

let browserInstance = null;

app.post('/api/bypass', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    if (!browserInstance) {
      browserInstance = await createBrowser();
    }

    let destination = null;
    const hostname = new URL(url).hostname;

    if (hostname.includes('ouo.')) {
      destination = await scrapeOuo(browserInstance, url);
    } else if (hostname.includes('shrinkme.') || hostname.includes('shrinke.')) {
      destination = await scrapeGPLinks(browserInstance, url);
    } else {
      return res.status(400).json({ error: 'Unsupported domain for browser bypass' });
    }

    res.json({ success: true, destination });
  } catch (error) {
    console.error(`[Scraper Error] ${url}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Browser microservice listening on port ${PORT}`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browserInstance) await browserInstance.close();
  process.exit();
});
