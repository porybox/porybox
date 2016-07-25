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
    if (!/^[A-Za-z\d]*$/.test(templateName)) {
      /* Verify that the template name doesn't contain any special characters.
      This should never happen since all the template names are just hard-coded string literals.
      However, if there's a vulnerability that allows an attacker to use any given template name, it's
      probably better to avoid emailing arbitrary files from the server's filesystem. */
      sails.log.warn(`Blocked an attempt to render the invalid email template ${templateName}`);
      throw new Error('Invalid template name');
    }
    return renderFile(
      `${__dirname}/EmailTemplates/${templateName}.ejs`,
      Object.assign({}, locals, {siteUrl: sails.config.siteUrl})
    );
  }
};
