const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');

// Supabase settings
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Blockchain settings (same Chainlink address as before)
const RPC_URL = process.env.RPC_URL;
const FEED_ADDRESS = process.env.STORK_READER_ADDRESS;
const FEED_ABI = [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

module.exports = async (req, res) => {
    try {
        // 1. Read price from blockchain
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const priceFeed = new ethers.Contract(FEED_ADDRESS, FEED_ABI, provider);
        const roundData = await priceFeed.latestRoundData();
        const finalPrice = parseFloat(ethers.formatUnits(roundData.answer, 8));

        // 2. Check if already calculated
        const challengeKey = new Date().toISOString().slice(0, 10);

        const { data: existing } = await supabase
            .from('winners')
            .select('*')
            .eq('id', challengeKey)
            .single();

        if (existing) {
            return res.status(200).json({ status: 'RESOLVED', finalPrice: existing.final_price });
        }

        // 3. Get predictions from Supabase
        const { data: predictions, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('challenge_date', challengeKey);

        if (error) throw error;

        // 4. Calculate differences
        const results = predictions.map(p => ({
            discordUsername: p.discord_username,
            prediction: p.prediction,
            difference: Math.abs(p.prediction - finalPrice)
        }));

        // api/resolve.js

// ... (حدود خط 53 در تابع module.exports)

// منطق جدید مرتب‌سازی دو مرحله‌ای: اول اختلاف، دوم زمان ثبت (Submission Time)
results.sort((a, b) => {
    // مرحله 1: اگر اختلاف متفاوت بود، بر اساس کمترین اختلاف مرتب کن.
    if (a.difference !== b.difference) {
        return a.difference - b.difference;
    }

    // مرحله 2: اگر اختلاف برابر بود (مثلاً هر دو صفر)، بر اساس زمان ثبت مرتب کن.
    // زمان ثبت در Supabase به نام created_at است.
    const timeA = new Date(a.submissionTime).getTime(); // زمان ثبت رکورد A
    const timeB = new Date(b.submissionTime).getTime(); // زمان ثبت رکورد B

    // زمان قدیمی‌تر (عدد کمتر) باید اول بیاید.
    return timeA - timeB;
});

const topWinners = results.slice(0, 3); // انتخاب ۳ نفر اول
// ...
        // 5. Save winners
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