const pool = require('./db');

async function closeFlashSale() {
  try {
    const res = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 1');
    if (res.rows.length === 0) {
      console.error('Event 1 not found');
      process.exit(1);
    }

    let pricing = res.rows[0].custom_pricing;
    console.log('Original pricing config:', JSON.stringify(pricing, null, 2));

    if (typeof pricing === 'string') {
      pricing = JSON.parse(pricing);
    }

    if (pricing && pricing.flash_sale) {
      pricing.flash_sale.enabled = false;
    } else if (pricing) {
      pricing.flash_sale = {
        enabled: false,
        price: "249",
        threshold: "50",
        deadline: ""
      };
    }

    await pool.query(
      'UPDATE events SET custom_pricing = $1::jsonb WHERE event_id = 1',
      [JSON.stringify(pricing)]
    );

    console.log('Successfully disabled flash sale and activated Early Bird slab!');

    const updatedRes = await pool.query('SELECT custom_pricing FROM events WHERE event_id = 1');
    console.log('Updated pricing config:', JSON.stringify(updatedRes.rows[0].custom_pricing, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error updating pricing:', err);
    process.exit(1);
  }
}

closeFlashSale();
