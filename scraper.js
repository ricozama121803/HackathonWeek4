const puppeteer = require('puppeteer');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the URL of the first page you want to scrape: ', async (inputUrl) => {
  rl.question('Enter the number of pages you want to scrape: ', async (inputMaxPages) => {
    const maxPages = parseInt(inputMaxPages, 10);
    let currentPage = 1;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const scrapePage = async (pageNum) => {
      const url = inputUrl.replace(/page-\d+\.html$/, `page-${pageNum}.html`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const data = await page.evaluate(() => {
          const scrapedData = [];
          document.querySelectorAll('body *').forEach(el => {
            const text = el.innerText.trim();
            if (text && text.length > 20 && !scrapedData.includes(text)) {
              scrapedData.push(text);
            }
          });
          return scrapedData;
        });

        if (data.length > 0) {
          console.log(`\nScraped Data from Page ${pageNum}:\n`);
          data.forEach((item, index) => {
            console.log(`Item ${index + 1}: ${item}\n`);
          });

          fs.appendFileSync('scrapedData.txt', `Page ${pageNum}:\n${data.join('\n')}\n\n`);

          if (pageNum < maxPages) {
            await scrapePage(pageNum + 1);
          } else {
            console.log('Scraping completed. Data saved to scrapedData.txt');
            await browser.close();
            rl.close();
          }
        } else {
          console.log('No relevant data found on this page.');
          await browser.close();
          rl.close();
        }
      } catch (error) {
        console.error(`Error fetching page ${pageNum}:`, error.message);
        await browser.close();
        rl.close();
      }
    };

    await scrapePage(currentPage);
  });
});
