const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required' });
        }

        const { data: predictions, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('challenge_date', date)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const participants = predictions.map(p => ({
            username: p.discord_username,
            prediction: p.prediction,
            submissionTime: p.created_at
        }));

        res.status(200).json({
            status: 'SUCCESS',
            participants: participants
        });

    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants.' });
    }
};
