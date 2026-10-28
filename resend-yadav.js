const pool = require('./db');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

async function resendTicket() {
  try {
    const res = await pool.query(`
      SELECT r.*, e.title, e.venue, e.event_date, e.organizer_name, e.category, e.custom_pricing, e.whatsapp_link
      FROM registrations r
      JOIN events e ON r.event_id = e.event_id
      WHERE r.registration_id = 126
    `);

    if (res.rows.length === 0) {
      console.log('Registration 126 not found');
      process.exit(1);
    }

    const attendee = res.rows[0];
    console.log('Target Attendee:', {
      id: attendee.registration_id,
      name: attendee.full_name,
      email: attendee.email,
      phone: attendee.phone_number,
      allowed_entries: attendee.allowed_entries,
      ticket_type: attendee.ticket_type,
      payment_status: attendee.payment_status,
      qr_token: attendee.qr_token
    });

    const qr_code = await QRCode.toDataURL(attendee.qr_token);

    // Update in database to ensure QR code is 100% fresh
    await pool.query(
      `UPDATE registrations SET qr_code = $1 WHERE registration_id = 126`,
      [qr_code]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '',
        pass: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : ''
      }
    });

    const mailOptions = {
      from: `"Rotaract Club of Yelahanka" <${process.env.GMAIL_USER}>`,
      to: attendee.email.trim(),
      subject: `Your ${attendee.title} Event Pass (16 Entries)`,
      html: `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #09090b;">
  <div style="text-align: center; background: linear-gradient(135deg, #09090b, #1c1917, #292524); border: 2px solid rgba(245, 158, 11, 0.4); padding: 35px 20px; color: white; max-width: 600px; margin: 20px auto; border-radius: 24px; box-shadow: 0 0 50px rgba(245,158,11,0.2);">
    
    <div style="display: inline-block; background: linear-gradient(90deg, #f59e0b, #ea580c); color: #000000; font-weight: 900; font-size: 12px; padding: 4px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">
      🪩 Official Event Pass (16 Entries)
    </div>

    <h1 style="color:#ffffff; font-size: 28px; font-weight: 900; margin: 0 0 10px 0; word-break: break-word;">${attendee.title}</h1>
    <p style="color:#fbbf24; font-size: 15px; margin-top: 0; font-weight: bold; letter-spacing: 0.5px;">PASS FOR ${attendee.title.toUpperCase()}</p>
    
    <p style="color: #fde68a; font-size: 18px; font-weight: bold; margin: 25px 0 15px 0; line-height: 1.4;">
      Thank you for registering for ${attendee.title}! 🎉
    </p>

    <!-- BOLD IMPORTANT NOTE BANNER -->
    <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 16px; padding: 16px 20px; margin: 20px 0; text-align: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);">
      <p style="margin: 0; color: #ef4444; font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
        ⚠️ <strong style="color: #fca5a5;">NOTE: PLEASE STAR ⭐️ OR PIN 📌 THIS EMAIL!</strong>
      </p>
      <p style="margin: 6px 0 0 0; color: #ffffff; font-size: 13px; font-weight: bold; line-height: 1.5;">
        You MUST show your QR code at the entrance on the date of the event. Entry will not be permitted without your QR pass.
      </p>
    </div>
    
    ${attendee.whatsapp_link ? `
    <a href="${attendee.whatsapp_link}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #25D366, #128C7E); color: white; padding: 12px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(37,211,102,0.3);">
      Join Official WhatsApp Group
    </a>
    ` : ''}
    
    <div style="background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 20px; padding: 22px; width: 100%; box-sizing: border-box; margin: 20px 0; text-align: left; line-height: 1.6; word-break: break-word;">
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Name:</strong> <span style="color: #ffffff;">${attendee.full_name}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Phone No:</strong> <span style="color: #ffffff;">${attendee.phone_number}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Amount Paid:</strong> <span style="color: #ffffff;">₹${attendee.total_amount}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Ticket Type:</strong> <span style="color: #ffffff;">${attendee.ticket_type} (${attendee.allowed_entries} members)</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Venue:</strong> <span style="color: #ffffff;">${attendee.venue}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Date & Time:</strong> <span style="color: #ffffff;">${new Date(attendee.event_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(attendee.event_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })} IST</span></p>
    </div>

    <div style="background: #ffffff; padding: 16px; border-radius: 20px; display: inline-block; margin-top: 10px; border: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245,158,11,0.3);">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${attendee.qr_token}" width="200" height="200" style="display: block; max-width: 100%; height: auto;" alt="QR Code" />
    </div>
    <h3 style="margin-top: 20px; color: #fde68a; font-size: 17px; font-weight: bold;">Show this pass at the entrance (Total Allowed: 16 Entries) ✨</h3>
    
    <div style="margin-top: 30px; border-top: 1px solid rgba(245, 158, 11, 0.3); padding-top: 20px; color: #d1d5db; font-size: 14px; text-align: center;">
      <p style="margin: 4px 0; font-size: 16px; font-weight: bold; color: #f59e0b;">With regards,</p>
      <p style="margin: 4px 0; font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">Rotaract Club of Yelahanka</p>
      <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        <p style="margin: 4px 0;">For queries, contact <strong>Shravya Hebbar</strong></p>
        <p style="margin: 4px 0;">📧 <a href="mailto:rotaractyelahanka.events@gmail.com" style="color: #fbbf24; text-decoration: underline;">rotaractyelahanka.events@gmail.com</a> | 📞 9611444945</p>
      </div>
    </div>
  </div>
</body>
</html>
      `
    };

    console.log('Sending email now...');
    const sendInfo = await transporter.sendMail(mailOptions);
    console.log('SUCCESS! Email sent to', attendee.email, sendInfo.messageId, sendInfo.response);

    process.exit(0);
  } catch (err) {
    console.error('ERROR SENDING EMAIL:', err);
    process.exit(1);
  }
}

resendTicket();
