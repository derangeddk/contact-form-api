const ContactForm = require("./index");
const config = require("config");
const bunyan = require("bunyan");
const { name, version } = require("./package.json");

let logger = bunyan.createLogger({ name, version });
let contactForm = ContactForm(config, logger);
contactForm.expressApp.listen(config.get("port"));
