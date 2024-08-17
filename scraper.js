const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter the URL of the first page you want to scrape: ', (inputUrl) => {
  rl.question('Enter the number of pages you want to scrape: ', (inputMaxPages) => {
    const maxPages = parseInt(inputMaxPages, 10);
    let currentPage = 1;

    const scrapePage = (page) => {
      const url = inputUrl.replace(/page-\d+\.html$/, `page-${page}.html`);

      axios(url)
        .then(response => {
          const html = response.data;
          const $ = cheerio.load(html);

          const data = [];

          $('body *').each((i, el) => {
            const text = $(el).text().trim();

            // Filter out very short text or irrelevant content
            if (text && text.length > 20 && !data.includes(text)) {
              data.push(text);
            }
          });

          if (data.length > 0) {
            console.log(`\nScraped Data from Page ${page}:\n`);
            data.forEach((item, index) => {
              console.log(`Item ${index + 1}: ${item}\n`);
            });

            fs.appendFileSync('scrapedData.txt', `Page ${page}:\n${data.join('\n')}\n\n`);

            if (page < maxPages) {
              scrapePage(page + 1);
            } else {
              console.log('Scraping completed. Data saved to scrapedData.txt');
              rl.close();
            }
          } else {
            console.log('No relevant data found on this page.');
            rl.close();
          }
        })
        .catch(error => {
          console.error(`Error fetching page ${page}:`, error.message);
          rl.close();
        });
    };

    scrapePage(currentPage);
  });
});
