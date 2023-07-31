const validateDevice = require("../utils/validateDevice")
let date = String(new Date()).split(" ").slice(0,4).join(" ");

async function followUser (fastify, options) {
    fastify.get("/followuser/",async (request,response)=>{
        let DID = request.query.DID;
        let MID = request.query.MID;
        let toFollow = request.query.toFollow;
        let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");
        
        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        let toFollowData = await userInfocollection.findOne({
            __mid : toFollow
        })

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        // save the follower and update user following
        let toFollowQuery = {
            __mid : toFollow
        }
        let userQuery = {
            __mid : MID
        }
        let updateDocument = {
            $push : {
                followers : { user : MID }
            }
        }
        let followedUser = await userInfocollection.updateOne(toFollowQuery,updateDocument);
        if(followedUser.acknowledged){
            console.log("successfully followed the user", toFollow);
        }
        else{
            return {
                status : "failed",
                reason : "unable to update user followers in the database"
            }
        }
        // update user following 
        let followingUpdated = await userInfocollection.updateOne(userQuery,{
            $push : {
                following : { user : toFollow }
            }
        })
        if(followingUpdated.acknowledged){
            console.log("successfully updated user following", MID);
        }
        else{
            return {
                status : "failed",
                reason : "unable to update user following in the database"
            }
        }

        let userNotificatonUpdateDocument;
        let toFollowNotificationUpdateDocument;
        let created = Date.now();
        let userNotificationItem = {
            created,
            type : "follow action success",
            text : "You followed " + toFollowData.username,
            action : "N/A",
            seen : false,
        }
        let toFollowNotificationItem = {
            created,
            type : "you were followed",
            text : userData.username + " started following you",
            action : "View Profile,Follow Back",
            seen : false
        }
        // update the user notification 
        // update user notification. => you followed {{toFollow}}
    let userDayInit = false; 
    userData.notifications.forEach(x=>{
        x.date = date ? userDayInit = true : userDayInit = false;
    })
    let toFollowDayInit = false;
    toFollowData.notifications.forEach(x=>{
        x.date = date ? toFollowDayInit = true : toFollowDayInit = false;
    }) 
    let options = {
        arrayFilters : [
            {
                "day.date" : date
            }
        ]
    }
    let updatedUserNotification;
    let updatedToFollowNotification;
        if(!userDayInit){
            userNotificatonUpdateDocument = {
                $push : {
                    notifications : {
                        date,
                        notifications : [userNotificationItem] 
                    }
                }
            }
            updatedUserNotification = await userInfocollection.updateOne(userQuery,userNotificatonUpdateDocument)
        }
        else {
            userNotificatonUpdateDocument = {
                $push : {
                    "notifications.$[day].notifications" : userNotificationItem
                }
            }
            updatedUserNotification = await userInfocollection.updateOne(userQuery,userNotificatonUpdateDocument,options)
        }
        if(!toFollowDayInit){
            toFollowNotificationUpdateDocument = {
                $push : {
                    notifications : {
                        date,
                        notifications : [toFollowNotificationItem] 
                    }
                }
            }
            updatedToFollowNotification = await userInfocollection.updateOne(toFollowQuery,toFollowNotificationUpdateDocument)
        }
        else {
            toFollowNotificationUpdateDocument = {
                $push : {
                    "notifications.$[day].notifications" : toFollowNotificationItem
                }
            }
            updatedToFollowNotification = await userInfocollection.updateOne(toFollowQuery,toFollowNotificationUpdateDocument,options)
        }

        // update tofollow notification => {{MID}} followed you + other details 
        // check if today has been initialized in the notification
        if(updatedToFollowNotification.acknowledged && updatedUserNotification.acknowledged){
            console.log("updated notification successfully");
        }
        else {
            console.log("unable to update notification")
        }
        userData = await userInfocollection.findOne({
            __mid : MID
        })
        toFollowData = await userInfocollection.findOne({
            __mid : toFollow
        })
        return {
            status  : "success",
            userData, 
            toFollowData
        }
    })
}
module.exports = followUser
/*
notifications = [
    {
        date : theDate,
        notifications : []
    }
]
*/