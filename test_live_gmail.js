const nodemailer = require('nodemailer');
require('dotenv').config();

async function testGmail() {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_PASS || '').replace(/\s+/g, '');

  console.log('Testing Nodemailer with user:', user);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Transport Connection verified successfully!');

    const info = await transporter.sendMail({
      from: `"EventFlow Test" <${user}>`,
      to: 'nandakishore8@gmail.com',
      subject: 'Test Event Ticket Pass - Ammu Rajeev',
      text: 'This is a test email to verify ticket sending for nandakishore8@gmail.com.'
    });

    console.log('✅ TEST EMAIL SENT SUCCESSFULLY! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Error:', error.message);
  }
}

testGmail();
