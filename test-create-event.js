const FormData = require('form-data');
const fs = require('fs');

async function testCreateEvent() {
  try {
    const form = new FormData();
    form.append('title', 'Test Event');
    form.append('tagline', 'Test Tagline');
    form.append('description', 'Test Description');
    form.append('venue', 'Test Venue');
    form.append('event_date', new Date().toISOString());
    form.append('category', 'Workshop');
    form.append('organizer_name', 'Test Org');
    // We won't attach an image to keep it simple, or we can attach one if needed.
    
    const response = await fetch('http://localhost:5000/api/create-event', {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", data);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testCreateEvent();
