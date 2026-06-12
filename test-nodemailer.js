const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log("Checking credentials...");
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("❌ MISSING CREDENTIALS: Add GMAIL_USER and GMAIL_PASS to your backend/.env file");
    process.exit(1);
  }

  // Remove any spaces from the password just in case
  const cleanPass = process.env.GMAIL_PASS.replace(/\s+/g, '');

  console.log("User:", process.env.GMAIL_USER);
  console.log("Password length (cleaned):", cleanPass.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: cleanPass
    }
  });

  try {
    console.log("Attempting to verify connection to Gmail...");
    await transporter.verify();
    console.log("✅ SUCCESS! Gmail accepted the credentials.");
    
    console.log("Attempting to send a test email to yourself...");
    const info = await transporter.sendMail({
      from: `"EventFlow Test" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Test Email from EventFlow",
      text: "If you are reading this, Nodemailer is working perfectly!"
    });

    console.log("✅ TEST EMAIL SENT! Check your inbox.");
  } catch (error) {
    console.error("❌ ERROR FAILED:", error);
  }
}

testEmail();
