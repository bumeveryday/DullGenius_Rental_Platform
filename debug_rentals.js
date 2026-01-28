const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

async function debug() {
    console.log("Fetching '1%의 기적'...");
    const { data: games } = await supabase.from('games').select('id, name, game_copies(*)').ilike('name', '%1%의 기적%');
    console.log("Games Found:", JSON.stringify(games, null, 2));

    if (games && games.length > 0) {
        const gameId = games[0].id;
        console.log("Fetching Rentals for Game ID:", gameId);
        const { data: rentals } = await supabase.from('rentals').select('*').is('returned_at', null); // Active rentals?
        // Actually, let's just look at all rentals for this game (via copy_id if possible or just last few)
        const { data: allRentals } = await supabase.from('rentals').select('*').order('borrowed_at', { ascending: false }).limit(5);
        console.log("Recent Rentals:", JSON.stringify(allRentals, null, 2));
    }
}

debug();
