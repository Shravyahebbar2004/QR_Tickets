const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '',
    pass: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : ''
  }
});

async function sendSampleDraft() {
  const targetEmail = 'shravyahebbar07@gmail.com';

  const attendee = {
    title: 'Dandiya Night 12.0',
    full_name: 'Shravya Hebbar',
    email: targetEmail,
    phone_number: '9611444945',
    total_amount: '1495',
    ticket_type: 'Dandiya Pass (5 Entries)',
    allowed_entries: 5,
    venue: 'Yelahanka, Bengaluru',
    event_date: '2026-10-31T17:30:00.000Z',
    whatsapp_link: 'https://chat.whatsapp.com/EthttjOql9oEprMmwaTimT',
    qr_token: 'SAMPLE-DANDIYA-PASS-2026-9611444945'
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #09090b;">
  <div style="text-align: center; background: linear-gradient(135deg, #09090b, #1c1917, #292524); border: 2px solid rgba(245, 158, 11, 0.4); padding: 35px 20px; color: white; max-width: 600px; margin: 20px auto; border-radius: 24px; box-shadow: 0 0 50px rgba(245,158,11,0.2);">
    
    <div style="display: inline-block; background: linear-gradient(90deg, #f59e0b, #ea580c); color: #000000; font-weight: 900; font-size: 12px; padding: 4px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">
      🪩 Official Event Pass
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
    <div style="margin: 20px 0;">
      <a href="${attendee.whatsapp_link}" target="_blank" style="display: inline-block; background: linear-gradient(90deg, #25D366, #128C7E); color: white; padding: 14px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 15px rgba(37,211,102,0.3);">
        💬 Join Official WhatsApp Group
      </a>
    </div>
    ` : ''}
    
    <div style="background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 20px; padding: 22px; width: 100%; box-sizing: border-box; margin: 20px 0; text-align: left; line-height: 1.6; word-break: break-word;">
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Name:</strong> <span style="color: #ffffff;">${attendee.full_name}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Phone No:</strong> <span style="color: #ffffff;">${attendee.phone_number}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Amount Paid:</strong> <span style="color: #ffffff;">₹${attendee.total_amount}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Ticket Type:</strong> <span style="color: #ffffff;">${attendee.ticket_type} (${attendee.allowed_entries} members)</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Venue:</strong> <span style="color: #ffffff;">${attendee.venue}</span></p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #fde68a;">Date & Time:</strong> <span style="color: #ffffff;">October 31, 2026 at 5:30 PM IST</span></p>
    </div>

    <div style="background: #ffffff; padding: 16px; border-radius: 20px; display: inline-block; margin-top: 10px; border: 3px solid #f59e0b; box-shadow: 0 0 20px rgba(245,158,11,0.3);">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${attendee.qr_token}" width="200" height="200" style="display: block; max-width: 100%; height: auto;" alt="QR Code Pass" />
    </div>
    <h3 style="margin-top: 20px; color: #fde68a; font-size: 17px; font-weight: bold;">Show this pass at the entrance ✨</h3>
    
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
  `;

  try {
    console.log(`Sending sample draft email to ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: `"Rotaract Club of Yelahanka" <${process.env.GMAIL_USER}>`,
      to: targetEmail,
      subject: `Sample Draft: Your ${attendee.title} Event Pass`,
      html: htmlContent
    });

    console.log('✅ Sample draft email sent successfully!');
    console.log('Message ID:', info.messageId);
    process.exit(0);
  } catch (err) {
    console.error('❌ Email sending failed:', err);
    process.exit(1);
  }
}

sendSampleDraft();
