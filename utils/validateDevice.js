function validate (deviceArray, requestDeviceID){
    let validated = false;
    deviceArray.forEach(x=>{
        if(validated){
            return;
        }
        x.id == requestDeviceID ? validated = true : false;
    })
    console.log("Device is Authorised : ", validated)
    return validated;
}
module.exports = validate;