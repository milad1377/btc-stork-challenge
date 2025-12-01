const { MongoClient } = require('mongodb');
const { ethers } = require('ethers'); // نسخه 6

const BTC_FEED_KEY = '0x7404e3d104ea7841c3d9e6fd20adfe99b4ad586bc08d8f3bd3afef894cf184de';
// ABI برای خواندن قیمت (استاندارد Stork)
const STORK_READER_ABI = [
  "function getLatestPrice(bytes32 feedId) view returns (uint256 price, uint256 timestamp)"
];

const MONGODB_URI = process.env.MONGODB_URI;
const RPC_URL = process.env.RPC_URL;
const STORK_READER_ADDRESS = process.env.STORK_READER_ADDRESS;
const DB_NAME = 'BTC_Challenge';

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;
    if (!MONGODB_URI) throw new Error("MONGODB_URI missing");
    
    const client = await MongoClient.connect(MONGODB_URI);
    cachedDb = client.db(DB_NAME);
    return cachedDb;
}

module.exports = async (req, res) => {
    try {
        // بررسی متغیرها
        if (!RPC_URL || !STORK_READER_ADDRESS) {
            throw new Error("Missing RPC_URL or STORK_READER_ADDRESS");
        }

        // 1. اتصال به Stork (سینتکس Ethers v6)
        // تغییر مهم: حذف .providers
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceReader = new ethers.Contract(STORK_READER_ADDRESS, STORK_READER_ABI, provider);

        // خواندن قیمت
        const result = await priceReader.getLatestPrice(BTC_FEED_KEY);
        // نتیجه آرایه است: [price, timestamp]
        const priceRaw = result[0]; 
        
        // تغییر مهم: formatUnits مستقیم در ethers است
        const finalPrice = parseFloat(ethers.formatUnits(priceRaw, 8));

        // 2. اتصال به دیتابیس
        const db = await connectToDatabase();
        const challengeKey = new Date().toISOString().slice(0, 10);
        
        // ... (ادامه منطق محاسبه برنده - ثابت است) ...
        // برای تست سریع فعلا قیمت را برمی‌گردانیم
        return res.status(200).json({ 
            status: 'SUCCESS', 
            finalPrice, 
            message: 'Price fetched successfully' 
        });

    } catch (error) {
        console.error("Resolution Error:", error);
        return res.status(500).json({ error: error.message });
    }
};