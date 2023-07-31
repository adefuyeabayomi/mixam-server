let fs = require("fs"); 
const path = require("path");
const validateDevice = require("../utils/validateDevice");
const notificationClass = require("../utils/notificationCreator");
const generateID = require("../utils/generateID");
// after the completion of the welcome data section, welcome and verify account emails are sent along with in
// app notifications then i move to fulll content item functionalities and proper notification

async function handleAddUserDataInit(fastify,options){
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
    let socketReference = options.socketReference;
    let mailer = options.mailer;
    fastify.post("/submitdatainit/", async function (request,reply){
        console.log("request.body", request.body);
        let action = request.body.params.action || JSON.parse(request.body.params).action;
        let data = request.body.params.data || request.body.profilephotoupload.data;
        let MID = request.body.params.MID || JSON.parse(request.body.params).MID;
        let DID = request.body.params.DID || JSON.parse(request.body.params).DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let collection = fastify.mongo.db.collection("usersAccountInformation");
        let userData = await collection.findOne({__mid:MID});
        if(userData == null || !validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let userExist = userData !== null;
        let deviceInfo;
        if(userExist){
            userData.devices.forEach(x=>{
                x.id == DID ? deviceInfo = x : false
            })
        }
        console.log("device info : ", deviceInfo)
        let initNotifications = false;
        switch (action) {
            case "addusername" : {
                let added = await collection.updateOne({__mid:MID},{$set : {username: data}});  
                console.log("add username successful", added.acknowledged);
                if(added.acknowledged){
                    await collection.updateOne({__mid : MID}, {
                        $set : {
                            welcomeProgress : "uploadphoto"
                        }
                    })
                }
                return added.acknowledged ? 
                {
                    status : "success"
                } : 
                {
                    status : "failed"
                };
                break;
            }
            case "adduseremployment" : {
                console.log("data", data)
                let added = await collection.updateOne({__mid : MID}, {
                    $set : {"employment_status" : data }
                });
                console.log("add employment successful", added.acknowledged)
                if(added.acknowledged){
                    await collection.updateOne({__mid : MID}, {
                        $set : {
                            welcomeProgress : "preferredActivities"
                        }
                    })
                } 
                return added.acknowledged ? 
                {
                    status : "success"
                } : 
                {
                    status : "failed"
                }; 
            }
            case "adduserpreferredactivities" : {
                
                console.log("data", data)
                let added = await collection.updateOne({__mid : MID}, {
                    $set : {"preferred_activities" : data }
                });
                console.log("add interest successful", added.acknowledged) 
                if(added.acknowledged){
                    await collection.updateOne({__mid : MID}, {
                        $set : {
                            welcomeProgress : "pickInterest"
                        }
                    })
                }
                return added.acknowledged ? 
                {
                    status : "success"
                } : 
                {
                    status : "failed"
                };
            }
            case "adduserinterest" : {
                console.log("data", data)
                let added = await collection.updateOne({__mid : MID}, {
                    $set : {"interests" : data }
                });
                console.log("add interest successful", added.acknowledged) 
                if(added.acknowledged){
                    await collection.updateOne({__mid : MID}, {
                        $set : {
                            welcomeProgress : "done",
                            welcomeDataComplete : true,
                        }
                    })
                }
                initNotifications = true;
                if(initNotifications){
                    // define notification query
                    let nQuery = {
                        __mid : MID
                    }
                    let typeW = "welcome";
                    let textW = `Welcome to Mixam ${userData.username}. Good to have you.`;
                    let actionW = "N/A"
                    let notificationIDW = generateID();
                    let addressedTo = {
                        MID : userData.__mid,
                        username : userData.username
                    }
                    let welcomeNotification = new notificationClass(typeW,textW,actionW,addressedTo);
                    welcomeNotification.addNID(notificationIDW);

                    let typeG = "getting-started";
                    let textG = `${userData.username}, Learn how to make the best of the time you spend on this platform`;
                    let actionG = ``;
                    let notificationIDG = generateID();
                    let gettingStartedNotification = new notificationClass(typeG,textG,actionG,addressedTo);
                    gettingStartedNotification.addNID(notificationIDG)
                    

                    let notificationsArray = [
                        gettingStartedNotification.getNotification(),
                        welcomeNotification.getNotification(),
                    ]
                    let addedInitNotifications = await notificationCollection.updateOne(nQuery, {
                        $push : {
                            notifications : {
                                date,
                                notifications : notificationsArray
                            }
                        }
                    })
                    if(addedInitNotifications.acknowledged){
                        console.log("initial-notification-sent");
                        // SEND DATA TO THE SOCKET
                        // step 1 bind the websocket server to a variable;
                        let sendObject = {
                            type : "notification",
                            data : notificationsArray
                        }
                        fastify.websocketServer.clients.forEach(client=>{
                            console.log("client.MID from welcome data", client.MID);
                            if(client.MID == MID){
                                client.send(JSON.stringify(sendObject));
                            }
                        })
                    }
                    else {
                        console.log("unable to send the init-notification")
                    }
                    // SEND WELCOME NOTIFICATIONS.

                    // SEND GETTING STARTED NOTIFICATION


                    // SEND WELCOME EMAIL
                    const welcomeMailOptions = {
                        from : "Mixam Business<abayomiadefuye1@gmail.com>",
                        to : userData.email,
                        subject : "Welcome To Mixam",
                    }
                    const welcomeFormatOptions = {
                        username : userData.username,
                        verify_token : deviceInfo.verifyToken,
                        device_id : DID,
                        mid : MID
                    }
                    const welcomeFormatName = "welcome";
                    options.mailer(welcomeFormatName,welcomeFormatOptions,welcomeMailOptions);
                }

                return added.acknowledged ? 
                {
                    status : "success"
                } : 
                {
                    status : "failed"
                };
            }
            case "addprofilephoto" : {
                let profileImageLink = request.body.params.profileURL|| JSON.parse(request.body.params).profileURL;
                console.log("profileimglink",profileImageLink);
                let added;
                added = collection.updateOne({__mid:MID},{ $set : {profileImageLink}});
                console.log("photo upload successful  to both cloudinary and database",{profileImageLink});
                   if(true){
                    
                if(added.acknowledged){
                    await collection.updateOne({__mid : MID}, {
                        $set : {
                            welcomeProgress : "description"
                        }
                    })
                }
                else {
                    return {
                        status : "failed",
                        reason : "unable to access cloudinary or the database"
                    }
                }
                return {
                    status : "success",
                    profileImageLink                    
                }
                }
            }	
        }
    })
}

module.exports = handleAddUserDataInit;