const ContactFormLib = require("./lib");
const ContactFormExpressApp = require("./app");
const Mailer = require("mailgun-mustache-mailer");

module.exports = (config, logger) => {
    let mailer = new Mailer(config.mailgun, logger);
    let contactFormLib = ContactFormLib(mailer, config.data, config.recipientEmail);

    return {
        expressApp: ContactFormExpressApp(contactFormLib, logger),
        contactFormLib
    };
};
