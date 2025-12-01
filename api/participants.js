// api/participants.js
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'BTC_Challenge';
const COLLECTION_NAME = 'predictions';

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
        const collection = db.collection(COLLECTION_NAME);

        // Find all participants for the specified date
        const participants = await collection
            .find({ challengeDate: date })
            .sort({ submissionTime: 1 }) // Sort by submission time (oldest first)
            .toArray();

        // Format the response
        const formattedParticipants = participants.map(p => ({
            username: p.discordUsername,
            prediction: p.prediction,
            submittedAt: p.submissionTime
        }));

        res.status(200).json({
            status: 'SUCCESS',
            participants: formattedParticipants,
            count: formattedParticipants.length
        });

    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants.' });
    }
};
