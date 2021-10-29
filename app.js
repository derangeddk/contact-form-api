const express = require("express");

module.exports = (contactForm, logger) => {
    let app = express();

    app.use(express.json());

    app.post("/", (req, res) => {
        contactForm.sendEmail(req.body, (error) => {
            if(error && error.type == "InvalidRequest") {
                return res.status(400).send(error.validationReport);
            }
            if(error) {
                logger.error({ error, body: req.body }, "Failed to send email from request.");
                return res.status(500).send({ error: "Unknown error, try again." });
            }
            res.send({});
        });
    });

    app.get("/config", (req, res) => {
        res.send({ allowedFields: contactForm.allowedFields });
    });

    return app;
};
