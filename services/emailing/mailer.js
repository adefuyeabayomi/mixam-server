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
function mailer ( formatName , formatOptions , options ){
    let client = nodemailer;
    let formats = emailFormats;
    let user = emailUser;
    let pass = userPassword;
    console.log("format is array", typeof formats[formatName].format, Array.isArray(formats[formatName].format), formatName)
    let emailHTML = parseEmailFormat(formats[formatName].format,formatOptions, Object.keys(formats[formatName]));
    let transporter = client.createTransport({
        service : "gmail",
        auth: {
            user,
            pass 
        }
    });
    
    const mailOptions = {
        from : options.from,
        to: options.to,
        subject: options.subject,
        html: emailHTML
    }

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}

module.exports = mailer;