const { MongoClient } = require('mongodb');
const { ethers } = require('ethers');

// Connection settings
const MONGODB_URI = process.env.MONGODB_URI;
const RPC_URL = process.env.RPC_URL;
const FEED_ADDRESS = process.env.STORK_READER_ADDRESS; // Feed address configured in Vercel
const DB_NAME = 'BTC_Challenge';

// New standard for reading price (Chainlink Interface)
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

        // 1. Connect to Arbitrum network and read price
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceFeed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, provider);

        // Get latest price
        const roundData = await priceFeed.latestRoundData();
        const priceRaw = roundData.answer; // Raw price (e.g., 9800000000000)

        // Convert to decimal (8 decimal places for BTC)
        const finalPrice = parseFloat(ethers.formatUnits(priceRaw, 8));

        // 2. Save and calculate in database
        const db = await connectToDatabase();
        const challengeKey = new Date().toISOString().slice(0, 10);
        const winnersCollection = db.collection('winners');

        // Check if already calculated for today
        const existing = await winnersCollection.findOne({ _id: challengeKey });
        if (existing) {
            return res.status(200).json({
                status: 'RESOLVED',
                finalPrice: existing.finalPrice,
                message: 'Challenge already resolved for today'
            });
        }

        // Find winners
        const predictionsCollection = db.collection('predictions');
        const predictions = await predictionsCollection.find({ challengeDate: challengeKey }).toArray();

        // Calculate difference
        predictions.forEach(p => {
            p.difference = Math.abs(p.prediction - finalPrice);
        });

        // Sort and select top 3
        predictions.sort((a, b) => a.difference - b.difference);
        const topWinners = predictions.slice(0, 3).map(w => ({
            username: w.discordUsername,
            prediction: w.prediction,
            difference: w.difference
        }));

        // Save final result
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