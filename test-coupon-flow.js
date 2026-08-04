const pool = require('./db');

async function testCouponFlow() {
  try {
    console.log('--- Testing Coupon Flow ---');

    // 1. Fetch any existing event ID
    const eventRes = await pool.query('SELECT event_id, title FROM events LIMIT 1');
    if (eventRes.rows.length === 0) {
      console.log('No events found to test.');
      return;
    }

    const testEventId = eventRes.rows[0].event_id;
    console.log(`Using Event ID: ${testEventId} (${eventRes.rows[0].title})`);

    // 2. Set test coupon on event
    const sampleCoupons = [
      { code: 'YRCRCY', price: 199, max_uses: 100, used_count: 0 }
    ];

    await pool.query(
      `UPDATE events SET coupons = $1::jsonb WHERE event_id = $2`,
      [JSON.stringify(sampleCoupons), testEventId]
    );
    console.log('Sample coupon YRCRCY (Price: 199, Max: 100) attached to event.');

    // 3. Verify event fetch returns coupons
    const fetchRes = await pool.query('SELECT coupons FROM events WHERE event_id = $1', [testEventId]);
    console.log('Fetched Coupons:', fetchRes.rows[0].coupons);

    // 4. Test coupon logic
    const coupons = fetchRes.rows[0].coupons;
    const testCode = 'YRCRCY';
    const match = coupons.find(c => c.code === testCode);

    if (match && match.used_count < match.max_uses) {
      console.log(`Coupon ${testCode} is valid! Price override: ₹${match.price}`);
    } else {
      console.error('Coupon validation failed!');
    }

    console.log('--- Coupon Flow Verification Successful ---');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await pool.end();
  }
}

testCouponFlow();
