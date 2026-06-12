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

      const phone_number =
        req.body.phone_number;

      const tickets = JSON.parse(req.body.tickets);
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
      const ticketPromises = tickets.map(async (ticket_type) => {
        // Determine allowed entries for this specific ticket
        let current_allowed = 1;
        if (ticket_type === 'couple') current_allowed = 2;
        else if (ticket_type === 'group') current_allowed = 4; // GROUP IS 4 NOW!
        else if (ticket_type === 'bulk') current_allowed = bulk_entries;

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
      event_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
    `,
          [
            full_name,
            cleanEmail,
            phone_number,
            ticket_type,
            total_amount,
            current_allowed,
            0,
            qr_token,
            payment_proof,
            'pending',
            event_id
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
  e.organizer_name

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



    // GENERATE QR

    const qr_code = await QRCode.toDataURL(

      attendee.qr_token

    );



    // SAVE QR IMMEDIATELY FOR FAST RESPONSE

    await pool.query(

      `

      UPDATE registrations

      SET

        payment_status = 'approved',

        qr_code = $1

      WHERE registration_id = $2

      `,

      [

        qr_code,

        id

      ]

    );

    res.json({

      success: true,

      message: 'Payment Approved & QR Sent'

    });

    // SEND EMAIL IN BACKGROUND
    (async () => {
      try {
        const info = await transporter.sendMail({
          from: `"EventFlow" <${process.env.GMAIL_USER}>`,
          to: attendee.email ? attendee.email.trim() : '',
          subject: `Your ${attendee.title} Event Pass`,
          html: `
            <div style="font-family: Arial; text-align: center; background: #111; padding: 20px; color: white;">
              <h1 style="color:#FFD700;">${attendee.title}</h1>
              <p>Venue: ${attendee.venue}</p>
              <p>Date: ${new Date(attendee.event_date).toLocaleDateString()}</p>
              <p>Organizer: ${attendee.organizer_name}</p>
              <p style="font-size:18px;">Payment Approved</p>
              <p>Ticket Type: ${attendee.ticket_type}</p>
              <p>Allowed Entries: ${attendee.allowed_entries}</p>
              <div style="background:white; padding:10px; border-radius:15px; display:inline-block; margin-top:20px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${attendee.qr_token}" width="200" height="200" style="display: block; max-width: 100%; height: auto;" alt="QR Code" />
              </div>
              <h3 style="margin-top:30px;">See you at the event ✨</h3>
            </div>
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
          bulk_pass_entries
        )

        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
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
          bulk_pass_entries || null
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
      bulk_pass_price, bulk_pass_entries
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
        bulk_pass_price = $20, bulk_pass_entries = $21
      WHERE event_id = $22
      RETURNING *
      `,
      [
        title, tagline, description, venue, event_date, category, organizer_name,
        slab1_solo_price || null, slab1_couple_price || null, slab1_group_price || null, slab1_deadline || null,
        slab2_solo_price || null, slab2_couple_price || null, slab2_group_price || null, slab2_deadline || null,
        slab3_solo_price || null, slab3_couple_price || null, slab3_group_price || null, slab3_deadline || null,
        bulk_pass_price || null, bulk_pass_entries || null,
        event_id
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
      e.organizer_name
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
// SERVER
// =====================================

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;