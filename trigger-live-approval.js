const axios = require('axios');

async function triggerLiveApproval() {
  try {
    const liveApiUrl = 'https://qr-tickets.onrender.com';
    const regId = 69; // Pradeep Kumar's registration ID

    console.log(`Triggering live approval email on Render server for registration ID ${regId}...`);
    const response = await axios.post(`${liveApiUrl}/api/approve-payment/${regId}`);
    console.log('Live Server Response:', response.data);
  } catch (err) {
    console.error('Error triggering live approval:', err?.response?.data || err.message);
  }
}

triggerLiveApproval();
