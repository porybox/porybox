if (!sails.config.email.transport) {
  sails.log.warn('No email transport configured; emails will not be sent.');
}
const transport = require('nodemailer').createTransport(sails.config.email.transport);
const ejs = require('ejs');
const Promise = require('bluebird');
const sendMail = Promise.promisify(transport.sendMail.bind(transport));
const renderFile = Promise.promisify(ejs.renderFile);
module.exports = {
  send ({from = sails.config.email.sender, to, subject, body}) {
    return (sails.config.email.transport
      ? sendMail({from, to, subject, html: body, text: body})
      : Promise.resolve()
    ).tap(() => sails.log.info(`Sent an email to ${to} with subject '${subject}'`));
  },
  renderTemplate (templateName, locals) {
    Validation.sanityCheck(
      /^[A-Za-z\d]*$/.test(templateName),
      `Invalid template name '${templateName}'`
    );
    return renderFile(
      `${__dirname}/EmailTemplates/${templateName}.ejs`,
      Object.assign({}, locals, {siteUrl: sails.config.siteUrl})
    );
  }
};
