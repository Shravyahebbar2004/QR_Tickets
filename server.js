const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const transporter = require('./mailer');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();

app.use(cors({
  origin: '*'
}));

app.use(express.json());



// =====================================
// SERVE UPLOADS
// =====================================

app.use(
  '/uploads',
  express.static('uploads')
);




// =====================================
// MULTER STORAGE
// =====================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, 'uploads/');

  },

  filename: function (req, file, cb) {

    cb(

      null,

      Date.now() + path.extname(file.originalname)

    );

  }

});



const upload = multer({

  storage

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

      const cleanEmail =
      
      email.toLowerCase().trim();

}

      const phone_number = req.body.phone_number;

      const ticket_type = req.body.ticket_type;



      // =====================================
      // TICKET LOGIC
      // =====================================

      let total_amount = 0;

      let allowed_entries = 1;



      if (ticket_type === 'solo') {

        total_amount = 299;

        allowed_entries = 1;

      }



      if (ticket_type === 'couple') {

        total_amount = 499;

        allowed_entries = 2;

      }



      if (ticket_type === 'group') {

        total_amount = 899;

        allowed_entries = 4;

      }



      // PAYMENT SCREENSHOT

      const payment_proof = req.file

        ? req.file.filename

        : null;



      if (!payment_proof) {

        return res.status(400).json({

          success: false,

          message: 'Payment screenshot required'

        });

      }



      // CHECK DUPLICATE EMAIL

      const existingUser = await pool.query(

        `
        SELECT *
        FROM registrations
        WHERE LOWER(email) = LOWER($1)
        `,

        [email.toLowerCase().trim()]

      );



      if (existingUser.rows.length > 0) {

        return res.status(400).json({

          success: false,

          message: 'Email already registered'

        });

      }



      // GENERATE TOKEN

      const qr_token = uuidv4();



      // SAVE USER

      const newRegistration = await pool.query(

        `
        INSERT INTO registrations
        (
          full_name,
          cleanEmail,
          phone_number,
          ticket_type,
          total_amount,
          allowed_entries,
          used_entries,
          qr_token,
          payment_proof,
          payment_status
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        )

        RETURNING *
        `,

        [

          full_name,

          email,

          phone_number,

          ticket_type,

          total_amount,

          allowed_entries,

          0,

          qr_token,

          payment_proof,

          'pending'

        ]

      );



      res.json({

        success: true,

        message: 'Registration Submitted',

        data: newRegistration.rows[0]

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
      SELECT *
      FROM registrations
      WHERE registration_id = $1
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



    // SAVE QR

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



    // SEND EMAIL

   await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: attendee.email,

      subject: 'Your Musical Jam Event Pass',

      html: `

        <div
          style="
            font-family: Arial;
            text-align: center;
            background: #111;
            padding: 40px;
            color: white;
          "
        >

          <h1 style="color:#FFD700;">
            Musical Jam
          </h1>

          <p style="font-size:18px;">
            Payment Approved 🎵
          </p>

          <p>
            Ticket Type:
            ${attendee.ticket_type}
          </p>

          <p>
            Allowed Entries:
            ${attendee.allowed_entries}
          </p>

          <div
            style="
              background:white;
              padding:20px;
              border-radius:20px;
              display:inline-block;
              margin-top:20px;
            "
          >

            <img
              src="${qr_code}"
              width="250"
            />

          </div>

          <h3 style="margin-top:30px;">
            See you at the event ✨
          </h3>

        </div>

      `,



      attachments: [

        {

          filename: 'musical-jam-qr.png',

          content: qr_code.split('base64,')[1],

          encoding: 'base64'

        }

      ]

    });



    res.json({

      success: true,

      message: 'Payment Approved & QR Sent'

    });

  } catch (error) {

    console.log(error.message);

    res.status(500).json({

      success: false,

      message: 'Approval Failed'

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

      token

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

        scanner_id:

          scanner.rows[0].scanner_id

      },

      process.env.JWT_SECRET,

      {

        expiresIn: '1d'

      }

    );



    res.json({

      success: true,

      token

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

    // PAYMENT CHECK

    if (

      attendee.payment_status !== 'approved'

    ) {

      return res.json({

        success: false,

        message: 'Payment Not Approved'

      });

    }

    // ENTRY LIMIT CHECK

    if (

      attendee.used_entries >=

      attendee.allowed_entries

    ) {

      return res.json({

        success: false,

        message: 'Entry Limit Reached'

      });

    }

    // UPDATE ENTRY COUNT

    await pool.query(

      `
      UPDATE registrations
      SET used_entries = used_entries + 1
      WHERE qr_token = $1
      `,

      [qr_token]

    );

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

      attendee

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



    const user = await pool.query(

      `
      SELECT *
      FROM registrations
      WHERE
        LOWER(email) = LOWER($1)
      AND
        TRIM(phone_number) = $2
      `,

      [

        email,

        cleanPhone

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

      data: user.rows[0]

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




// =====================================
// SERVER
// =====================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(`Server running on port ${PORT}`);

});