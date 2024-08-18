const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
let client;
let db;

async function connectToMongoDB() {
  console.log("Connecting to MongoDB...");
  const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  mongoose
    .connect(uri, connectionParams)
    .then(() => {
      console.log("Connected to MongoDB");
      db = mongoose.connection;
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB:", err.message);
    });
}

// Call this function once when the server starts
connectToMongoDB();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route to handle scraping
app.post("/scrape", async (req, res) => {
  const { url, pages } = req.body;

  if (!url || !pages) {
    return res
      .status(400)
      .json({ error: "URL and number of pages are required" });
  }

  let browser;

  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    const maxPages = parseInt(pages, 10);
    let currentPage = 1;
    const scrapedData = [];

    const scrapePage = async (pageNum) => {
      const pageUrl = url.replace(/page-\d+\.html$/, `page-${pageNum}.html`);
      await page.goto(pageUrl, { waitUntil: "networkidle2" });

      const data = await page.evaluate(() => {
        const scrapedPageData = [];
        document.querySelectorAll("body *").forEach((el) => {
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

    // Save to MongoDB
    const collection = db.collection("scrapedData");
    await collection.insertMany(scrapedData.map((text) => ({ text })));

    // Optionally save to file
    fs.writeFileSync("scrapedData.txt", scrapedData.join("\n"));

    // Send response
    res.status(200).json({
      message: "Scraping completed",
      data: scrapedData,
    });
  } catch (error) {
    console.error("Error scraping:", error.message);
    res.status(500).json({ error: "Scraping failed" });
  } finally {
    // Close the browser even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


