const { createClient } = require('@supabase/supabase-js');

// اتصال به Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    // حل مشکل CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { discordUsername, prediction, challengeDate } = req.body;

        if (!discordUsername || !prediction) {
            return res.status(400).json({ error: 'اطلاعات ناقص است' });
        }

        // درج در Supabase
        const { data, error } = await supabase
            .from('predictions')
            .insert([
                {
                    discord_username: discordUsername,
                    prediction: parseFloat(prediction),
                    challenge_date: challengeDate
                }
            ]);

        if (error) throw error;

        return res.status(200).json({ success: true, message: 'پیش‌بینی با موفقیت ثبت شد!' });

    } catch (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ error: error.message });
    }
};