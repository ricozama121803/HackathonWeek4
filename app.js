const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI || "mongodb+srv://srimanp201:JJh5HCRL5qHaXiGO@hackathondb.ev7rc.mongodb.net/?retryWrites=true&w=majority&appName=HackathonDB"; // Replace with your connection string
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  tls: false, // Disable TLS
  ssl: false  // Disable SSL
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}

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
    await connectToMongoDB();
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

    // Save to MongoDB
    const db = client.db('HackathonDB'); // Replace 'HackathonDB' with your actual database name
    const collection = db.collection('scrapedData'); // Replace 'scrapedData' with your desired collection name

    await collection.insertMany(scrapedData.map(text => ({ text })));

    // Optionally save to file
    fs.writeFileSync('scrapedData.txt', scrapedData.join('\n'));

    // Send response
    res.status(200).json({
      message: 'Scraping completed',
      data: scrapedData
    });

  } catch (error) {
    console.error('Error scraping:', error.message);
    res.status(500).json({ error: 'Scraping failed' });
  } finally {
    // Ensure MongoDB client is closed after operation
    await client.close();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
