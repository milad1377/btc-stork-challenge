// api/all-winners.js
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'BTC_Challenge';

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const client = await MongoClient.connect(MONGODB_URI);
    cachedDb = client.db(DB_NAME);
    return cachedDb;
}

module.exports = async (req, res) => {
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const db = await connectToDatabase();
        const winnersCollection = db.collection('winners');

        // Get all winners, sorted by date (newest first)
        const allWinners = await winnersCollection
            .find({})
            .sort({ _id: -1 })
            .limit(30) // Last 30 days
            .toArray();

        // Format the response
        const formattedWinners = allWinners.map(day => ({
            date: day._id,
            finalPrice: day.finalPrice,
            winners: day.topWinners,
            resolvedAt: day.resolvedAt
        }));

        res.status(200).json({
            status: 'SUCCESS',
            allWinners: formattedWinners
        });

    } catch (error) {
        console.error('Error fetching all winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners.' });
    }
};
