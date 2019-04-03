module.exports = (mailer, dataConfig, recipientEmail) => {
    let templates = {
        text: createTextTemplate(dataConfig),
        html: createHtmlTemplate(dataConfig)
    };

    return {
        sendEmail: (data, callback) => {
            if(!callback) {
                return new Promise((resolve, reject) => sendEmail(mailer, dataConfig, recipientEmail, templates, data, (error) => {
                    if(error) {
                        return reject(error);
                    }
                    resolve();
                }));
            }
            sendEmail(mailer, dataConfig, recipientEmail, templates, data, callback);
        }
    };
};

function createTextTemplate(dataConfig) {
    let fields = dataConfig.allowedFields.map((field) => {
        if(field.type == "long_text") {
            return `
${field.label}
--------------------------------------------
{{ &${field.name} }}
--------------------------------------------
`;
        }

        return `
${field.label}: {{ &${field.name} }}
`;
    }).join("");

    return `
Ny besked i din kontaktformular
===============================

${fields}
`;
}

function createHtmlTemplate(dataConfig) {
    let fields = dataConfig.allowedFields.map((field) => {
        if(field.type == "long_text") {
            return `
                <tr>
                    <th colspan="2" style="border: 1px solid #999; border-bottom: none; padding: 5px 7px;">
                        ${field.label}
                    </th>
                </tr>
                <tr>
                    <td colspan="2" style="border: 1px solid #999; border-top: none; padding: 5px 7px; white-space: pre-wrap;">{{ &${field.name} }}</td>
                </tr>
            `;
        }
        return `
            <tr>
                <th style="border: 1px solid #999; padding: 5px 7px;">${field.label}</th>
                <td style="border: 1px solid #999; padding: 5px 7px; white-space: pre-wrap;">{{ &${field.name} }}</td>
            </tr>
        `;
    }).join("");
    
    return `
        <table style="border-collapse: collapse; text-align: left; border: 1px solid #999;">
            <tbody>
                ${fields}
            </tbody>
        </table>
    `;
}

function sendEmail(mailer, dataConfig, recipientEmail, templates, data, callback) {
    // validate
    let validationErrors = dataConfig.allowedFields.map((allowedField) => {
        let value = data[allowedField.name];
        if(allowedField.required && (!value || value.trim() == "")) {
            return {
                field: allowedField.name,
                error: `Required field ${allowedField.name} missing or empty (value='${value}').`
            };
        }
        if(allowedField.type == "email") {
            if(!value.match(/^[^\s]+@[^\s]+$/) && !value.match(/^.+<[^\s]+@[^\s]+>$/)) {
                return {
                    field: allowedField.name,
                    error: `Required field ${allowedField.name} must be a valid email (value='${value}').`
                };
            }
        }
    }).filter((potentialError) => potentialError);

    validationErrors = validationErrors.concat(Object.keys(data).map((key) => {
        if(!dataConfig.allowedFields.some((allowedField) => allowedField.name == key)) {
            return {
                field: key,
                error: `Unrecognized field ${key} provided.`
            };
        }
    }).filter((potentialError) => potentialError));

    if(validationErrors.length) {
        return callback({
            type: "InvalidRequest",
            trace: new Error("Validation errors while checking data to send contact form email with."),
            validationReport: {
                errorCount: validationErrors.length,
                errors: validationErrors
            }
        });
    }

    // send email
    // - get email info fields
    let replyTo = data[dataConfig.replyToField];
    let subject = data[dataConfig.subjectField];

    // - clean data
    Object.keys(data).forEach((key) => {
        data[key] = data[key].replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
    });

    // - send email
    mailer.send(
        { subject, ...templates },
        { ...data, email: recipientEmail },
        { 'h:Reply-To': replyTo },
        callback
    );
}
