const nodemailer = require('nodemailer');

async function testRotaract() {
  const user = 'rotaractyelahanka.events@gmail.com';
  const pass = 'shcpdugujofxmgab';

  console.log('Testing Nodemailer with user:', user);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection Verified Successfully!');

    const info = await transporter.sendMail({
      from: `"EventFlow Verification" <${user}>`,
      to: 'nandakishore8@gmail.com',
      subject: 'Event Pass Confirmation - Ammu Rajeev',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; background: #000000; padding: 40px 20px; color: #ffffff;">
          <h1 style="color: #22d3ee; font-size: 28px;">Registration Confirmed!</h1>
          <p style="color: #a1a1aa; font-size: 16px;">Dear Ammu Rajeev, your 3K Ticket & Pass for Event is Confirmed!</p>
          <p style="color: #facc15; font-size: 20px; font-weight: bold;">BIB Number: #3008</p>
        </div>
      `
    });

    console.log('✅ TEST TICKET EMAIL DELIVERED TO nandakishore8@gmail.com! Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Error:', error.message);
  }
}

testRotaract();
