const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateMap() {
  try {
    const placeholderUrl = "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?q=80&w=1000&auto=format&fit=crop";
    
    const res = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 6');
    const pricing = res.rows[0].custom_pricing;
    pricing.forEach(p => {
        if (p.name === '3K' || p.name === '5K') {
            p.route_map_url = placeholderUrl;
        }
    });

    await pool.query(
      `UPDATE events SET custom_pricing = $1::jsonb WHERE event_id = 6`,
      [JSON.stringify(pricing)]
    );

    console.log("Successfully updated route_map_url for 3k and 5k on event_id 6 to a placeholder trail map!");
  } catch (error) {
    console.error("Error updating database:", error);
  } finally {
    pool.end();
  }
}

updateMap();
