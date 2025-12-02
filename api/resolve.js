const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// تنظیمات Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// تنظیمات بلاکچین (از مرحله قبل ثابت مانده)
const RPC_URL = process.env.RPC_URL;
const FEED_ADDRESS = process.env.STORK_READER_ADDRESS; // همان آدرس Chainlink که دادم
const FEED_ABI = [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

module.exports = async (req, res) => {
    try {
        // 1. خواندن قیمت از بلاکچین
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceFeed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, provider);
        const roundData = await priceFeed.latestRoundData();
        const finalPrice = parseFloat(ethers.formatUnits(roundData.answer, 8));

        // 2. چک کردن اینکه آیا قبلا محاسبه شده؟
        const challengeKey = new Date().toISOString().slice(0, 10);

        const { data: existing } = await supabase
            .from('winners')
            .select('*')
            .eq('id', challengeKey)
            .single();

        if (existing) {
            return res.status(200).json({ status: 'RESOLVED', finalPrice: existing.final_price });
        }

        // 3. گرفتن پیش‌بینی‌ها از Supabase
        const { data: predictions, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('challenge_date', challengeKey);

        if (error) throw error;

        // 4. محاسبه ریاضی
        const results = predictions.map(p => ({
            discordUsername: p.discord_username,
            prediction: p.prediction,
            difference: Math.abs(p.prediction - finalPrice)
        }));

        results.sort((a, b) => a.difference - b.difference);
        const topWinners = results.slice(0, 3);

        // 5. ذخیره برندگان
        const { error: insertError } = await supabase
            .from('winners')
            .insert([{
                id: challengeKey,
                final_price: finalPrice,
                top_winners: topWinners
            }]);

        if (insertError) throw insertError;

        return res.status(200).json({ status: 'SUCCESS', finalPrice, winners: topWinners });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};