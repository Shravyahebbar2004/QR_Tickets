require('dotenv').config();
const { Resend } = require('resend');

// Use the API key from your .env file
const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log("Sending test email using Resend...");
  
  // NOTE: On the free tier without a verified domain,
  // the 'to' address MUST be the exact email address you used to sign up for Resend!
  const myEmailAddress = "shravyahebbar07@gmail.com"; 

  const { data, error } = await resend.emails.send({
    from: 'EventFlow <onboarding@resend.dev>',
    to: myEmailAddress,
    subject: 'Resend Email API Test - Success!',
    html: '<h1>It works!</h1><p>The Resend API integration is fully functional.</p>'
  });

  if (error) {
    console.error("Failed to send email:", error);
  } else {
    console.log("Email sent successfully! Delivery ID:", data.id);
  }
}

testEmail();
