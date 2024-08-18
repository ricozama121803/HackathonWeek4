const { MongoClient, ServerApiVersion } = require('mongodb');

// Replace <password> with your actual MongoDB password
const uri = "mongodb+srv://srimanp201:<password>@hackathondb.ev7rc.mongodb.net/?retryWrites=true&w=majority&appName=HackathonDB";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function connectToDatabase() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        // Return the client for use in other parts of your application
        return client;
    } catch (err) {
        console.error("Failed to connect to MongoDB", err);
    }
}

module.exports = connectToDatabase;
