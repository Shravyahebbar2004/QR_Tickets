const pool = require('./db');

async function testQuery(rawEmailInput, rawPhoneInput, eventIdInput) {
  const rawEmail = (rawEmailInput || '').trim().toLowerCase();
  const rawPhone = (rawPhoneInput || '').replace(/\D/g, '');
  const event_id = eventIdInput;

  const phoneDigits = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

  let queryStr = `
    SELECT
      r.registration_id, r.full_name, r.email, r.phone_number, r.payment_status,
      e.title
    FROM registrations r
    JOIN events e ON r.event_id = e.event_id
    WHERE 1=1
  `;
  const queryParams = [];

  if (event_id) {
    queryParams.push(eventIdInput);
    queryStr += ` AND r.event_id = $${queryParams.length}`;
  }

  const searchConditions = [];

  if (rawEmail) {
    queryParams.push(rawEmail);
    searchConditions.push(`LOWER(TRIM(r.email)) = $${queryParams.length}`);
  }

  if (phoneDigits) {
    queryParams.push(`%${phoneDigits}`);
    searchConditions.push(`regexp_replace(r.phone_number, '\\D', '', 'g') LIKE $${queryParams.length}`);
  }

  if (searchConditions.length > 0) {
    queryStr += ` AND (${searchConditions.join(' OR ')})`;
  }

  queryStr += ` ORDER BY r.created_at DESC`;

  console.log(`\n--- Searching with Email="${rawEmailInput}", Phone="${rawPhoneInput}", EventID=${eventIdInput} ---`);
  const res = await pool.query(queryStr, queryParams);
  console.log(`Found ${res.rows.length} result(s):`, res.rows);
}

async function runTests() {
  try {
    // Test 1: Only Email
    await testQuery('shalini2216@gmail.com', '', 1);

    // Test 2: Only Phone
    await testQuery('', '8861299963', 1);

    // Test 3: Phone formatted with +91 and spaces
    await testQuery('', '+91 79046 49393', 1);

    // Test 4: Spoorthi (tab in phone)
    await testQuery('', '7338151287', 1);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

runTests();
