const axios = require('axios');
const FormData = require('form-data');

async function testLiveSendOtp() {
  const liveUrl = 'https://qr-tickets.onrender.com';
  console.log(`Testing /api/send-otp on live server (${liveUrl})...`);

  try {
    const formData = new FormData();
    formData.append('email', 'rotaractyelahanka.events@gmail.com');
    formData.append('full_name', 'Test OTP User');
    formData.append('phone_number', '9845276525');
    formData.append('event_id', '1');
    formData.append('tickets', JSON.stringify(['solo']));
    formData.append('total_amount', '0');
    formData.append('allowed_entries', '1');
    formData.append('emergency_contact_name', 'Test');
    formData.append('emergency_contact', '9845276525');
    formData.append('blood_group', 'O+');
    formData.append('gender', 'Male');
    formData.append('club_affiliation', 'General Public / Other');

    const response = await axios.post(`${liveUrl}/api/send-otp`, formData, {
      headers: formData.getHeaders()
    });

    console.log('✅ SEND OTP RESPONSE:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('❌ SEND OTP ERROR RESPONSE:', err.response.data);
    } else {
      console.error('❌ SEND OTP ERROR:', err.message);
    }
  }
}

testLiveSendOtp();
