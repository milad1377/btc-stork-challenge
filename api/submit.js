const { createClient } = require('@supabase/supabase-js');

// Connect to Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    // Handle CORS
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

        if (!discordUsername || !prediction || !challengeDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check for duplicate username on the same day
        const { data: existingUsers, error: checkError } = await supabase
            .from('predictions')
            .select('discord_username')
            .eq('discord_username', discordUsername)
            .eq('challenge_date', challengeDate);

        if (checkError) {
            console.error('Check error:', checkError);
            throw checkError;
        }

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({
                error: 'This username has already participated in this challenge'
            });
        }

        // Insert into Supabase
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

        return res.status(200).json({ success: true, message: 'Prediction submitted successfully!' });

    } catch (error) {
        console.error("Supabase Error:", error);
        return res.status(500).json({ error: error.message });
    }
};