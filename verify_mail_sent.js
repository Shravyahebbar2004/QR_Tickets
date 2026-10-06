const pool = require('./db');
const nodemailer = require('nodemailer');

async function sendAndVerifyMail() {
  try {
    const res = await pool.query(
      `SELECT r.*, e.title, e.venue, e.event_date, e.organizer_name, e.category, e.custom_pricing, e.whatsapp_link
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.registration_id = 268`
    );

    const attendee = res.rows[0];

    const user = (process.env.GMAIL_USER || '').trim();
    const pass = (process.env.GMAIL_PASS || '').replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    console.log(`Sending email to ${attendee.email}...`);

    const info = await transporter.sendMail({
      from: `"EventFlow" <${user}>`,
      to: attendee.email.trim(),
      subject: `Your ${attendee.title} Event Pass - BIB #${attendee.bib_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; background: #09090b; padding: 30px; color: white;">
          <h1 style="color: #67e8f9;">${attendee.title}</h1>
          <p style="color: #d8b4fe; font-size: 18px; font-weight: bold;">PASS FOR Tharika M L</p>
          <p style="font-size: 22px; color: #facc15; font-weight: bold;">BIB Number: #${attendee.bib_number}</p>
          <p style="font-size: 16px;">Ticket: ${attendee.ticket_type} | Venue: ${attendee.venue}</p>
          <div style="background: white; padding: 15px; display: inline-block; border-radius: 12px; margin-top: 15px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${attendee.qr_token}" width="200" height="200" />
          </div>
          <p style="color: #9ca3af; margin-top: 20px;">Show this pass at the entrance ✨</p>
        </div>
      `
    });

    console.log("✅ RESULT: SENT SUCCESSFULLY! Message ID:", info.messageId);

  } catch (err) {
    console.error("❌ RESULT: FAILED TO SEND MAIL. Error:", err.message);
  } finally {
    await pool.end();
  }
}

sendAndVerifyMail();
