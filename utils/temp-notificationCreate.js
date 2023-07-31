// global vars
let date;
let notificationCollection;
let notificationClass = require("");
// get user notification data
let userQuery = {
    __mid : MID
}
let notifcationData = await notificationCollection.findOne(userQuery);
// determine if the notification day is initialized
let dayInit = false;
notifcationData.notifications.forEach(x=>{
    x.date == date ? dayInit = true : false;
}) 
// initialize a new day if it has not been initialized 
if(!dayInit){
    let addNotificationDayDoc = {
        $push : {
            "notifications" : {
                date ,
                notifications : []
            }
        } 
    }
    let addedNotificationDay = await notificationCollection.updateOne(userQuery,addNotificationDayDoc);
    // success except something went wrong which usually does not happen
}
// move on to initialize the notification
let type;
let text;
let action;
let addressedTo;
let notificationID;
let notification = new notificationClass(type,text,action,addressedTo);
notification.addNID(notificationID);

let updateDocument = {
    $push : {
        "notifications.$[theNotification].notifications" : notification.getNotification(),
    }
}

let sendOptions = {
    arrayFilters : [
        {
            "theNotification.date" : date
        }
    ]
}

let updatedNotificationDb = await notificationCollection.updateOne(userQuery,updateDocument,sendOptions);

if(updatedNotificationDb.acknowledged){
    let data = {
        type : String,
        data : Object
    };
    fastify.websocketServer.clients.forEach(x=>{
        if(x.MID == MID){
            x.send(JSON.stringify(data));
            console.log("send data to recipients");
        }
    })
    console.log("notification updated");

}
else{
    console.log("unable to update notification");
}















// keepsake never part of the real deal
/*
if(!toFollowNotificationData){
    await notificationCollection.insertOne({
        __mid : toFollow,
        notifications : []
    })
    toFollowNotificationData = await notificationCollection.findOne(toFollowQuery)
}
if(!userNotificationData){
    await notificationCollection.insertOne({
        __mid : MID,
        notifications : []
    })
    userNotificationData = await notificationCollection.findOne(userQuery);
}*/




