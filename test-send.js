const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : ''
  },
  debug: true,
  logger: true
});

async function test() {
  try {
    console.log("Attempting to send email...");
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER.trim(),
      to: 'shravyahebbar2004@gmail.com', // Assuming this is the user's email or they can change it
      subject: `Test Event Pass`,
      html: `
        <div style="background: #111; color: white; padding: 40px; text-align: center;">
          <h1>Test Event</h1>
          <p>Payment Approved</p>
        </div>
      `
    });
    console.log("Email sent successfully!", info.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

test();
