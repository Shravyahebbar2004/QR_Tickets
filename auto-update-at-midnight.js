const pool = require('./db');

async function main() {
  try {
    console.log('[1/2] Restoring current Early Bird prices and setting Normal Slab (slab2) prices...');
    const res = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 1');
    let pricing = res.rows[0].custom_pricing;

    pricing = pricing.map(p => {
      if (p.name === '3K') {
        return { ...p, slab1: '299', slab2: '349', slab3: '349' };
      }
      if (p.name === '5K') {
        return { ...p, slab1: '399', slab2: '449', slab3: '449' };
      }
      return p;
    });

    const cutoffDate = '2026-08-10T00:00:00+05:30';

    await pool.query(
      `UPDATE events SET custom_pricing = $1::jsonb, slab1_deadline = $2 WHERE event_id = 1`,
      [JSON.stringify(pricing), cutoffDate]
    );

    console.log('Database updated for current state!');
    console.log('Current state: slab1 (Early Bird) = 299/399, slab2 (Normal Slab) = 349/449');

    // Calculate time until midnight IST
    const targetMs = new Date(cutoffDate).getTime();
    const delay = Math.max(0, targetMs - Date.now());

    console.log(`Waiting ${Math.round(delay / 1000)} seconds until 12:00 AM IST...`);

    setTimeout(async () => {
      try {
        console.log('[2/2] 12:00 AM IST reached! Updating slab1 to Normal Slab prices (349 / 449)...');
        pricing = pricing.map(p => {
          if (p.name === '3K') {
            return { ...p, slab1: '349', slab2: '349', slab3: '349' };
          }
          if (p.name === '5K') {
            return { ...p, slab1: '449', slab2: '449', slab3: '449' };
          }
          return p;
        });

        await pool.query(
          `UPDATE events SET custom_pricing = $1::jsonb WHERE event_id = 1`,
          [JSON.stringify(pricing)]
        );

        console.log('🎉 Midnight price switch completed successfully at 12:00 AM IST!');
        process.exit(0);
      } catch (err) {
        console.error('Error during midnight update:', err);
        process.exit(1);
      }
    }, delay);

  } catch (err) {
    console.error('Error in script initialization:', err);
    process.exit(1);
  }
}

main();
