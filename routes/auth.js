const validateDevice = require("../utils/validateDevice");
let generateID = require("../utils/generateID");

async function auth (fastify,options) {
    fastify.get("/apiservice/auth/",async ( request , reply ) => {
        let collection = fastify.mongo.db.collection("usersAccountInformation");
        let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
        let email = request.query.email;
        let password = request.query.password;
        let loginType = request.query.loginType;
        let authType = request.query.authType;
        let date = String(new Date()).split(" ").slice(0,4).join(" "); 
        let DID = request.query.DID;
        let newDevice = request.query.newDevice;
        let deviceIDObject = {
            id : DID,
            verified : false,
            verifyToken : generateID(),
            master : false,
        }
        let query = {
            email
        }
        let response = {};
        let userAccountInfo = await collection.findOne(query); 
        //handler.retrieve returns either an object or null when it actually finished the database operations and false if an error occured
        //before any successful response is sent, i check if the device id is there already if yes, login the user, if no add the device ID as an authorized Device. Send a notification to the user.
        
        let userExist = userAccountInfo !== null;
        let deviceInfo;
        if(userExist){
            userAccountInfo.devices.forEach(x=>{
                x.id == DID ? deviceInfo = x : false
            })
        }
        console.log("device info : ", deviceInfo)
        // handles condition where the user exists and the authType is login userAccountInfo is of type object.
        if(userExist && authType == "login"){
            // so validate device is primitive to function alone in the auth section of the app
            // so before the validation, the device id must be checked. if the request indicates that it is a new device then a new device object must be creaetd for the very purpose and the database must be updated
            console.log("new device : ", newDevice, typeof newDevice, deviceInfo)
            let newDeviceRes;
            if(newDevice == "true" || deviceInfo == undefined || deviceInfo.verified == false || !deviceInfo.master){
                // update the database with the new device id pairing and return the status needs verification
                console.log("new device", newDevice)
                console.log(deviceIDObject)
                let updateDoc = {
                    $push : {
                        devices : deviceIDObject,
                    }
                }
                if(newDevice == "true"){
                    let added = await collection.updateOne(query,updateDoc)
                    if(added.acknowledged){
                        console.log("successfully added the new device pairing for this account. Now awaiting verification for this account owner")
                        userAccountInfo.devices = null;    
                        newDeviceRes = {
                            status : "verification_required",
                            message : "For security reasons, we need to verify this device. A verification link has been sent to " + userAccountInfo.email,
                        }
                        // this is definitely a new device.
                        // send device verification email here
                        // DEVICE VERIFICATION EMAIL HERE
                        const verifyDeviceMailOptions = {
                            from : "Mixam Business<abayomiadefuye1@gmail.com>",
                            to : userAccountInfo.email,
                            subject : "Verification Required For This Login.",
                        }
                        let verifyToken = deviceIDObject.verifyToken;
                        let link = `http://mixam-business.onrender.com/verify-account/?MID=${userAccountInfo.__mid}&DID=${DID}&verifyToken=${verifyToken}`;
                        const formatOptions = {
                            username : userAccountInfo.username,
                            link
                        }
                        const FormatName = "verify";
                        options.mailer(FormatName,formatOptions,verifyDeviceMailOptions);
                        // Email sent to user.
                    }
                    else {
                        console.log("unable to add the new device")
                        userAccountInfo.devices = null;
                        return {
                            status : "failed",
                            message : "unable to add new devices to the database"
                        }
                    }
                }
                newDeviceRes = {
                    status : "verification_required",
                    message : "For security reasons, we need to verify this device. A verification link has been sent to " + userAccountInfo.email,
                }
                // here is just a new device that has been registered and now needs verification to be allowed access. all things being equal, he recieved a mail. if not then he can use resend
                // mail functionalities to get a new mail.

            }
            else{
                let authorizedUser = validateDevice(userAccountInfo.devices, DID)
                if(!authorizedUser){
                    return {
                        status : "failed",
                        errorMessage : "This device is not authorized to login to this account. Reason unknown request origin"
                    }
                }
            }
            userAccountInfo.devices = null;
            if(loginType == userAccountInfo.loginType){
                if(loginType == "manual"){
                    if(userAccountInfo.password == password){
                        console.log("userAccountInfo.password = password")
                        response.status = "success";
                        response.successMessage = "Okay";
                        response.__userAccountData = userAccountInfo;
                        response.new_user = false;
                        response.deviceInfo = deviceInfo;
                            if(newDeviceRes){
                                response = newDeviceRes;

                            }
                    }
                    else{
                        console.log("login password not a match with userAcount info password")
                        response.status = "request_denied";
                        response.errorMessage = "Password does not match. Did you forget your password? Kindly use the forgot password link to recover your password.";
                    }
                }
                else{
                    console.log("loginType is not manual and the userExists")
                    response.status = "success";
                    response.successMessage = "Okay";
                    response.__userAccountData = userAccountInfo;
                    response.new_user = false;
                }                
            }
            else {
                console.log("user did not login with the method used to open account");
                response.status = "request_denied";
                response.errorMessage = `The User with email ${email} signed up with ${userAccountInfo.loginType == 'manual' ? "an Email and Password combination" : userAccountInfo.loginType.toUpperCase()}. For security reasons, this login request has to be declined. Please use " ${userAccountInfo.loginType == 'manual' ? 'Email and Password " to login to your Mixam Business account.' : 'Google sign in " to login to your Mixam Business account.'}`;
            }
        }
        if(userExist && authType == "signup" && loginType !== "manual" ){
            response.status = "success";
            response.successMessage = "Okay";
            response.__userAccountData = userAccountInfo;
            response.new_user = false;
        }
        if(userExist && authType == "signup" && loginType == "manual"){
            console.log("user exists in database and authtype is signup and login type is manual")
            response.status = "request_denied";
            response.errorMessage = "This account " + email + " has already been registered with our service. Kindly use our login page to login to your account.";
        }
        //handles case where the user does not exist in our database
        if(userAccountInfo == null){
            console.log("user doesnt exist in db")
            if(authType == "login" & loginType == "manual"){
                console.log("request denied because the authtype is login and the logintype is manual")
                response.status = "request_denied";
                response.errorMessage = "This email has not been registered on this website. Please Go to the sign up page and Sign up with preferred method";
            }
            else {
                console.log("Adding new user to the database");
                let mid = generateID(30);
                console.log("Mixam User ID : ", mid);
                // add mixam welcome notifications to the user notification objects
                deviceIDObject.master = true;
                let document = {
                        email,
                        password,
                        loginType,
                        devices : [deviceIDObject],
                        recoveryEmail : "",
                        securityQuestion : "",
                        answerToSecurityQuestion : "",
                        profileImageLink : "",
                        username: "",
                        userbusiness : "",
                        interests : [],
                        lastLoggedIn: "",
                        created : Date.now(),
                        following : [],
                        followers : [],
                        notifications : [],
                        favourites : [],
                        myCourses : [],
                        savedCourses : [],
                        __mid: mid,
                        activityLog : [],
                        welcomeDataComplete : false,
                        welcomeProgress : "welcome",
                        shared_to_profile : [],
                        muted_content : [],
                        muted_people : [],
                        learning_milestones : [],
                        drafts : [],
                        contributions : [],
                        myContents : [],
                        mixam_celeb : false
                    }
                let userAdded = await collection.insertOne(document);
                // initialize the user's notification
                let userNotificationInit = {
                    __mid : mid,
                    notifications : []
                }
                let initializedNotification = await notificationCollection.insertOne(userNotificationInit);
                if(initializedNotification.acknowledged){
                    console.log("notification-initialized");
                }
                else {
                    console.log("unable to initialize the notification");
                }
                console.log("userAdded",userAdded)
                if(userAdded.acknowledged){
                    console.log("user Added to the database")
                    response.status = "success";
                    response.__userAccountData = document;
                    response.new_user = true;
                    response.successMessage="Okay";
                }
                else{
                    console.log("db operation was unable to be completed");
                    response.status = "request_denied";
                    response.errorMessage = "Sorry, We are unable to log you in now. Our technical team are working make sure you get up and running as soon as possible.";
                    console.log("addEntry operation failed");
                }
            }
        }
        console.log("response", response);
        response.deviceInfo = deviceInfo || deviceIDObject;
        console.log("response", response)
        return response;
    })
}
module.exports = auth;