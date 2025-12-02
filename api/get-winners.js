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

        const { data: result, error } = await supabase
            .from('winners')
            .select('*')
            .eq('id', date)
            .single();

        if (error || !result) {
            return res.status(404).json({
                status: 'NOT_RESOLVED',
                message: 'Challenge not yet resolved for this date.'
            });
        }

        res.status(200).json({
            status: 'SUCCESS',
            finalPrice: result.final_price,
            winners: result.top_winners,
            resolvedAt: result.created_at
        });

    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners.' });
    }
};
