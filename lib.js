module.exports = (mailer, dataConfig, recipient) => {
    validateConfiguration(dataConfig, recipient);

    let templates = {
        text: createTextTemplate(dataConfig),
        html: createHtmlTemplate(dataConfig)
    };

    return {
        sendEmail: (data, callback) => {
            if(!callback) {
                return new Promise((resolve, reject) => sendEmail(mailer, dataConfig, recipient, templates, data, (error) => {
                    if(error) {
                        return reject(error);
                    }
                    resolve();
                }));
            }
            sendEmail(mailer, dataConfig, recipient, templates, data, callback);
        }
    };
};

function validateConfiguration(dataConfig, recipient) {
    let errors = [];

    findRecipientConfigurationErrors(recipient, errors);
    findDataConfigurationErrors(dataConfig, errors);

    if(errors.length) {
        throw {
            type: "InvalidConfig",
            trace: new Error("The configuration for contact-form-api is invalid!"),
            errors
        };
    }
}

function findRecipientConfigurationErrors(recipient, errors) {
    if(!recipient) {
        errors.push({
            field: "recipient",
            error: "Recipient is undefined/missing"
        });
        return;
    }

    if(!isNonEmptyString(recipient.email)) {
        errors.push({
            field: "recipient.email",
            error: "Recipient email is undefined/missing.",
            value: recipient.email
        });
    }
    else if(!isEmail(recipient.email)) {
        errors.push({
            field: "recipient.email",
            error: "Recipient email is not a valid email.",
            value: recipient.email
        });
    }

    findNonEmptyStringErrors(recipient, "name", "recipient.name", errors);
}

function isNonEmptyString(value) {
    return value && value.trim() != "";
}

function isEmail(value) {
    return value.match(/^[^\s]+@[^\s]+$/) || value.match(/^.+<[^\s]+@[^\s]+>$/);
}

function findNonEmptyStringErrors(obj, key, field, errors) {
    let value = obj[key];

    if(!isNonEmptyString(value)) {
        errors.push({
            field,
            value,
            error: "Field is empty or missing.",
        });
    }
}

function findDataConfigurationErrors(dataConfig, errors) {
    if(!dataConfig) {
        errors.push({
            field: "data",
            error: "data configuration is undefined/missing"
        });
        return;
    }

    findAllowedFieldsConfigurationErrors(dataConfig.allowedFields, errors);
    findReferenceFieldErrors(dataConfig, "subjectField", errors);
    findReferenceFieldErrors(dataConfig, "replyToField", errors);
}

function findAllowedFieldsConfigurationErrors(allowedFields, errors) {
    // - allowed fields
    if(!allowedFields || !allowedFields.length || !Array.isArray(allowedFields)) {
        errors.push({
            field: "data.allowedFields",
            error: "Data configuration is missing `allowedFields` list (must be array)",
            value: allowedFields
        });
        return;
    }

    allowedFields.forEach((allowedField, i) => {
        let subErrors = [];

        findNonEmptyStringErrors(allowedField, "name", "name", subErrors);
        findNonEmptyStringErrors(allowedField, "label", "label", subErrors);

        if(!isValidFieldType(allowedField.type)) {
            subErrors.push({
                field: "type",
                error: "Type was invalid type (valid types are 'short_text', 'long_text' and 'email')",
                value: allowedField.type
            });
        }
        if(!isBoolean(allowedField.required)) {
            subErrors.push({
                field: "required",
                error: "Required must be true or false",
                value: allowedField.required
            });
        }

        if(subErrors.length) {
            errors.push({
                field: `data.allowedFields[${i}]`,
                error: "Invalid configuration of field",
                subErrors
            });
        }
    });
}

function isValidFieldType(value) {
    return [ "short_text", "long_text", "email" ].includes(value);
}

function isBoolean(value) {
    return value === true || value === false;
}

function findReferenceFieldErrors(dataConfig, fieldName, errors) {
    if(!isNonEmptyString(dataConfig[fieldName])) {
        errors.push({
            field: `data.${fieldName}`,
            error: "Field is empty or missing",
            value: dataConfig[fieldName]
        });
    }
    else if(!dataConfig.allowedFields.some((allowedField) => allowedField.name == dataConfig[fieldName])) {
        errors.push({
            field: `data.${fieldName}`,
            error: "No allowed field (in 'data.allowedFields') has a name matching the field",
            value: dataConfig[fieldName],
            allowedFieldNames: dataConfig.allowedFields.map((allowedField) => allowedField.name)
        });
    }
}

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

function sendEmail(mailer, dataConfig, recipient, templates, data, callback) {
    // validate
    let validationErrors = dataConfig.allowedFields.map((allowedField) => {
        let value = data[allowedField.name];
        if(!allowedField.required && !value) {
            return;
        }
        if(allowedField.required && !value) {
            return {
                field: allowedField.name,
                error: `Required field ${allowedField.name} missing.`,
                value
            };
        }
        if(!isNonEmptyString(value)) {
            return {
                field: allowedField.name,
                error: `Field ${allowedField.name} empty.`,
                value
            };
        }
        if(allowedField.type == "email") {
            if(!isEmail(value)) {
                return {
                    field: allowedField.name,
                    error: `Required field ${allowedField.name} must be a valid email.`,
                    value
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
        { ...data, ...recipient },
        { 'h:Reply-To': replyTo },
        callback
    );
}
