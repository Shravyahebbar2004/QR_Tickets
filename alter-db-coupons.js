const pool = require('./db');

async function alterDbCoupons() {
  try {
    console.log('Adding coupons column to events table...');
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS coupons JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Successfully added coupons column to events.');

    console.log('Adding coupon_code and discount_amount columns to registrations table...');
    await pool.query(`
      ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100),
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
    `);
    console.log('Successfully added coupon columns to registrations.');
  } catch (error) {
    console.error('Error altering database schema for coupons:', error);
  } finally {
    await pool.end();
  }
}

alterDbCoupons();
