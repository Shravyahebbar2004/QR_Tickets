const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function test() {
  const form = new FormData();
  form.append('title', 'Cloudinary Test');
  form.append('tagline', 'Test Tagline');
  form.append('description', 'Test Description');
  form.append('venue', 'Test Venue');
  form.append('event_date', '2026-06-15');
  form.append('category', 'Tech');
  form.append('organizer_name', 'Org');
  form.append('organizer_username', 'org' + Date.now());
  form.append('organizer_password', 'password');
  form.append('slab1_solo_price', '100');
  form.append('slab1_couple_price', '150');
  form.append('slab2_solo_price', '200');
  form.append('slab2_couple_price', '250');
  form.append('slab3_solo_price', '300');
  form.append('slab3_couple_price', '350');
  
  form.append('banner', fs.createReadStream('real.jpg'), { filename: 'real.jpg', contentType: 'image/jpeg' });

  try {
    const response = await axios.post('http://localhost:5000/api/create-event', form, {
      headers: form.getHeaders()
    });
    
    console.log('STATUS:', response.status);
    console.log('RESPONSE:', response.data);
  } catch (err) {
    if (err.response) {
      console.error('STATUS:', err.response.status);
      console.error('RESPONSE:', err.response.data);
    } else {
      console.error('ERROR:', err.message);
    }
  } finally {
    // done
  }
}

test();
