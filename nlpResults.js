// Simulate fetching scraped data
async function fetchScrapedData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                scrapedData: [
                    {text: "Sample text 1"},
                    {text: "Sample text 2"},
                    {text: "Sample text 3"}
                ]
            });
        }, 1000);
    });
}

// Simulate fetching NLP processed data
async function fetchNLPData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                nlpProcessedData: [
                    {text: "Processed text 1"},
                    {text: "Processed text 2"},
                    {text: "Processed text 3"}
                ]
            });
        }, 1000);
    });
}

// Example usage
fetchScrapedData().then(data => {
    console.log(data.scrapedData); // Display or use scraped data in your UI
});

fetchNLPData().then(data => {
    console.log(data.nlpProcessedData); // Display or use NLP processed data in your UI
});

