const pool = require('./db');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- Generating Approved Participants Excel & CSV ---');

  // Query only approved registrations for event 1
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
    WHERE r.event_id = 1 AND LOWER(r.payment_status) = 'approved'
    ORDER BY r.registration_id ASC
  `);

  const approvedRegistrations = res.rows;
  console.log(`Fetched ${approvedRegistrations.length} approved registrations.`);

  const parseOtherParticipants = (raw) => {
    if (!raw) return '-';
    const cleaned = raw.replace(/^(Attendees|Group Members|Other Holders|Guests):\s*/i, '').trim();
    if (!cleaned) return '-';
    const names = cleaned.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    return names.length > 0 ? names.join(', ') : '-';
  };

  const getOtherParticipantsList = (raw) => {
    if (!raw) return [];
    const cleaned = raw.replace(/^(Attendees|Group Members|Other Holders|Guests):\s*/i, '').trim();
    if (!cleaned) return [];
    return cleaned.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
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

  // Sheet 1: Registration Summary (Primary Name, Additional Participants, No of Tickets Taken, etc.)
  const sheet1Data = approvedRegistrations.map((r, index) => {
    const otherParts = parseOtherParticipants(r.emergency_contact_name);
    return {
      'Sl No': index + 1,
      'Registered Name (Primary)': r.full_name || 'N/A',
      'Additional Participants': otherParts,
      'No of Tickets Taken': Number(r.allowed_entries) || 1,
      'Ticket Status': (r.payment_status || 'approved').toUpperCase(),
      'Email Address': (r.email || '').trim().toLowerCase(),
      'Phone Number': r.phone_number || '-',
      'Ticket Pass Type': r.ticket_type || 'Solo',
      'Amount Paid (₹)': Number(r.total_amount) || 0,
      'Club / Affiliation': r.club_affiliation || 'Public',
      'Scanned Entries': `${r.used_entries || 0} / ${r.allowed_entries || 1}`,
      'UTR / UPI Ref': r.utr || '-',
      'Registration ID': r.registration_id,
      'Registration Date (IST)': formatISTDate(r.created_at)
    };
  });

  // Sheet 2: All Individual Attendees (Ticket Holder Name, Attendee Role, Registered By, No of Tickets Taken)
  // This is the direct approved-only version of All_Ticket_Holders_List.csv
  const sheet2Data = [];
  let individualSl = 1;

  approvedRegistrations.forEach(r => {
    const primaryName = r.full_name || 'N/A';
    const email = (r.email || '').trim().toLowerCase();
    const phone = r.phone_number || '-';
    const noOfTickets = Number(r.allowed_entries) || 1;
    const ticketType = r.ticket_type || 'Solo';
    const club = r.club_affiliation || 'Public';
    const status = (r.payment_status || 'approved').toUpperCase();
    const utr = r.utr || '-';
    const regId = r.registration_id;
    const dateIST = formatISTDate(r.created_at);
    const scanned = `${r.used_entries || 0} / ${r.allowed_entries || 1}`;

    // 1. Primary Registrant row
    sheet2Data.push({
      'Sl No': individualSl++,
      'Ticket Holder Name': primaryName,
      'Attendee Role': 'Primary Registrant',
      'Registered By (Primary)': primaryName,
      'No of Tickets Taken': noOfTickets,
      'Ticket Status': status,
      'Email Address': email,
      'Phone Number': phone,
      'Ticket Pass Type': ticketType,
      'Club / Affiliation': club,
      'Scanned Entries': scanned,
      'Registration ID': regId,
      'UTR / UPI Ref': utr,
      'Registered Date (IST)': dateIST
    });

    // 2. Additional Ticket Holders
    const additionalNames = getOtherParticipantsList(r.emergency_contact_name);
    additionalNames.forEach(addName => {
      sheet2Data.push({
        'Sl No': individualSl++,
        'Ticket Holder Name': addName,
        'Attendee Role': 'Additional Ticket Holder',
        'Registered By (Primary)': primaryName,
        'No of Tickets Taken': noOfTickets,
        'Ticket Status': status,
        'Email Address': email,
        'Phone Number': phone,
        'Ticket Pass Type': ticketType,
        'Club / Affiliation': club,
        'Scanned Entries': scanned,
        'Registration ID': regId,
        'UTR / UPI Ref': utr,
        'Registered Date (IST)': dateIST
      });
    });
  });

  console.log(`Generated ${sheet1Data.length} summary rows and ${sheet2Data.length} individual ticket holder rows.`);

  // Build Excel Workbook (.xlsx)
  const wb = XLSX.utils.book_new();

  // Helper for setting column widths
  const applyColWidths = (ws, data) => {
    if (!data || data.length === 0) return;
    const colWidths = Object.keys(data[0]).map(key => {
      let maxLen = key.length;
      data.forEach(row => {
        const valStr = String(row[key] ?? '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    ws['!cols'] = colWidths;
  };

  // Sheet 1: Registration Summary
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  applyColWidths(ws1, sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Approved Registrations');

  // Sheet 2: Individual Ticket Holders
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  applyColWidths(ws2, sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Approved Ticket Holders');

  // Paths to save
  const rootDir = path.resolve(__dirname, '..');
  const frontendPublicDir = path.resolve(rootDir, 'event-frontend', 'public');
  const downloadsDir = path.resolve(frontendPublicDir, 'downloads');

  [frontendPublicDir, downloadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Write Excel file: Approved_Participants_Ticket_Holders.xlsx
  const xlsxFilename = 'Approved_Participants_Ticket_Holders.xlsx';
  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  const xlsxDestinations = [
    path.join(rootDir, xlsxFilename),
    path.join(frontendPublicDir, xlsxFilename),
    path.join(downloadsDir, xlsxFilename)
  ];

  xlsxDestinations.forEach(dest => {
    fs.writeFileSync(dest, xlsxBuffer);
    console.log(`Saved XLSX to: ${dest}`);
  });

  // Also write CSV version of Sheet 1: Approved_Participants_Summary.csv
  const csv1 = '\uFEFF' + XLSX.utils.sheet_to_csv(ws1);
  const csv1Filename = 'Approved_Participants_Summary.csv';
  [
    path.join(rootDir, csv1Filename),
    path.join(frontendPublicDir, csv1Filename),
    path.join(downloadsDir, csv1Filename)
  ].forEach(dest => {
    fs.writeFileSync(dest, csv1, 'utf8');
    console.log(`Saved CSV (Summary) to: ${dest}`);
  });

  // Also write CSV version of Sheet 2: Approved_Ticket_Holders_List.csv
  const csv2 = '\uFEFF' + XLSX.utils.sheet_to_csv(ws2);
  const csv2Filename = 'Approved_Ticket_Holders_List.csv';
  [
    path.join(rootDir, csv2Filename),
    path.join(frontendPublicDir, csv2Filename),
    path.join(downloadsDir, csv2Filename)
  ].forEach(dest => {
    fs.writeFileSync(dest, csv2, 'utf8');
    console.log(`Saved CSV (Individual Holders) to: ${dest}`);
  });

  console.log('--- All Approved Participants Excel and CSV files generated successfully! ---');
  await pool.end();
}

main().catch(err => {
  console.error('Error generating approved participants files:', err);
  process.exit(1);
});
