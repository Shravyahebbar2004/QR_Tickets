const nodemailer = require('nodemailer');

async function testRotaractAuth() {
  const user = 'rotaractyelahanka.events@gmail.com';
  const passwordsToTest = [
    'shcpdugujofxmgab',
    'qydjyptagvupaizp',
    'shcp dugu jofo xmgab',
    'qydj ypta gvup aizp'
  ];

  for (const p of passwordsToTest) {
    const cleanPass = p.replace(/\s+/g, '');
    console.log(`Testing ${user} with pass length ${cleanPass.length}...`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: cleanPass }
    });

    try {
      await transporter.verify();
      console.log(`✅ SUCCESS! Working pass found: ${cleanPass}`);

      // Try sending test email to Tharika
      const info = await transporter.sendMail({
        from: `"EventFlow Pass" <${user}>`,
        to: 'aakash2001spike@outlook.com',
        subject: 'Event Pass Confirmation - Tharika M L (BIB #5075)',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; background: #09090b; padding: 30px; color: white;">
            <h1 style="color: #67e8f9;">EVENT PASS CONFIRMED</h1>
            <p style="color: #d8b4fe; font-size: 18px;">Dear Tharika M L,</p>
            <p style="font-size: 22px; color: #facc15; font-weight: bold;">BIB Number: #5075</p>
          </div>
        `
      });
      console.log('✅ TEST TICKET MAIL DELIVERED SUCCESSFULLY TO aakash2001spike@outlook.com! MessageId:', info.messageId);
      return;
    } catch (err) {
      console.log(`❌ Failed with pass (${cleanPass}):`, err.message);
    }
  }
}

testRotaractAuth();
