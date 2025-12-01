// api/submit.js
const { MongoClient } = require('mongodb');

// این متغیر در تنظیمات Vercel تعریف می‌شود
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'BTC_Challenge';
const COLLECTION_NAME = 'predictions';

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;

    // به سرور MongoDB Atlas متصل شوید
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
}

module.exports = async (req, res) => {
    // توابع Vercel به طور پیش‌فرض درخواست‌های GET را می‌پذیرند، 
    // اما برای ارسال داده از POST استفاده می‌کنیم.
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { discordUsername, prediction, challengeDate } = req.body;

        if (!discordUsername || typeof prediction !== 'number') {
            return res.status(400).send('Invalid data');
        }

        const db = await connectToDatabase();
        const collection = db.collection(COLLECTION_NAME);

        await collection.insertOne({
            discordUsername,
            prediction,
            challengeDate,
            submissionTime: new Date()
        });

        res.status(200).json({ success: true, message: 'Prediction submitted successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit prediction.' });
    }
};