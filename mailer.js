const nodemailer = require('nodemailer');

require('dotenv').config();



const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '',
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : ''
  }
});

module.exports = transporter;