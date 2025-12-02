const { ethers } = require('ethers');

// Connection settings
const RPC_URL = process.env.RPC_URL;
const FEED_ADDRESS = process.env.STORK_READER_ADDRESS;

// Chainlink Interface ABI
const FEED_ABI = [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

module.exports = async (req, res) => {
    try {
        if (!RPC_URL || !FEED_ADDRESS) {
            throw new Error("Missing RPC_URL or STORK_READER_ADDRESS");
        }

        // Connect to Arbitrum network and read price
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceFeed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, provider);

        // Get latest price
        const roundData = await priceFeed.latestRoundData();
        const priceRaw = roundData.answer;

        // Convert to decimal (8 decimal places for BTC)
        const finalPrice = parseFloat(ethers.formatUnits(priceRaw, 8));

        // Get timestamp
        const updatedAt = Number(roundData.updatedAt);

        return res.status(200).json({
            success: true,
            price: finalPrice,
            updatedAt: updatedAt,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Price Fetch Error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
