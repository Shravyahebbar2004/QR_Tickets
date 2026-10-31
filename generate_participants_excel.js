const pool = require('./db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- Generating All Participants Excel & CSV ---');

  // Query all registrations for event 1
  const res = await pool.query(`
    SELECT
      r.registration_id,
      r.full_name,
      r.email,
      r.phone_number,
      r.ticket_type,
      r.total_amount,
      r.allowed_entries,
      r.used_entries,
      r.payment_status,
      r.emergency_contact_name,
      r.club_affiliation,
      r.utr,
      r.created_at
    FROM registrations r
    WHERE r.event_id = 1
    ORDER BY r.registration_id ASC
  `);

  const registrations = res.rows;
  console.log(`Fetched ${registrations.length} registrations from database.`);

  const parseOtherParticipants = (raw) => {
    if (!raw) return '-';
    const cleaned = raw.replace(/^(Attendees|Group Members|Other Holders|Guests):\s*/i, '').trim();
    if (!cleaned) return '-';
    // Clean up multiple commas or spaces
    const names = cleaned.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    return names.length > 0 ? names.join(', ') : '-';
  };

  const formatISTDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Sheet 1: Registration Summary with Registered Name followed by Other Participants
  const sheet1Data = registrations.map((r, index) => {
    const otherParts = parseOtherParticipants(r.emergency_contact_name);
    return {
      'Sl No': index + 1,
      'Registered Name': r.full_name || 'N/A',
      'Other Participants': otherParts,
      'Email ID': (r.email || '').trim().toLowerCase(),
      'Ticket Status': (r.payment_status || '').toUpperCase(),
      'Phone Number': r.phone_number || '-',
      'Ticket Pass Type': r.ticket_type || 'Solo',
      'Total Tickets (Allowed)': Number(r.allowed_entries) || 1,
      'Amount Paid (₹)': Number(r.total_amount) || 0,
      'Club / Affiliation': r.club_affiliation || 'Public',
      'Scanned Entries': `${r.used_entries || 0} / ${r.allowed_entries || 1}`,
      'UTR / UPI Ref': r.utr || '-',
      'Registration ID': r.registration_id,
      'Registration Date (IST)': formatISTDate(r.created_at)
    };
  });

  // Sheet 2: Expanded row-by-row for every single participant
  const sheet2Data = [];
  let individualSl = 1;

  registrations.forEach(r => {
    const primaryName = r.full_name || 'N/A';
    const email = (r.email || '').trim().toLowerCase();
    const status = (r.payment_status || '').toUpperCase();

    // 1. Primary Registrant row
    sheet2Data.push({
      'Sl No': individualSl++,
      'Participant Name': primaryName,
      'Participant Role': 'Primary Registrant',
      'Registered Name': primaryName,
      'Other Participants': parseOtherParticipants(r.emergency_contact_name),
      'Email ID': email,
      'Ticket Status': status,
      'Phone Number': r.phone_number || '-',
      'Ticket Pass Type': r.ticket_type || 'Solo',
      'Total Tickets': Number(r.allowed_entries) || 1,
      'Amount Paid (₹)': Number(r.total_amount) || 0,
      'Club / Affiliation': r.club_affiliation || 'Public',
      'Registration ID': r.registration_id,
      'UTR / UPI Ref': r.utr || '-'
    });

    // 2. Extra Attendees
    if (r.emergency_contact_name) {
      const extraRaw = r.emergency_contact_name.replace(/^(Attendees|Group Members|Other Holders|Guests):\s*/i, '').trim();
      const extraNames = extraRaw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      extraNames.forEach(extName => {
        sheet2Data.push({
          'Sl No': individualSl++,
          'Participant Name': extName,
          'Participant Role': 'Additional Participant',
          'Registered Name': primaryName,
          'Other Participants': parseOtherParticipants(r.emergency_contact_name),
          'Email ID': email,
          'Ticket Status': status,
          'Phone Number': r.phone_number || '-',
          'Ticket Pass Type': r.ticket_type || 'Solo',
          'Total Tickets': Number(r.allowed_entries) || 1,
          'Amount Paid (₹)': Number(r.total_amount) || 0,
          'Club / Affiliation': r.club_affiliation || 'Public',
          'Registration ID': r.registration_id,
          'UTR / UPI Ref': r.utr || '-'
        });
      });
    }
  });

  // Sheet 3: Rotaract Club Filtered
  const sheet3Data = sheet1Data.filter(r => (r['Club / Affiliation'] || '').toLowerCase().includes('rotaract'));

  // Build Excel Workbook (.xlsx)
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  // Auto-fit column widths
  const colWidths1 = Object.keys(sheet1Data[0] || {}).map(key => {
    let maxLen = key.length;
    sheet1Data.forEach(row => {
      const valStr = String(row[key] || '');
      if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 50);
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  ws1['!cols'] = colWidths1;
  XLSX.utils.book_append_sheet(wb, ws1, 'All Registrations');

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const colWidths2 = Object.keys(sheet2Data[0] || {}).map(key => {
    let maxLen = key.length;
    sheet2Data.forEach(row => {
      const valStr = String(row[key] || '');
      if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 50);
    });
    return { wch: Math.max(maxLen + 3, 12) };
  });
  ws2['!cols'] = colWidths2;
  XLSX.utils.book_append_sheet(wb, ws2, 'Individual Attendees');

  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  ws3['!cols'] = colWidths1;
  XLSX.utils.book_append_sheet(wb, ws3, 'Rotaract Club Registrations');

  // Generate CSV Content for Sheet 1
  const csvContent = XLSX.utils.sheet_to_csv(ws1);

  // Target paths to save files
  const rootDir = path.resolve(__dirname, '..');
  const frontendPublic = path.resolve(rootDir, 'event-frontend', 'public');
  const frontendDownloads = path.resolve(frontendPublic, 'downloads');

  fs.mkdirSync(frontendDownloads, { recursive: true });

  const destinations = [
    { dir: rootDir, name: 'All_Participants_Registered_List' },
    { dir: frontendPublic, name: 'All_Participants_Registered_List' },
    { dir: frontendDownloads, name: 'All_Participants_Registered_List' }
  ];

  destinations.forEach(d => {
    const xlsxPath = path.join(d.dir, `${d.name}.xlsx`);
    const csvPath = path.join(d.dir, `${d.name}.csv`);

    XLSX.writeFile(wb, xlsxPath);
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    console.log(`✓ Saved Excel to: ${xlsxPath}`);
    console.log(`✓ Saved CSV to: ${csvPath}`);
  });

  console.log('\n--- Summary ---');
  console.log(`Total Registrations: ${sheet1Data.length}`);
  console.log(`Total Individual Attendees: ${sheet2Data.length}`);
  console.log(`Rotaract Club Registrations: ${sheet3Data.length}`);

  await pool.end();
}

main().catch(err => {
  console.error('Error generating excel:', err);
  process.exit(1);
});
