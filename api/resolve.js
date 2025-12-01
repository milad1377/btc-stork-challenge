// api/resolve.js
const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');

// --- پارامترهای Stork و MongoDB (از متغیرهای محیطی Vercel) ---
const BTC_FEED_KEY = '0x7404e3d104ea7841c3d9e6fd20adfe99b4ad586bc08d8f3bd3afef894cf184de';
const RPC_URL = process.env.RPC_URL;
const STORK_READER_ADDRESS = process.env.STORK_READER_ADDRESS;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'BTC_Challenge';
const STORK_READER_ABI = ["function getLatestPrice(bytes32 feedId) view returns (uint256 price, uint256 timestamp)"];

let cachedDb = null;
let isResolving = false;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const client = await MongoClient.connect(MONGODB_URI);
    cachedDb = client.db(DB_NAME);
    return cachedDb;
}

module.exports = async (req, res) => {
    // تاریخ چالش: دسامبر ۱، ۲۰۲۵ در ۱۲:۰۰ UTC
    const challengeDateString = '2025-12-01T12:00:00Z';
    const deadlineUTC = new Date(challengeDateString);
    const challengeKey = deadlineUTC.toISOString().slice(0, 10);
    const now = new Date();

    // اگر هنوز زمان چالش نرسیده یا در حال حل است، متوقف شود.
    if (now < deadlineUTC || isResolving) {
        return res.status(200).json({ status: 'WAITING', message: 'Not yet time or already resolving.' });
    }

    const db = await connectToDatabase();
    const winnersCollection = db.collection('winners');

    // ۱. بررسی اینکه آیا قبلاً حل شده است؟
    const resolved = await winnersCollection.findOne({ _id: challengeKey });
    if (resolved) {
        return res.status(200).json({ status: 'RESOLVED', message: 'Challenge already resolved.', finalPrice: resolved.finalPrice });
    }

    isResolving = true;
    try {
        // ۲. اتصال به Stork Oracle و خواندن قیمت
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const priceReader = new ethers.Contract(STORK_READER_ADDRESS, STORK_READER_ABI, provider);

        const [priceRaw] = await priceReader.getLatestPrice(BTC_FEED_KEY);
        const finalPrice = parseFloat(ethers.utils.formatUnits(priceRaw, 8));

        // ۳. محاسبه برندگان (بقیه منطق)
        const predictionsCollection = db.collection('predictions');
        const predictions = await predictionsCollection.find({ challengeDate: challengeKey }).toArray();

        predictions.forEach(p => { p.difference = Math.abs(p.prediction - finalPrice); });

        predictions.sort((a, b) => a.difference - b.difference);
        const topWinners = predictions.slice(0, 3);

        // ۴. ذخیره نتایج
        await winnersCollection.insertOne({
            _id: challengeKey,
            finalPrice: finalPrice,
            topWinners: topWinners.map(w => ({
                discordUsername: w.discordUsername,
                prediction: w.prediction,
                difference: w.difference
            })),
            resolvedAt: new Date()
        });

        isResolving = false;
        res.status(200).json({ status: 'SUCCESS', finalPrice, winners: topWinners });

    } catch (error) {
        isResolving = false;
        console.error("STORK RESOLUTION ERROR:", error);
        res.status(500).json({ status: 'ERROR', error: 'Failed to resolve challenge.' });
    }
};