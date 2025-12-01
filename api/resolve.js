const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');

// تنظیمات اتصال
const MONGODB_URI = process.env.MONGODB_URI;
const RPC_URL = process.env.RPC_URL;
const FEED_ADDRESS = process.env.STORK_READER_ADDRESS; // آدرس فید که در Vercel تنظیم کردید
const DB_NAME = 'BTC_Challenge';

// استاندارد جدید برای خواندن قیمت (Chainlink Interface)
const FEED_ABI = [
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    const client = await MongoClient.connect(MONGODB_URI);
    cachedDb = client.db(DB_NAME);
    return cachedDb;
}

module.exports = async (req, res) => {
    try {
        if (!RPC_URL || !FEED_ADDRESS) {
            throw new Error("Missing RPC_URL or STORK_READER_ADDRESS");
        }

        // 1. اتصال به شبکه Arbitrum و خواندن قیمت
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceFeed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, provider);

        // دریافت آخرین قیمت
        const roundData = await priceFeed.latestRoundData();
        const priceRaw = roundData.answer; // قیمت خام (مثلاً 9800000000000)
        
        // تبدیل به عدد اعشاری (8 رقم اعشار برای BTC)
        const finalPrice = parseFloat(ethers.formatUnits(priceRaw, 8));

        // 2. ذخیره و محاسبه در دیتابیس
        const db = await connectToDatabase();
        const challengeKey = new Date().toISOString().slice(0, 10);
        const winnersCollection = db.collection('winners');

        // بررسی اینکه آیا قبلاً برای امروز محاسبه شده؟
        const existing = await winnersCollection.findOne({ _id: challengeKey });
        if (existing) {
            return res.status(200).json({ 
                status: 'RESOLVED', 
                finalPrice: existing.finalPrice,
                message: 'Challenge already resolved for today'
            });
        }

        // پیدا کردن برندگان
        const predictionsCollection = db.collection('predictions');
        const predictions = await predictionsCollection.find({ challengeDate: challengeKey }).toArray();

        // محاسبه اختلاف
        predictions.forEach(p => {
            p.difference = Math.abs(p.prediction - finalPrice);
        });

        // مرتب‌سازی و انتخاب 3 نفر اول
        predictions.sort((a, b) => a.difference - b.difference);
        const topWinners = predictions.slice(0, 3).map(w => ({
            discordUsername: w.discordUsername,
            prediction: w.prediction,
            difference: w.difference
        }));

        // ذخیره نتیجه نهایی
        await winnersCollection.insertOne({
            _id: challengeKey,
            finalPrice: finalPrice,
            topWinners: topWinners,
            resolvedAt: new Date()
        });

        return res.status(200).json({ 
            status: 'SUCCESS', 
            finalPrice, 
            winners: topWinners 
        });

    } catch (error) {
        console.error("Resolution Error:", error);
        return res.status(500).json({ error: error.message, stack: error.stack });
    }
};