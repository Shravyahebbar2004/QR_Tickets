const nodemailer = require('nodemailer');
require('dotenv').config({ path: './.env' });

async function testMail() {
  try {
    console.log('Testing with user:', `'${process.env.EMAIL_USER}'`);
    console.log('Password length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim()
      },
      debug: true,
      logger: true
    });

    await transporter.verify();
    console.log('Mail auth success!');
  } catch (error) {
    console.error('Mail auth failed:', error);
  }
}

testMail();
