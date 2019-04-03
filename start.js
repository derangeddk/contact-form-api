const ContactForm = require("./index");
const config = require("config");
const bunyan = require("bunyan");
const { name, version } = require("./package.json");
const util = require("util");

try {
    let logger = bunyan.createLogger({ name, version });
    let contactForm = ContactForm(config, logger);
    contactForm.expressApp.listen(config.get("port"));
}
catch(error) {
    if(error.type == "InvalidConfig") {
        console.error("Invalid configuration\n" + util.inspect(error.errors, false, 100, true));
    }
    else {
        console.error("FATAL", error);
    }
}
