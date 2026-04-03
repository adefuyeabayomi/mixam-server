let nodemailer = require("nodemailer");
let emailUser = process.env.EMAILUSER;
let userPassword = process.env.EMAILUSERPASSWORD; 
let {emailFormats, parseEmailFormat} = require("./emailformats")
/**
 parseEmailFormat(forgotPasswordFormat.format,{
    username : "Adefuye Abayomi",
    new_password : "omolewa1122",
})
 */
function mailer(formatName, formatOptions, options) {
    return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // IMPORTANT
        auth: {
            user: emailUser,
            pass: userPassword
        }
    });

        let emailHTML = parseEmailFormat(
            emailFormats[formatName].format,
            formatOptions,
            Object.keys(emailFormats[formatName])
        );

        const mailOptions = {
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: emailHTML
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
                return reject(error);
            } else {
                console.log('Email sent: ' + info.response);
                return resolve(info);
            }
        });
    });
}

module.exports = mailer;