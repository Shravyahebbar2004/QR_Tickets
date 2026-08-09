const pool = require('./db');

async function updatePricing() {
  try {
    const res = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 1');
    const pricing = res.rows[0].custom_pricing;
    pricing.forEach(p => {
      if (p.name === '3K') {
        p.slab1 = '349';
      } else if (p.name === '5K') {
        p.slab1 = '449';
      }
    });
    await pool.query('UPDATE events SET custom_pricing = $1 WHERE event_id = 1', [JSON.stringify(pricing)]);
    console.log('Prices updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updatePricing();
