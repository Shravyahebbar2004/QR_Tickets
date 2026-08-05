const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rotaractyelahanka.events@gmail.com',
    pass: 'shcpdugujofxmgab'
  }
});

async function approvePradeep() {
  try {
    const email = 'pradeep.j86@gmail.com';
    const full_name = 'Pradeep Kumar';
    const phone_number = '9980673776';
    const ticket_type = '5K';

    // Get event details for Event 1
    const eventRes = await pool.query('SELECT * FROM events ORDER BY created_at DESC LIMIT 1');
    const event = eventRes.rows[0];
    const event_id = event.event_id;

    // Fetch user registration row
    let userRes = await pool.query('SELECT * FROM registrations WHERE email = $1 AND event_id = $2', [email, event_id]);
    if (userRes.rows.length === 0) {
      console.error('User not found!');
      return;
    }

    const attendee = userRes.rows[0];
    const registration_id = attendee.registration_id;
    const generated_bib_number = attendee.bib_number || 5031;
    const qr_token = attendee.qr_token || uuidv4();
    const qr_code = await QRCode.toDataURL(qr_token);

    // Calculate Wave Info
    let wave_info = '';
    if (event.category && event.category.toLowerCase().trim() === 'marathon' && generated_bib_number) {
      try {
        const customPricing = typeof event.custom_pricing === 'string' 
          ? JSON.parse(event.custom_pricing) 
          : event.custom_pricing;
          
        const distanceDef = customPricing?.find(d => d.name === ticket_type);
        if (distanceDef && distanceDef.start_time) {
          const waveSize = Number(distanceDef.wave_size) || 65;
          const waveGap = Number(distanceDef.wave_gap_mins) || 5;
          const baseStartTime = new Date(distanceDef.start_time);
          
          const runnerIndex = generated_bib_number - 5000 - 1;
          const waveIndex = Math.max(0, Math.floor(runnerIndex / waveSize));
          const waveLetter = String.fromCharCode(65 + waveIndex);
          
          const waveStartTime = new Date(baseStartTime.getTime() + waveIndex * waveGap * 60000);
          const timeString = waveStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

          wave_info = `
            <div style="background: rgba(34, 211, 238, 0.1); border: 1px solid rgba(34, 211, 238, 0.3); padding: 15px; border-radius: 12px; margin-top: 15px;">
              <h3 style="color: #22d3ee; margin: 0 0 8px 0; font-size: 16px;">🏃‍♂️ Your Official Race Flag-Off Wave</h3>
              <p style="margin: 3px 0; font-size: 14px; color: #ffffff;"><strong>Flag-off Wave:</strong> Wave ${waveLetter}</p>
              <p style="margin: 3px 0; font-size: 14px; color: #ffffff;"><strong>Report & Flag-off Time:</strong> ${timeString}</p>
              ${distanceDef.bib_collection ? `<p style="margin: 3px 0; font-size: 14px; color: #a5f3fc;"><strong>Bib Collection Expo:</strong> ${distanceDef.bib_collection}</p>` : ''}
            </div>
          `;
        }
      } catch (e) {
        console.log('Error calculating wave info:', e.message);
      }
    }

    // Send Email Confirmation
    console.log(`Sending approval email to ${email}...`);
    const qrBuffer = Buffer.from(qr_code.split(',')[1], 'base64');
    const mailInfo = await transporter.sendMail({
      from: `"EventFlow Verification" <rotaractyelahanka.events@gmail.com>`,
      to: email,
      subject: `Registration Approved! Ticket & BIB #${generated_bib_number} for ${event.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; background: #000000; padding: 40px 20px; color: #ffffff;">
          <h1 style="color: #22d3ee; font-size: 28px; margin-bottom: 5px;">Registration Confirmed!</h1>
          <p style="color: #a1a1aa; font-size: 16px; margin-top: 0;">Your payment is approved for <strong>${event.title}</strong>.</p>
          
          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 25px; max-w: 500px; margin: 25px auto; text-align: left;">
            <h2 style="color: #ffffff; margin-top: 0; border-b: 1px solid #27272a; padding-bottom: 10px;">Attendee Details</h2>
            <p style="color: #e4e4e7;"><strong>Name:</strong> ${full_name}</p>
            <p style="color: #e4e4e7;"><strong>Email:</strong> ${email}</p>
            <p style="color: #e4e4e7;"><strong>Phone:</strong> ${phone_number}</p>
            <p style="color: #e4e4e7;"><strong>Ticket Type:</strong> ${ticket_type}</p>
            <p style="color: #facc15; font-size: 18px; font-weight: bold;"><strong>BIB Number:</strong> #${generated_bib_number}</p>
            
            ${wave_info}
            
            <div style="text-align: center; margin-top: 25px;">
              <p style="color: #a1a1aa; font-size: 14px;">Present this QR code at the entrance scanner:</p>
              <img src="cid:qrcodeimage" alt="QR Code Ticket" style="width: 220px; height: 220px; border-radius: 12px; background: white; padding: 10px;" />
            </div>
          </div>

          <p style="color: #71717a; font-size: 12px; margin-top: 30px;">Thank you for registering. See you at the venue!</p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'qrcodeimage'
        }
      ]
    });

    console.log(`SUCCESS! Confirmation email with QR code & BIB #${generated_bib_number} delivered to ${email}! Message ID: ${mailInfo.messageId}`);
  } catch (err) {
    console.error('Error approving user:', err);
  } finally {
    await pool.end();
  }
}

approvePradeep();
