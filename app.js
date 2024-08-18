const express = require("express");
const path = require("path");
const puppeteer = require("puppeteer");
const fs = require("fs");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
const { NlpManager } = require("node-nlp");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// MongoDB connection
const uri = process.env.MONGODB_URI;
let client;
let db;

// NLP Manager instance
const nlp = new NlpManager({ languages: ["en"] });

// Connect to MongoDB
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

// Function to initialize NLP model
async function initializeNLP() {
  await nlp.train();
  console.log("NLP Model trained");
}

function preprocessText(text) {
  text = text.toLowerCase();

  text = text.replace(/[^a-z\s]/g, "");

  let tokens = text.split(/\s+/);

  const stopwords = ["the", "is", "in", "and", "to", "with", "a", "of", "for"];
  tokens = tokens.filter((token) => !stopwords.includes(token));

  return tokens.join(" ");
}
function extractKeywords(text) {
  text = text.toLowerCase().replace(/[^a-z\s]/g, "");

  let tokens = text.split(/\s+/);

  const stopwords = ["the", "is", "in", "and", "to", "with", "a", "of", "for"];
  tokens = tokens.filter((token) => !stopwords.includes(token));

  const frequency = {};
  tokens.forEach((token) => {
    frequency[token] = (frequency[token] || 0) + 1;
  });

  const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 5).map((entry) => entry[0]);
}

// Initialize the server and MongoDB
async function startServer() {
  await connectToMongoDB();
  await initializeNLP(); // Train the NLP model before handling requests

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Call the start function to begin server and initialize MongoDB & NLP model
startServer();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Route to handle scraping
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

    // Process the scraped data with preprocessing and the NLP model
    const nlpProcessedData = [];
    for (const text of scrapedData) {
      const preprocessedText = preprocessText(text);
      const keywords = extractKeywords(text);
      const response = await nlp.process("en", preprocessedText);
      nlpProcessedData.push({
        originalText: text, // Store original text
        preprocessedText: preprocessedText, // Store preprocessed text
        sentiment: response.sentiment, // NLP sentiment analysis
        entities: response.entities, // Named entities
        keywords: keywords, // Extracted keywords
      });
    }

    // Save NLP processed data to MongoDB
    const collection = db.collection("nlpProcessedData");
    await collection.insertMany(nlpProcessedData);

    fs.writeFileSync(
      "nlpProcessedData.json",
      JSON.stringify(nlpProcessedData, null, 2)
    );

    // Send response
    res.status(200).json({
      message: "Scraping and NLP processing completed",
      data: nlpProcessedData,
    });
  } catch (error) {
    console.error("Error scraping and processing NLP:", error.message);
    res.status(500).json({ error: "Scraping or NLP processing failed" });
  } finally {
    // Close the browser even if an error occurs
    if (browser) {
      await browser.close();
    }
  }
});

// Route to retrieve scraped data
app.get("/data/scraped", async (req, res) => {
  try {
    const collection = db.collection("scrapedData");
    const scrapedData = await collection.find({}).toArray();
    res.status(200).json({ scrapedData });
  } catch (error) {
    console.error("Error retrieving scraped data:", error.message);
    res.status(500).json({ error: "Failed to retrieve scraped data" });
  }
});

// Route to retrieve NLP processed data
app.get("/data/nlp", async (req, res) => {
  try {
    const collection = db.collection("nlpProcessedData");
    const nlpProcessedData = await collection.find({}).toArray();
    res.status(200).json({ nlpProcessedData });
  } catch (error) {
    console.error("Error retrieving NLP processed data:", error.message);
    res.status(500).json({ error: "Failed to retrieve NLP processed data" });
  }
});
