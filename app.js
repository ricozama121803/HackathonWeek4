const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to handle scraping
app.post('/scrape', async (req, res) => {
  const { url, pages } = req.body;

  if (!url || !pages) {
    return res.status(400).json({ error: 'URL and number of pages are required' });
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const maxPages = parseInt(pages, 10);
    let currentPage = 1;
    const scrapedData = [];

    const scrapePage = async (pageNum) => {
      const pageUrl = url.replace(/page-\d+\.html$/, `page-${pageNum}.html`);

      await page.goto(pageUrl, { waitUntil: 'networkidle2' });

      const data = await page.evaluate(() => {
        const scrapedPageData = [];
        document.querySelectorAll('body *').forEach(el => {
          const text = el.innerText.trim();
          if (text && text.length > 20 && !scrapedPageData.includes(text)) {
            scrapedPageData.push(text);
          }
        });
        return scrapedPageData;
      });

      scrapedData.push(...data);

      if (pageNum < maxPages) {
        await scrapePage(pageNum + 1);
      }
    };

    await scrapePage(currentPage);
    await browser.close();

    // Save to file
    fs.writeFileSync('scrapedData.txt', scrapedData.join('\n'));

    // Send response
    res.status(200).json({
      message: 'Scraping completed',
      data: scrapedData
    });

  } catch (error) {
    console.error('Error scraping:', error.message);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
