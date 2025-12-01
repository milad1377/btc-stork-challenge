const { MongoClient } = require('mongodb');

// گرفتن متغیر محیطی
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'BTC_Challenge';
const COLLECTION_NAME = 'predictions';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    // اگر کانکشن باز است، از همان استفاده کن
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable');
    }

    // اتصال جدید
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

module.exports = async (req, res) => {
    // حل مشکل CORS (اگر لازم شد)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { discordUsername, prediction, challengeDate } = req.body;

        if (!discordUsername || !prediction) {
            return res.status(400).json({ error: 'Missing data' });
        }

        const { db } = await connectToDatabase();
        const collection = db.collection(COLLECTION_NAME);

        await collection.insertOne({
            discordUsername,
            prediction: parseFloat(prediction),
            challengeDate,
            submissionTime: new Date()
        });

        return res.status(200).json({ success: true, message: 'Prediction saved!' });

    } catch (error) {
        console.error("Database Error:", error);
        // ارسال متن دقیق خطا برای دیباگ
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};