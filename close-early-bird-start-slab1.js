const pool = require('./db');

async function closeEarlyBirdAndStartSlab1() {
  try {
    const res = await pool.query('SELECT event_id, title, custom_pricing, slab1_deadline FROM events WHERE event_id = 1');
    if (res.rows.length === 0) {
      console.error('Event 1 not found');
      process.exit(1);
    }

    let pricing = res.rows[0].custom_pricing;
    console.log('Original pricing config:', JSON.stringify(pricing, null, 2));

    if (typeof pricing === 'string') {
      pricing = JSON.parse(pricing);
    }

    // 1. Ensure flash sale remains closed
    if (pricing.flash_sale) {
      pricing.flash_sale.enabled = false;
    }

    // 2. Close Early Bird (slab1)
    if (pricing.slab1) {
      pricing.slab1.enabled = false;
      pricing.slab1.closed_at = new Date().toISOString();
    }

    // 3. Start Slab 1 (stored as slab2)
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
      pricing.slab2.price_1_4 = pricing.slab2.price_1_4 || "389";
      pricing.slab2.price_5_9 = pricing.slab2.price_5_9 || "359";
      pricing.slab2.price_10_plus = pricing.slab2.price_10_plus || "339";
    }

    const nowIso = new Date().toISOString();

    await pool.query(
      `UPDATE events 
       SET custom_pricing = $1::jsonb,
           slab1_deadline = $2
       WHERE event_id = 1`,
      [JSON.stringify(pricing), nowIso]
    );

    console.log('✅ Successfully closed Early Bird and activated Slab 1 in database!');

    const updatedRes = await pool.query('SELECT event_id, title, custom_pricing, slab1_deadline FROM events WHERE event_id = 1');
    console.log('Updated pricing config:', JSON.stringify(updatedRes.rows[0], null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error updating pricing:', err);
    process.exit(1);
  }
}

closeEarlyBirdAndStartSlab1();
