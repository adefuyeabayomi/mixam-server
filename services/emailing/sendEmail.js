let nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
    service : "gmail",
    auth: {
        user : "adefuyeabayomi16@gmail.com",
        pass : "youarestupid"
    }
})

const mailOptions = {
    from : "adefuyeabayomi16@gmail.com",
    to: "adefuyeabayomi26@gmail.com",
    subject: "Login Activity",
    html: "<h1 style='background: red; color : white'> SENT</h1>"
}

transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });