const pool = require('./db');

async function auditRegistrations() {
  try {
    console.log("=== COMPREHENSIVE REGISTRATION & EMAIL AUDIT ===");

    // 1. Overall counts by status
    const statusCounts = await pool.query(
      `SELECT payment_status, COUNT(*) as count 
       FROM registrations 
       GROUP BY payment_status`
    );
    console.log("\n1. Registrations by Payment Status:", statusCounts.rows);

    // 2. Total Approved Registrations
    const approvedRes = await pool.query(
      `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, bib_number, qr_code, created_at
       FROM registrations
       WHERE payment_status = 'approved'
       ORDER BY event_id ASC, registration_id ASC`
    );
    console.log(`\n2. Total Approved Registrations: ${approvedRes.rows.length}`);

    // 3. Approved registrations without QR code
    const missingQr = approvedRes.rows.filter(r => !r.qr_code);
    console.log(`\n3. Approved Registrations missing pre-generated QR code: ${missingQr.length}`);
    if (missingQr.length > 0) {
      console.log("Missing QR IDs:", missingQr.map(r => ({ id: r.registration_id, name: r.full_name, email: r.email })));
    }

    // 4. Approved Marathon Registrations missing BIB Number
    const missingBib = approvedRes.rows.filter(r => !r.bib_number);
    console.log(`\n4. Approved Registrations missing BIB Number: ${missingBib.length}`);
    if (missingBib.length > 0) {
      console.log("Missing BIB IDs:", missingBib.map(r => ({ id: r.registration_id, name: r.full_name, email: r.email, ticket: r.ticket_type })));
    }

    // 5. Group registrations (Emails registered with multiple participants)
    const emailGroups = await pool.query(
      `SELECT LOWER(TRIM(email)) as email, COUNT(*) as total_registered,
              SUM(CASE WHEN payment_status = 'approved' THEN 1 ELSE 0 END) as approved_count,
              SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
              SUM(CASE WHEN payment_status = 'draft' THEN 1 ELSE 0 END) as draft_count
       FROM registrations
       GROUP BY LOWER(TRIM(email))
       HAVING COUNT(*) > 1
       ORDER BY total_registered DESC`
    );
    console.log(`\n5. Multi-Ticket Email Groups (${emailGroups.rows.length} group emails found):`);
    console.log(JSON.stringify(emailGroups.rows, null, 2));

    // 6. Split status email groups (Emails that have some approved AND some pending/draft)
    const splitStatusGroups = emailGroups.rows.filter(g => g.approved_count > 0 && (g.pending_count > 0 || g.draft_count > 0));
    console.log(`\n6. WARNING: Email Groups with MIXED status (Some Approved, Some Pending/Draft) (${splitStatusGroups.length} found):`);
    console.log(JSON.stringify(splitStatusGroups, null, 2));

    if (splitStatusGroups.length > 0) {
      console.log("\nDetailed records for Split Status Email Groups:");
      for (const group of splitStatusGroups) {
        const details = await pool.query(
          `SELECT registration_id, event_id, full_name, email, phone_number, ticket_type, payment_status, bib_number, created_at
           FROM registrations
           WHERE LOWER(TRIM(email)) = $1
           ORDER BY registration_id ASC`,
          [group.email]
        );
        console.log(`\n--- Email: ${group.email} ---`);
        console.log(JSON.stringify(details.rows, null, 2));
      }
    }

  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await pool.end();
  }
}

auditRegistrations();
