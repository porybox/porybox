const nodemailer = require('nodemailer');

const user = sails.config.email ? sails.config.email.user : '';
const pass = sails.config.email ? sails.config.email.user : '';
const transporter = nodemailer.createTransport(`smtp://${user}:${pass}@smtp.elasticemail.com:2525`);

exports.sendMail = ({from, to, subject, body}) => {
  return Promise.promisify(transporter.sendMail.bind(transporter))({
    from, to, subject, html: body
  }).tap(result => {
    sails.log.verbose(`Sent an email to ${to} with subject '${subject}'`);
    sails.log.verbose(result);
  });
};
