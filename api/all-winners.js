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
        const { data: allWinners, error } = await supabase
            .from('winners')
            .select('*')
            .order('id', { ascending: false })
            .limit(30);

        if (error) throw error;

        const formattedWinners = allWinners.map(day => ({
            date: day.id,
            finalPrice: day.final_price,
            winners: day.top_winners,
            resolvedAt: day.created_at
        }));

        res.status(200).json({
            status: 'SUCCESS',
            allWinners: formattedWinners
        });

    } catch (error) {
        console.error('Error fetching all winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners.' });
    }
};
