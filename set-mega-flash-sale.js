const pool = require('./db');

async function setMegaFlashSale() {
  try {
    const res = await pool.query('SELECT event_id, title, custom_pricing FROM events WHERE event_id = 1');
    if (res.rows.length === 0) {
      console.error('Event 1 not found');
      process.exit(1);
    }

    let pricing = res.rows[0].custom_pricing;
    if (typeof pricing === 'string') {
      pricing = JSON.parse(pricing);
    }

    console.log('Current pricing before update:', JSON.stringify(pricing, null, 2));

    // Configure Mega Flash Sale
    pricing.mega_flash = {
      name: "⚡ Mega Flash Sale",
      price: "339",
      max_tickets: 5,
      enabled: true,
      start_time: "2026-10-28T11:59:00+05:30",
      end_time: "2026-10-28T17:00:00+05:30"
    };

    // Ensure normal slab (slab2) remains intact with correct prices
    if (!pricing.slab2) {
      pricing.slab2 = {
        name: "Slab 1",
        enabled: true,
        threshold: "300",
        price_1_4: "389",
        price_5_9: "359",
        price_10_plus: "339",
        deadline: ""
      };
    } else {
      pricing.slab2.name = "Slab 1";
      pricing.slab2.enabled = true;
      pricing.slab2.price_1_4 = "389";
      pricing.slab2.price_5_9 = "359";
      pricing.slab2.price_10_plus = "339";
    }

    await pool.query(
      `UPDATE events 
       SET custom_pricing = $1::jsonb
       WHERE event_id = 1`,
      [JSON.stringify(pricing)]
    );

    console.log('✅ Successfully configured Mega Flash Sale in Neon DB for Event 1!');

    const updatedRes = await pool.query('SELECT event_id, title, custom_pricing FROM events WHERE event_id = 1');
    console.log('Updated pricing config:', JSON.stringify(updatedRes.rows[0].custom_pricing, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error updating pricing:', err);
    process.exit(1);
  }
}

setMegaFlashSale();
