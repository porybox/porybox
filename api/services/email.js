const nodemailer = require('nodemailer');

const user = sails.config.email ? sails.config.email.user : '';
const pass = sails.config.email ? sails.config.email.user : '';
const transporter = nodemailer.createTransport(`smtp://@{user}:@{pass}@smtp.elasticemail.com:2525`);

const mailOptions = {
  from: '"Porybox" <noreply@porybox.com>',
  to: '',
  subject: 'Hello ✔',
  html: '<b>Hello world</b>'
};

exports.sendMail = (address) => {
  mailOptions.to = address;
  transporter.sendMail(mailOptions, function(error, info){
    if (error){
      return console.log(error);
    }
    console.log('Message sent: ' + info.response);
  });
};
