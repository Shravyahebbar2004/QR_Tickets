const nodemailer = require('nodemailer');
require('dotenv').config();

async function testBrevo() {
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const user = process.env.GMAIL_USER ? process.env.GMAIL_USER.trim() : '';
  const pass = process.env.GMAIL_PASS ? process.env.GMAIL_PASS.trim() : '';

  console.log('Testing Brevo SMTP with:');
  console.log('Host:', host);
  console.log('User:', user);
  console.log('Pass length:', pass.length);

  // Test Port 587
  try {
    console.log('\n--- Testing Port 587 (STARTTLS) ---');
    const transporter587 = nodemailer.createTransport({
      host: host,
      port: 587,
      secure: false,
      auth: { user, pass }
    });
    await transporter587.verify();
    console.log('✅ Port 587 Connected successfully!');

    const info = await transporter587.sendMail({
      from: `"EventFlow Verification" <${user}>`,
      to: user,
      subject: 'Brevo Test Email',
      text: 'Brevo SMTP is working perfectly on Port 587!'
    });
    console.log('✅ TEST EMAIL SENT! Message ID:', info.messageId);
    return;
  } catch (e) {
    console.error('❌ Port 587 Error:', e.message);
  }

  // Test Port 465
  try {
    console.log('\n--- Testing Port 465 (SSL) ---');
    const transporter465 = nodemailer.createTransport({
      host: host,
      port: 465,
      secure: true,
      auth: { user, pass }
    });
    await transporter465.verify();
    console.log('✅ Port 465 Connected successfully!');

    const info = await transporter465.sendMail({
      from: `"EventFlow Verification" <${user}>`,
      to: user,
      subject: 'Brevo Test Email',
      text: 'Brevo SMTP is working perfectly on Port 465!'
    });
    console.log('✅ TEST EMAIL SENT! Message ID:', info.messageId);
    return;
  } catch (e) {
    console.error('❌ Port 465 Error:', e.message);
  }
}

testBrevo();
