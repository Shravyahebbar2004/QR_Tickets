const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { randomUUID: uuidv4 } = require('crypto');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '') : ''
  }
  // Render auto-deploy trigger
});
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
const bcrypt = require('bcrypt');

app.use(cors({
  origin: '*'
}));

app.use(express.json());

// =====================================
// SERVER WAKEUP PING
// =====================================

app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

app.get('/api/test-email', async (req, res) => {
  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: `"EventFlow Test" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: "Test Email from EventFlow (Live Server)",
      text: "If you are reading this, Nodemailer is working perfectly on Render!"
    });
    res.json({ success: true, message: "Email sent successfully", info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// =====================================
// SERVE UPLOADS
// =====================================

app.use(
  '/uploads',
  express.static('uploads')
);




// =====================================
// MULTER STORAGE (CLOUDINARY)
// =====================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'qr_generator_uploads'
  }
});

const upload = multer({
  storage: storage
});




// =====================================
// TEST ROUTE
// =====================================

app.get('/', async (req, res) => {

  try {

    const result = await pool.query('SELECT NOW()');

    res.json({

      message: 'Backend + PostgreSQL Connected',

      time: result.rows[0]

    });

  } catch (error) {

    console.log(error);

    res.status(500).json({

      error: 'Database connection failed'

    });

  }

});




// =====================================
// GET SINGLE EVENT
// =====================================

app.get('/api/event/:id', async (req, res) => {

  try {

    const id = req.params.id;

    const event = await pool.query(

      `
      SELECT *
      FROM events
      WHERE event_id = $1
      `,

      [id]

    );

    if (event.rows.length === 0) {

      return res.status(404).json({

        success: false,

        message: 'Event not found'

      });

    }

    res.json({

      success: true,

      event: event.rows[0]

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Failed to fetch event'

    });

  }

});

// =====================================
// GET ALL EVENTS
// =====================================

app.get('/api/events', async (req, res) => {

  try {

    const events = await pool.query(

      `
      SELECT *
      FROM events
      ORDER BY created_at DESC
      `

    );

    res.json({

      success: true,

      events: events.rows

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Failed to fetch events'

    });

  }

});




// =====================================
// OTP VERIFICATION
// =====================================

app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing OTPs for this email to prevent clutter
    await pool.query('DELETE FROM email_otps WHERE email = $1', [cleanEmail]);

    // Insert new OTP
    await pool.query(
      'INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [cleanEmail, otp, expiresAt]
    );

    // Send Email
    await transporter.sendMail({
      from: `"EventFlow Verification" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: "Your EventFlow Registration Verification Code",
      html: `
        <div style="font-family: Arial; text-align: center; background: #111; padding: 30px; color: white;">
          <h1 style="color:#FFD700;">Verification Code</h1>
          <p style="font-size: 18px; color: #ddd;">Use the following 6-digit code to complete your event registration.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: #222; border-radius: 10px; color: #00f2fe;">
            ${otp}
          </div>
          <p style="color: #888;">This code will expire in 10 minutes.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('SEND OTP ERROR:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});


// =====================================
// REGISTER USER
// =====================================

app.post(

  '/api/register',

  upload.single('payment_proof'),

  async (req, res) => {

    try {

      const full_name = req.body.full_name;

      const email = req.body.email;

      // EMAIL VALIDATION

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {

        return res.status(400).json({

          success: false,

          message: 'Invalid Email Address'

        });

      }

      const cleanEmail =

        email.toLowerCase().trim();

      const phone_number = req.body.phone_number;
      const emergency_contact_name = req.body.emergency_contact_name || '';
      const emergency_contact = req.body.emergency_contact || '';
      const blood_group = req.body.blood_group || '';
      const gender = req.body.gender || '';

      let tickets = [];
      try {
        tickets = req.body.tickets ? JSON.parse(req.body.tickets) : [req.body.ticket_type || 'solo'];
      } catch (e) {
        tickets = [req.body.ticket_type || 'solo'];
      }
      
      let participants = [];
      try {
        participants = req.body.participants ? JSON.parse(req.body.participants) : [];
      } catch (e) {
        participants = [];
      }
      const event_id = req.body.event_id;
      const total_amount = req.body.total_amount;

      // PAYMENT SCREENSHOT

      const payment_proof = req.file

        ? req.file.path

        : null;



      if (!payment_proof) {

        return res.status(400).json({

          success: false,

          message: 'Payment screenshot required'

        });

      }


      // OTP VERIFICATION
      const otp = req.body.otp;
      if (!otp) {
        return res.status(400).json({ success: false, message: 'OTP is required' });
      }

      const otpCheck = await pool.query(
        'SELECT * FROM email_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW()',
        [cleanEmail, otp]
      );

      if (otpCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
      }

      // Delete the OTP once verified
      await pool.query('DELETE FROM email_otps WHERE email = $1', [cleanEmail]);

      // RESTORE DUPLICATE EMAIL CHECK
      const existing = await pool.query(
        `SELECT * FROM registrations WHERE email = $1 AND event_id = $2`,
        [cleanEmail, event_id]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This email has already registered for this event!'
        });
      }

      // PRE-FETCH BULK PASS ENTRIES IF NEEDED
      let bulk_entries = 1;
      if (tickets.includes('bulk')) {
        const evtData = await pool.query(`SELECT bulk_pass_entries FROM events WHERE event_id = $1`, [event_id]);
        bulk_entries = Number(evtData.rows[0].bulk_pass_entries) || 1;
      }

      // SAVE USERS IN PARALLEL
      const ticketPromises = tickets.map(async (ticket_type, index) => {
        // Determine allowed entries for this specific ticket
        let current_allowed = 1;
        if (ticket_type === 'couple') current_allowed = 2;
        else if (ticket_type === 'group') current_allowed = 4; // GROUP IS 4 NOW!
        else if (ticket_type === 'bulk') current_allowed = bulk_entries;
        
        // Grab participant specific details if they exist (Marathon)
        const participant = participants[index] || {};
        const p_full_name = participant.full_name || full_name;
        const p_blood_group = participant.blood_group || blood_group;
        const p_gender = participant.gender || gender;

        const qr_token = uuidv4();

        const newRegistration = await pool.query(
          `
    INSERT INTO registrations
    (
      full_name,
      email,
      phone_number,
      ticket_type,
      total_amount,
      allowed_entries,
      used_entries,
      qr_token,
      payment_proof,
      payment_status,
      event_id,
      emergency_contact_name,
      emergency_contact,
      blood_group,
      gender
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
    `,
          [
            p_full_name,
            cleanEmail,
            phone_number,
            ticket_type,
            total_amount,
            current_allowed,
            0,
            qr_token,
            payment_proof,
            'pending',
            event_id,
            emergency_contact_name,
            emergency_contact,
            p_blood_group,
            p_gender
          ]
        );

        return newRegistration.rows[0];
      });

      const generatedData = await Promise.all(ticketPromises);



      res.json({

        success: true,

        message: 'Registration Submitted',

        data: generatedData

      });

    } catch (error) {

      console.log(error.message);

      res.status(500).json({

        success: false,

        error: error.message

      });

    }

  }

);




// =====================================
// APPROVE PAYMENT
// =====================================

app.post('/api/approve-payment/:id', async (req, res) => {

  try {

    const id = req.params.id;



    // FIND USER

    const user = await pool.query(

      `
  SELECT

  r.*,

  e.title,
  e.venue,
  e.event_date,
  e.organizer_name,
  e.category,
  e.custom_pricing,
  e.whatsapp_link

  FROM registrations r

  JOIN events e

  ON r.event_id = e.event_id

  WHERE r.registration_id = $1
  `,

      [id]

    );



    if (user.rows.length === 0) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    const attendee = user.rows[0];



    // ALREADY APPROVED

    if (attendee.payment_status === 'approved') {

      return res.json({

        success: true,

        message: 'Already Approved'

      });

    }



    // BIB NUMBER ALLOCATION
    let generated_bib_number = null;
    if (attendee.category && attendee.category.toLowerCase().trim() === 'marathon' && attendee.ticket_type) {
      const distMatch = attendee.ticket_type.match(/\d+/);
      const baseNumber = distMatch ? parseInt(distMatch[0]) * 1000 : 1000;
      
      const highestBibQuery = await pool.query(
        `SELECT MAX(bib_number) as max_bib FROM registrations WHERE event_id = $1 AND ticket_type = $2`,
        [attendee.event_id, attendee.ticket_type]
      );
      const maxBib = highestBibQuery.rows[0].max_bib;
      if (maxBib && maxBib >= baseNumber) {
        generated_bib_number = maxBib + 1;
      } else {
        generated_bib_number = baseNumber + 1;
      }
    }

    // GENERATE QR
    const qr_code = await QRCode.toDataURL(attendee.qr_token);

    // SAVE QR AND BIB
    await pool.query(
      `
      UPDATE registrations
      SET
        payment_status = 'approved',
        qr_code = $1,
        bib_number = $3
      WHERE registration_id = $2
      `,
      [qr_code, id, generated_bib_number]
    );

    res.json({

      success: true,

      message: 'Payment Approved & QR Sent'

    });

    // SEND EMAIL IN BACKGROUND
    (async () => {
      try {
        let wave_info = '';
        if (attendee.category && attendee.category.toLowerCase().trim() === 'marathon' && generated_bib_number) {
          try {
            const customPricing = typeof attendee.custom_pricing === 'string' 
              ? JSON.parse(attendee.custom_pricing) 
              : attendee.custom_pricing;
              
            const distanceDef = customPricing?.find(d => d.name === attendee.ticket_type);
            if (distanceDef && distanceDef.wave_size && distanceDef.start_time) {
              const waveSize = Number(distanceDef.wave_size);
              const waveGap = Number(distanceDef.wave_gap_mins) || 5;
              const baseStartTime = new Date(distanceDef.start_time);
              
              const distMatch = attendee.ticket_type.match(/\d+/);
              const baseBib = distMatch ? parseInt(distMatch[0]) * 1000 : 1000;
              
              const runnerIndex = generated_bib_number - baseBib - 1;
              const waveIndex = Math.floor(runnerIndex / waveSize);
              const waveLetter = String.fromCharCode(65 + waveIndex);
              
              const myStartTime = new Date(baseStartTime.getTime() + (waveIndex * waveGap * 60000));
              const myReportingTime = new Date(myStartTime.getTime() - (60 * 60000));
              
              wave_info = `
                <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Wave Allocation:</strong> Wave ${waveLetter}</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Reporting Time:</strong> ${myReportingTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Race Start Time:</strong> ${myStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              `;
            }
            if (distanceDef) {
              if (distanceDef.bib_collection) {
                wave_info += `<p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Bib Collection:</strong> ${distanceDef.bib_collection}</p>`;
              }
              if (distanceDef.additional_info) {
                wave_info += `<p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Additional Info:</strong> ${distanceDef.additional_info}</p>`;
              }
              if (distanceDef.route_map_url) {
                wave_info += `<p style="margin: 8px 0; font-size: 16px;"><strong style="color: #c4b5fd;">Route Map:</strong> <a href="${distanceDef.route_map_url}" style="color: #67e8f9;">View Map</a></p>`;
              }
            }
          } catch(e) {}
        }

        const info = await transporter.sendMail({
          from: `"EventFlow" <${process.env.GMAIL_USER}>`,
          to: attendee.email ? attendee.email.trim() : '',
          subject: `Your ${attendee.title} Event Pass`,
          html: `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
  <div style="text-align: center; background: linear-gradient(135deg, #09090b, #1e1b4b, #2e1065); padding: 30px 15px; color: white; max-width: 600px; margin: 0 auto; border-radius: 10px;">
    <h1 style="color:#67e8f9; font-size: 28px; margin-bottom: 10px; word-break: break-word;">${attendee.title}</h1>
    <p style="color:#d8b4fe; font-size: 16px; margin-top: 0; font-weight: bold;">PASS FOR ${attendee.title.toUpperCase()}</p>
    
    <p style="color: white; font-size: 18px; margin: 20px 0;">Thank you for registering for ${attendee.title}!</p>
    
    ${attendee.whatsapp_link ? `
    <a href="${attendee.whatsapp_link}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
      Join WhatsApp Group
    </a>
    ` : ''}
    
    <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 15px; padding: 20px; width: 100%; box-sizing: border-box; margin: 25px 0; text-align: left; line-height: 1.5; word-break: break-word;">
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Name:</strong> ${attendee.full_name}</p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Phone No:</strong> ${attendee.phone_number}</p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Amount Paid:</strong> ₹${attendee.total_amount}</p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Ticket Type:</strong> ${attendee.ticket_type} (${attendee.allowed_entries} members)</p>
      ${generated_bib_number ? `<p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Bib Number:</strong> #${generated_bib_number}</p>` : ''}
      ${wave_info}
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Venue:</strong> ${attendee.venue}</p>
      <p style="margin: 8px 0; font-size: 15px;"><strong style="color: #c4b5fd;">Date:</strong> ${new Date(attendee.event_date).toLocaleDateString()}</p>
    </div>

    <div style="background:white; padding:15px; border-radius:15px; display:inline-block; margin-top:5px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${attendee.qr_token}" width="200" height="200" style="display: block; max-width: 100%; height: auto;" alt="QR Code" />
    </div>
    <h3 style="margin-top:25px; color: #e9d5ff; font-size: 18px;">Show this pass at the entrance ✨</h3>
  </div>
</body>
</html>
          `
        });
        console.log("BACKGROUND EMAIL SENT SUCCESSFULLY TO", attendee.email);
      } catch (err) {
        console.error('BACKGROUND EMAIL ERROR:', err);
      }
    })();

  } catch (error) {

    console.error('EMAIL/APPROVAL ERROR:', error);

    res.status(500).json({

      success: false,

      message: 'Approval Failed - Check Server Logs'

    });

  }

});



// =====================================
// GET ALL REGISTRATIONS
// =====================================

app.get('/api/registrations', async (req, res) => {

  try {

    const registrations = await pool.query(

      `
      SELECT *
      FROM registrations
      ORDER BY registration_id DESC
      `

    );



    res.json({

      success: true,

      data: registrations.rows

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      error: error.message

    });

  }

});




// =====================================
// ADMIN LOGIN
// =====================================

app.post('/api/admin/login', async (req, res) => {

  try {

    const {

      username,

      password

    } = req.body;



    const admin = await pool.query(

      `
      SELECT *
      FROM admins
      WHERE username = $1
      `,

      [username]

    );



    if (admin.rows.length === 0) {

      return res.status(401).json({

        success: false,

        message: 'Invalid Username'

      });

    }



    if (admin.rows[0].password !== password) {

      return res.status(401).json({

        success: false,

        message: 'Invalid Password'

      });

    }



    const token = jwt.sign(

      {

        admin_id: admin.rows[0].admin_id

      },

      process.env.JWT_SECRET,

      {

        expiresIn: '1d'

      }

    );



    res.json({

      success: true,

      token,

      event_id: admin.rows[0].event_id

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Login Failed'

    });

  }

});




// =====================================
// SCANNER LOGIN
// =====================================

app.post('/api/scanner/login', async (req, res) => {

  try {

    const {

      username,

      password

    } = req.body;



    const scanner = await pool.query(

      `
      SELECT *
      FROM scanner_admins
      WHERE username = $1
      `,

      [username]

    );



    console.log(scanner.rows);



    if (scanner.rows.length === 0) {

      return res.status(401).json({

        success: false,

        message: 'Invalid Username'

      });

    }



    if (

      scanner.rows[0].password !== password

    ) {

      return res.status(401).json({

        success: false,

        message: 'Invalid Password'

      });

    }



    const token = jwt.sign(

      {

        scanner_id: scanner.rows[0].scanner_id,
        event_id: scanner.rows[0].event_id

      },

      process.env.JWT_SECRET,

      {

        expiresIn: '1d'

      }

    );


    res.json({

      success: true,

      token,

      event_id:
        scanner.rows[0].event_id

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Login Failed'

    });

  }

});

app.post(

  '/api/create-event',

  (req, res, next) => {
    upload.single('banner')(req, res, (err) => {
      if (err) {
        console.error('MULTER ERROR:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        return res.status(500).json({ success: false, message: 'Multer error', error: err });
      }
      next();
    });
  },

  async (req, res) => {

    try {

      const {

        title,
        tagline,
        description,
        venue,
        event_date,
        category,
        organizer_name,
        organizer_username,
        organizer_password,
        slab1_solo_price,
        slab1_couple_price,
        slab1_group_price,
        slab1_deadline,
        slab2_solo_price,
        slab2_couple_price,
        slab2_group_price,
        slab2_deadline,
        slab3_solo_price,
        slab3_couple_price,
        slab3_group_price,
        slab3_deadline,
        bulk_pass_price,
        bulk_pass_entries,
        custom_pricing,
        whatsapp_link,
        scanner_username,
        scanner_password
      } = req.body;

      // BANNER URL

      const banner_url = req.file

        ? req.file.path

        : null;

      // CHECK DUPLICATE USERNAME
      if (organizer_username) {
        const existingAdmin = await pool.query(
          `SELECT * FROM admins WHERE username = $1`,
          [organizer_username]
        );
        if (existingAdmin.rows.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Username is already taken. Please choose a different admin username.'
          });
        }
      }

      // INSERT EVENT

      const newEvent = await pool.query(

        `
        INSERT INTO events
        (

          title,
          tagline,
          description,
          venue,
          event_date, 
          category,
          organizer_name,
          banner_url,
          slab1_solo_price,
          slab1_couple_price,
          slab1_group_price,
          slab1_deadline,
          slab2_solo_price,
          slab2_couple_price,
          slab2_group_price,
          slab2_deadline,
          slab3_solo_price,
          slab3_couple_price,
          slab3_group_price,
          slab3_deadline,
          bulk_pass_price,
          bulk_pass_entries,
          custom_pricing,
          whatsapp_link
        )

        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )

        RETURNING *
        `,

        [

          title,
          tagline,
          description,
          venue,
          event_date,
          category,
          organizer_name,
          banner_url,
          slab1_solo_price || null,
          slab1_couple_price || null,
          slab1_group_price || null,
          slab1_deadline || null,
          slab2_solo_price || null,
          slab2_couple_price || null,
          slab2_group_price || null,
          slab2_deadline || null,
          slab3_solo_price || null,
          slab3_couple_price || null,
          slab3_group_price || null,
          slab3_deadline || null,
          bulk_pass_price || null,
          bulk_pass_entries || null,
          custom_pricing || '[]',
          whatsapp_link || null
        ]

      );

      // INSERT ADMIN ACCOUNT
      if (organizer_username && organizer_password) {
        await pool.query(
          `
          INSERT INTO admins (username, password, event_id)
          VALUES ($1, $2, $3)
          `,
          [organizer_username, organizer_password, newEvent.rows[0].event_id]
        );
      }

      // INSERT SCANNER ACCOUNT
      if (scanner_username && scanner_password) {
        // Optional duplicate check for scanner username
        const existingScanner = await pool.query(
          `SELECT * FROM scanner_admins WHERE username = $1`,
          [scanner_username]
        );
        if (existingScanner.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO scanner_admins (username, password, event_id)
            VALUES ($1, $2, $3)
            `,
            [scanner_username, scanner_password, newEvent.rows[0].event_id]
          );
        }
      }

      res.json({

        success: true,

        event:

          newEvent.rows[0]

      });

    } catch (error) {

      console.log(error.message);

      res.status(500).json({

        success: false,

        message: 'Event Creation Failed'

      });

    }

  }

);

// =====================================
// EDIT EVENT API
// =====================================

app.put('/api/edit-event/:id', async (req, res) => {
  try {
    const event_id = req.params.id;
    const {
      title, tagline, description, venue, event_date, category, organizer_name,
      slab1_solo_price, slab1_couple_price, slab1_group_price, slab1_deadline,
      slab2_solo_price, slab2_couple_price, slab2_group_price, slab2_deadline,
      slab3_solo_price, slab3_couple_price, slab3_group_price, slab3_deadline,
      bulk_pass_price, bulk_pass_entries, custom_pricing, whatsapp_link
    } = req.body;

    const updatedEvent = await pool.query(
      `
      UPDATE events
      SET
        title = $1, tagline = $2, description = $3, venue = $4, event_date = $5,
        category = $6, organizer_name = $7,
        slab1_solo_price = $8, slab1_couple_price = $9, slab1_group_price = $10, slab1_deadline = $11,
        slab2_solo_price = $12, slab2_couple_price = $13, slab2_group_price = $14, slab2_deadline = $15,
        slab3_solo_price = $16, slab3_couple_price = $17, slab3_group_price = $18, slab3_deadline = $19,
        bulk_pass_price = $20, bulk_pass_entries = $21, custom_pricing = $23, whatsapp_link = $24
      WHERE event_id = $22
      RETURNING *
      `,
      [
        title, tagline, description, venue, event_date, category, organizer_name,
        slab1_solo_price || null, slab1_couple_price || null, slab1_group_price || null, slab1_deadline || null,
        slab2_solo_price || null, slab2_couple_price || null, slab2_group_price || null, slab2_deadline || null,
        slab3_solo_price || null, slab3_couple_price || null, slab3_group_price || null, slab3_deadline || null,
        bulk_pass_price || null, bulk_pass_entries || null,
        event_id,
        custom_pricing || '[]',
        whatsapp_link || null
      ]
    );

    res.json({ success: true, event: updatedEvent.rows[0] });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Event Update Failed' });
  }
});


// =====================================
// SECURE VERIFY API
// =====================================

app.post('/api/verify-ticket', async (req, res) => {

  try {

    // AUTH TOKEN

    const authHeader = req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({

        success: false,

        message: 'Unauthorized'

      });

    }

    const token = authHeader.split(' ')[1];

    // VERIFY JWT

    const decoded = jwt.verify(

      token,

      process.env.JWT_SECRET

    );

    // QR TOKEN

    const qr_token = req.body.qr_token;

    // FIND USER

    const user = await pool.query(

      `
      SELECT *
      FROM registrations
      WHERE qr_token = $1
      `,

      [qr_token]

    );

    // INVALID QR

    if (user.rows.length === 0) {

      return res.json({

        success: false,

        message: 'Invalid QR'

      });

    }

    const attendee = user.rows[0];

    // EVENT CHECK
    if (String(attendee.event_id) !== String(decoded.event_id)) {
      return res.json({
        success: false,
        message: 'Invalid Event Ticket'
      });
    }

    // PAYMENT CHECK

    if (

      attendee.payment_status !== 'approved'

    ) {

      return res.json({

        success: false,

        message: 'Payment Not Approved'

      });

    }

    // ATOMIC ENTRY LIMIT CHECK & UPDATE

    const updateResult = await pool.query(

      `
      UPDATE registrations
      SET used_entries = used_entries + 1
      WHERE qr_token = $1 AND used_entries < allowed_entries
      RETURNING *
      `,

      [qr_token]

    );

    if (updateResult.rowCount === 0) {

      return res.json({

        success: false,

        message: 'Entry Limit Reached'

      });

    }

    const updatedAttendee = updateResult.rows[0];

    // SAVE ENTRY LOG

    await pool.query(

      `
      INSERT INTO entry_logs
      (
        registration_id,
        scanner_id
      )

      VALUES ($1, $2)
      `,

      [

        attendee.registration_id,

        decoded.scanner_id

      ]

    );

    // SUCCESS

    res.json({

      success: true,

      message: 'Entry Allowed',

      attendee: updatedAttendee

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Verification Failed'

    });

  }

});



// =====================================
// GET USER TICKET
// =====================================

app.post('/api/my-ticket', async (req, res) => {

  try {

    const email = req.body.email;

    const phone_number = req.body.phone_number;



    const cleanPhone = phone_number

      .replace(/\s/g, '')

      .trim();



    const event_id = req.body.event_id;

    const user = await pool.query(

      `
      SELECT
      r.*,
      e.title,
      e.venue,
      e.event_date,
      e.organizer_name,
      e.category,
      e.custom_pricing,
      e.whatsapp_link
      FROM registrations r
      JOIN events e
      ON r.event_id = e.event_id
      WHERE
      LOWER(r.email) = LOWER($1)
      AND
      TRIM(r.phone_number) = $2
      AND
      r.event_id = $3
      `,

      [

        email,

        cleanPhone,

        event_id

      ]

    );



    if (user.rows.length === 0) {

      return res.status(404).json({

        success: false,

        message: 'User not found'

      });

    }



    res.json({

      success: true,

      data: user.rows

    });

  } catch (error) {

    console.log(error.message);



    res.status(500).json({

      success: false,

      message: 'Server Error'

    });

  }

});

// =====================================
// ANALYTICS API
// =====================================

app.get('/api/analytics', async (req, res) => {

  try {

    // TOTAL USERS

    const totalUsers = await pool.query(

      `
      SELECT COUNT(*)
      FROM registrations
      `

    );



    // TOTAL ENTERED

    const totalEntered = await pool.query(

      `
      SELECT COUNT(*)
      FROM entry_logs
      `

    );



    // RECENT ENTRIES

    const recentEntries = await pool.query(

      `
      SELECT
        registrations.full_name,
        scanner_admins.username,
        entry_logs.entry_time

      FROM entry_logs

      JOIN registrations

      ON
      entry_logs.registration_id =
      registrations.registration_id

      JOIN scanner_admins

      ON
      entry_logs.scanner_id =
      scanner_admins.scanner_id

      ORDER BY entry_logs.entry_time DESC

      LIMIT 10
      `

    );



    // HOURLY GRAPH

    const hourlyEntries = await pool.query(

      `
      SELECT

        EXTRACT(HOUR FROM entry_time)
        AS hour,

        COUNT(*) AS entries

      FROM entry_logs

      GROUP BY hour

      ORDER BY hour
      `

    );



    res.json({

      success: true,

      totalUsers:
        totalUsers.rows[0].count,

      totalEntered:
        totalEntered.rows[0].count,

      recentEntries:
        recentEntries.rows,

      hourlyEntries:
        hourlyEntries.rows

    });

  } catch (error) {

    console.log(error.message);



    res.status(500).json({

      success: false,

      message: 'Analytics Failed'

    });

  }

});

app.get('/api/signup', (req, res) => {

  res.json({

    success: true,

    message: 'Signup Route Working'

  });

});

// =====================================
// GET EVENT REGISTRATIONS
// =====================================

app.get(

  '/api/admin/:id',

  async (req, res) => {

    try {

      const event_id =
        req.params.id;

      const registrations =
        await pool.query(

          `
          SELECT *
          FROM registrations
          WHERE event_id = $1
          ORDER BY created_at DESC
          `,

          [event_id]

        );

      res.json({

        success: true,

        registrations:

          registrations.rows

      });

    } catch (error) {

      console.log(error.message);

      res.status(500).json({

        success: false,

        message:
          'Failed to fetch registrations'

      });

    }

  }

);



// =====================================
// PLATFORM AUTHENTICATION
// =====================================

const AUTHORIZED_EMAIL = 'shravyahebbar07@gmail.com';

app.post('/api/platform/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (email !== AUTHORIZED_EMAIL) {
      return res.status(403).json({ success: false, message: 'Unauthorized email address.' });
    }

    const existingUser = await pool.query('SELECT * FROM platform_users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO platform_users (email, password) VALUES ($1, $2)',
      [email, hashedPassword]
    );

    res.json({ success: true, message: 'Platform user registered successfully.' });
  } catch (error) {
    console.error('PLATFORM SIGNUP ERROR:', error);
    res.status(500).json({ success: false, message: 'Signup failed.' });
  }
});

app.post('/api/platform/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await pool.query('SELECT * FROM platform_users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, message: 'Login successful' });
  } catch (error) {
    console.error('PLATFORM LOGIN ERROR:', error);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// =====================================
// SERVER
// =====================================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;