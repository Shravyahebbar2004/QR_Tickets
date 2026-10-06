const pool = require('./db');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
require('dotenv').config();

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const isSecure = smtpPort === 465;

const transporter = nodemailer.createTransport(
  smtpHost.includes('gmail.com')
    ? {
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '',
          pass: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : ''
        }
      }
    : {
        host: smtpHost,
        port: smtpPort,
        secure: isSecure,
        auth: {
          user: process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '',
          pass: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : ''
        }
      }
);

async function handleVinod() {
  try {
    const regId = 242;

    // 1. Fetch user & event details
    const res = await pool.query(
      `SELECT r.*, e.title, e.venue, e.event_date, e.organizer_name, e.category, e.custom_pricing, e.whatsapp_link
       FROM registrations r
       JOIN events e ON r.event_id = e.event_id
       WHERE r.registration_id = $1`,
      [regId]
    );

    if (res.rows.length === 0) {
      console.log('Registration 242 not found');
      return;
    }

    const attendee = res.rows[0];
    console.log('Attendee found:', attendee.full_name, attendee.email, 'BIB:', attendee.bib_number);

    // 2. Try sending email now
    let emailSent = false;
    let emailError = null;

    try {
      let wave_info = '';
      const generated_bib_number = attendee.bib_number;

      if (attendee.category && attendee.category.toLowerCase().trim() === 'marathon' && generated_bib_number) {
        try {
          const customPricing = typeof attendee.custom_pricing === 'string' 
            ? JSON.parse(attendee.custom_pricing) 
            : attendee.custom_pricing;
            
          const distanceDef = customPricing?.find(d => d.name === attendee.ticket_type);
          if (distanceDef && distanceDef.start_time) {
            const waveSize = Number(distanceDef.wave_size) || 65;
            const waveGap = Number(distanceDef.wave_gap_mins) || 5;
            const baseStartTime = new Date(distanceDef.start_time);
            
            const distMatch = attendee.ticket_type.match(/\d+/);
            const baseBib = distMatch ? parseInt(distMatch[0]) * 1000 : 1000;
            
            const runnerIndex = generated_bib_number - baseBib - 1;
            const waveIndex = Math.max(0, Math.floor(runnerIndex / waveSize));
            const waveLetter = String.fromCharCode(65 + waveIndex);
            
            const myStartTime = new Date(baseStartTime.getTime() + (waveIndex * waveGap * 60000));
            const myReportingTime = new Date(myStartTime.getTime() - (60 * 60000));
            
            wave_info = `
              <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Wave Allocation:</strong> Wave ${waveLetter}</p>
              <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Reporting Time:</strong> ${myReportingTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Race Start Time:</strong> ${myStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            `;
          }
        } catch(e) {}
      }

      // Generate QR Code data URL if needed
      let qrCodeData = attendee.qr_code;
      if (!qrCodeData && attendee.qr_token) {
        qrCodeData = await QRCode.toDataURL(attendee.qr_token);
      }

      const info = await transporter.sendMail({
        from: `"EventFlow" <${process.env.GMAIL_USER}>`,
        to: attendee.email.trim(),
        subject: `Your ${attendee.title} Event Pass`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; background-color: #1e1b4b; color: #ffffff; border-radius: 10px;">
            <h2 style="color: #67e8f9;">${attendee.title}</h2>
            <p>Dear ${attendee.full_name},</p>
            <p>Your payment registration is confirmed!</p>
            <p><strong>BIB Number:</strong> ${attendee.bib_number || 'Assigned'}</p>
            <p><strong>Ticket Type:</strong> ${attendee.ticket_type}</p>
            ${wave_info}
            ${qrCodeData ? `<p><strong>QR Code:</strong><br/><img src="${qrCodeData}" alt="QR Pass" style="width: 150px; height: 150px;"/></p>` : ''}
            <p>Thank you!</p>
          </div>
        `
      });

      console.log('✅ DIRECT EMAIL SENT SUCCESSFULLY! Message ID:', info.messageId);
      emailSent = true;
    } catch (err) {
      console.error('❌ Email Sending Failed:', err.message);
      emailError = err.message;
    }

    // 3. Set payment_status to 'pending' so admin user can re-approve anytime from admin dashboard UI
    const updateRes = await pool.query(
      `UPDATE registrations 
       SET payment_status = 'pending'
       WHERE registration_id = $1
       RETURNING registration_id, full_name, email, payment_status`,
      [regId]
    );

    console.log('Updated Vinod N status to pending:', updateRes.rows[0]);
    console.log(`Summary: Direct Email Sent = ${emailSent}. Status set to 'pending' in database for Admin dashboard.`);

  } catch (err) {
    console.error('Error handling Vinod N:', err);
  } finally {
    await pool.end();
  }
}

handleVinod();
