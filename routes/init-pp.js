// collections = mixam community posts. create and update posts. 
let fs = require("fs");
let path = require("path");
let validateDevice = require("../utils/validateDevice");
let generateID = require("../utils/generateID");
let notificationClass = require("../utils/notificationCreator");
 

async function publishpost(fastify, options){
    fastify.post("/publishpost/", async function (request, reply){
        // check the params property to make sure that the right details are contained in it.
        let requestBody = JSON.parse(request.body.params);
        // declare all static vaiables at the top.
        let MID = requestBody.MID;
        let DID = requestBody.DID;
        let postbody = requestBody.postbody;
        let postlink = requestBody.postlink;
        let hashtags = requestBody.hashtags; // send hashtag as an array.
        let photoUploaded = requestBody.photoUploaded;
        let photoUrl = requestBody.photoUrl || "";
        let actiontype = requestBody.actiontype;
        let created = Date.now();
        let date = String(new Date()).split(" ").slice(0,4).join(" "); 
        // date is in the format "Mon Mar 28 2022" Day Month Date Year
        let files = request.raw.files; 
        console.log("Request Body", requestBody);
        // operation variables

        let operationSuccess;
        var imageUploadSuccess = "not_available";

        // collection variables 
        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let allpostscollection  = fastify.mongo.db.collection("postCollection");
        let postperdaylistcollection  = fastify.mongo.db.collection("dailyPostList");
        let notificationCollection = fastify.mongo.db.collection("notificationsCollection");


        // variable user data.
        let userData = await userInfocollection.findOne({__mid:MID});
        console.log(userData);
        // reject request if from an unknown source.
        console.log(userData.devices,DID)
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        }                                                                                                           

        // initialize the post object;
        var postObj = {
                pid : generateID(30), 
                postbody,
                postlink,
                hashtags,
                imageurl : photoUrl,
                type : "post",
                date ,
                created ,
                author : userData.__mid,
                author_username : userData.username,
                author_image : userData.profileImageLink,
                likesCount : 0,
                likedBy : [], 
                comments : [],
                commentsCount : 0,
                viewsCount : 0,
                viewedBy : [],
                shareCount : 0,
                sharedBy : [],
                reportedInfo : [],
                banned : false,
                deleted : false,
                commentAllowed : true,
            }
        if(actiontype == "init"){ 
            // this case is for a new posts. it uses the mongo add 
            // add the post to the general post collection as a document.
            // add the post to the daily post record collection.
            // check if the date created is in the database
            let dayIsInitialized = await postperdaylistcollection.findOne({date});
            if(dayIsInitialized){
                let query = {date};
                let updateDocument = {
                    $push : {  
                        "posts" : { pid : postObj.pid , MID}
                    },
                    $inc: {
                        "count" : 1
                    }
                }
                let added = await postperdaylistcollection.updateOne(query,updateDocument)
                if(added.acknowledged){
                    console.log("added to post daily lists");
                }
                else{
                    return {
                        status : "failed",
                        reason : "unable to add to database"
                    }
                }
            }
            else {
                // in the postperdaycollection. everydocument has an identifier, the date and a post which is an array of pids put inside an object
                let initializeDay = await postperdaylistcollection.insertOne({date, posts : [{pid:postObj.pid}], count: 1})
                if(initializeDay.acknowledged){ 
                    console.log("added to post daily lists");
                }
                else{
                    return {
                        status : "failed",
                        reason : "unable to add to database"
                    }
                }
            }
            // finished adding to the daily lists.
            // add to the general collection.
            let addedToGeneral = await allpostscollection.insertOne(postObj);
            if(addedToGeneral.acknowledged){
                console.log("added to general posts")
                let authorQuery = {
                    __mid : MID,
                }
                let authorNotificationData = await notificationCollection.findOne(authorQuery);
                console.log("author notification data", authorNotificationData)
                if(!authorNotificationData){
                    console.log("author notificataion data not init", true,"initializing it now");
                    await notificationCollection.insertOne({
                        __mid : author,
                        notifications : []
                    })
                    authorNotificationData = await notificationCollection.findOne(authorQuery);
                    console.log(authorNotificationData)
                }
                let authorNotificationDayInit = false;
                if(!authorNotificationData){
                    console.log("author notificataion data not init", true,"initializing it now")
                }
                authorNotificationData.notifications.forEach(day=>{
                    if(authorNotificationDayInit) return;
                    if(day){
                        day.date == date ? authorNotificationDayInit = true : false;                
                    }
                })
                console.log("author notification day init ", authorNotificationDayInit)
                let text = `Your post was published successfully`;
                let notification = new notificationClass("content-published",text, "View");
                let notificationID = generateID();
                notification.addNID(notificationID);
                notification.addInfo("contentReference", postObj.pid);
                notification.addInfo("contentType","post");
                notification.addInfo("post-details", postObj.postbody);
                // create the notification updated document and send the notification
        
                let nUpdateDoc;
                let updatedAuthorNotification;
                let  nOptions = {
                    arrayFilters : [
                        { "day.date" : date }
                    ]
                }
                if(authorNotificationDayInit){
                    nUpdateDoc = {
                        $push : {
                            "notifications.$[day].notifications" : notification.getNotification()
                        }
                    }
                    updatedAuthorNotification = await notificationCollection.updateOne(authorQuery,nUpdateDoc,nOptions)
                }
                else {
                    nUpdateDoc = {
                        $push : {
                            notifications : {
                                date,
                                notifications : [notification.getNotification()]
                            }
                        }
                    }
                    updatedAuthorNotification = await notificationCollection.updateOne(authorQuery,nUpdateDoc)
                }
                authorNotificationData = await notificationCollection.findOne(authorQuery);
            
                let contributionDoc = {
                    pid : postObj.pid,
                    created : Date.now(),
                    type: "created-a-post"
                }
                let cUpdateDoc = {
                    $push : {
                        myContents : contributionDoc
                    }
                }
                let updatedContribution = await userInfocollection.updateOne({__mid : MID}, cUpdateDoc);

            }
            else{
                return {
                    status : "failed",
                    reason : "unable to add to database"
                }
            }
        }
        else {
            // the situation when the request is coming in for an update.
            // update to be made in the postObject = pid, created, date;
            postObj.created = requestBody.created;
            postObj.pid = requestBody.pid;
            postObj.date = requestBody.date;
            // add the post obj to the general collection.
            let query = {
                pid : postObj.pid,
            };
            let updateDocument = {
                $set : {
                    postbody : requestBody.postbody,
                    hashtags : requestBody.hashtags,
                    imageurl : postObj.imageurl
                }
            };
            let addedToGeneral = await allpostscollection.updateOne(query , updateDocument);
            if(addedToGeneral.acknowledged){
                console.log("added to general posts")
                let authorQuery = {
                    __mid : MID,
                }
                let authorNotificationData = await notificationCollection.findOne(authorQuery);
                console.log("author notification data", authorNotificationData)
                if(!authorNotificationData){
                    console.log("author notificataion data not init", true,"initializing it now");
                    await notificationCollection.insertOne({
                        __mid : author,
                        notifications : []
                    })
                    authorNotificationData = await notificationCollection.findOne(authorQuery);
                    console.log(authorNotificationData)
                }
                let authorNotificationDayInit = false;
                if(!authorNotificationData){
                    console.log("author notificataion data not init", true,"initializing it now")
                }
                authorNotificationData.notifications.forEach(day=>{
                    if(authorNotificationDayInit) return;
                    if(day){
                        day.date == date ? authorNotificationDayInit = true : false;                
                    }
                })
                console.log("author notification day init ", authorNotificationDayInit)
                let text = `Edit successful. Changes to your post has been saved.`;
                let notification = new notificationClass("content-edited",text, "View");
                let notificationID = generateID();
                notification.addNID(notificationID);
                notification.addInfo("contentReference", postObj.pid);
                notification.addInfo("contentType","post");
                notification.addInfo("post-details", postObj.postbody);
                // create the notification updated document and send the notification
        
                let nUpdateDoc;
                let updatedAuthorNotification;
                let  nOptions = {
                    arrayFilters : [
                        { "day.date" : date }
                    ]
                }
                if(authorNotificationDayInit){
                    nUpdateDoc = {
                        $push : {
                            "notifications.$[day].notifications" : notification.getNotification()
                        }
                    }
                    updatedAuthorNotification = await notificationCollection.updateOne(authorQuery,nUpdateDoc,nOptions)
                }
                else {
                    nUpdateDoc = {
                        $push : {
                            notifications : {
                                date,
                                notifications : [notification.getNotification()]
                            }
                        }
                    }
                    updatedAuthorNotification = await notificationCollection.updateOne(authorQuery,nUpdateDoc)
                }
                authorNotificationData = await notificationCollection.findOne(authorQuery);
            }
            else{
                return {
                    status : "failed",
                    reason : "unable to add to database"
                }
            }
        }
        // send post published notification here 



        return {
            status : "success",
            postObj 
        }
    })
}

module.exports = publishpost;