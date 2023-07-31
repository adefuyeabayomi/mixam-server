let fs = require("fs");

function extractFormat(name){    
    let format = fs.readFileSync(name)
    format = format.toString();
    let sortedL1 = [];
    sortedL1 = format.split("{{");
    let sortedL2 = [];
    for(let each of sortedL1){
        let splitted = each.split("}}");
        splitted.forEach(x=>{
            sortedL2.push(x);
        })
    }
    format = sortedL2;
    return format;
}


function parseEmailFormat(format,formatOptions){
    let email = [];
    for(let each of format){
        if(formatOptions[each]){
            email.push(formatOptions[each])
        }
        else{
            email.push(each);
        }
    }
    email = email.join(" ");
    return email;
}
// Email Formats
let forgotPasswordFormat = {
    format : extractFormat("./services/emailing/forgotpassword.html"),
    variables : ["username","new_password"]
}
let welcomeFormat = {
    format : extractFormat("./services/emailing/welcome.html"),
    variables : ["username","verify_token"]
}
let verifyFormat = {
    format : extractFormat("./services/emailing/verify_new_device.html"),
    variables : ["link", "username"]
}

let emailFormats = {
    forgot_password: forgotPasswordFormat,
    welcome : welcomeFormat,
    verify : verifyFormat
};
module.exports ={
    emailFormats,
    parseEmailFormat
};