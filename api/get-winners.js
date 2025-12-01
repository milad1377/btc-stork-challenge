// api/get-winners.js
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
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const db = await connectToDatabase();
        const winnersCollection = db.collection('winners');

        // Search for results for the specified date
        const result = await winnersCollection.findOne({ _id: date });

        if (!result) {
            return res.status(404).json({
                status: 'NOT_RESOLVED',
                message: 'Challenge not yet resolved for this date.'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            finalPrice: result.finalPrice,
            winners: result.topWinners, // Changed from topWinners to winners
            resolvedAt: result.resolvedAt
        });

    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners.' });
    }
};
