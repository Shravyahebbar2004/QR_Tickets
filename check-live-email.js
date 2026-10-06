const axios = require('axios');

async function checkLiveEmail() {
  const liveUrl = 'https://qr-tickets.onrender.com';
  console.log(`Pinging live server at ${liveUrl}/api/test-email...`);
  
  try {
    const response = await axios.get(`${liveUrl}/api/test-email`, { timeout: 15000 });
    console.log('✅ LIVE EMAIL RESPONSE:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('❌ LIVE EMAIL ERROR:', err.response.data);
    } else {
      console.error('❌ LIVE EMAIL ERROR:', err.message);
    }
  }
}

checkLiveEmail();
