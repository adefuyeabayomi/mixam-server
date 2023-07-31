const validateDevice = require("../utils/validateDevice");
let generateID = require("../utils/generateID")
let notificationClass = require("../utils/notificationCreator");
async function contentItemFunctionalities (fastify, options){
    // global variables here
    let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");
    let articleCollection = fastify.mongo.db.collection("articles_main");
    let courseCollection = fastify.mongo.db.collection("course_main");
    let postsCollection  = fastify.mongo.db.collection("postCollection");
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
    let feedDataCollection = fastify.mongo.db.collection("feedDataCollection");
    //console.log("options from the content item ", options)

    // follow user 
    fastify.get("/followuser/",async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let toFollow = request.query.toFollow;
        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        let toFollowData = await userInfocollection.findOne({
            __mid : toFollow
        })
        console.log("follow request queries", request.queries);
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
                followers : { user : MID , imgLink : userData.profileImageLink, username : userData.username}
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
                following : { user : toFollow , imgLink : toFollowData.profileImageLink, username : toFollowData.username}
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
        // This is a 

let toFollowNotificationData = await notificationCollection.findOne(toFollowQuery); 
let userNotificationData = await notificationCollection.findOne(userQuery);

    let userDayInit = false;
    userNotificationData.notifications.forEach(x=>{
        x.date == date ? userDayInit = true : userDayInit = false;
    })
    let toFollowDayInit = false;
    toFollowNotificationData.notifications.forEach(x=>{
        x.date == date ? toFollowDayInit = true : toFollowDayInit = false;
    }) 

    let notificationIDT = generateID();
    let notificationIDU = generateID();
    let textT = `${userData.username} followed you`;
    let textU = `You followed ${toFollowData.username}`
    let notificationItemT = new notificationClass("new-follower",textT,"follow-back",toFollow);
    notificationItemT.addNID(notificationIDT);
    notificationItemT.addInfo("followed-by",MID);
    let notificationItemU = new notificationClass("follow-success",textU,"N/A",MID)
    notificationItemU.addNID(notificationIDU);
    notificationItemU.addInfo("follow-info",toFollow);
    console.log(notificationItemT.getNotification(), notificationItemU.getNotification())
    let options = {
        arrayFilters : [
            {
                "day.date" : date
            }
        ]
    }
    
    let userNotificatonUpdateDocument;
    let toFollowNotificationUpdateDocument;

    let updatedUserNotification;
    let updatedToFollowNotification;
        if(!userDayInit){
            userNotificatonUpdateDocument = {
                $push : {
                    notifications : {
                        date,
                        notifications : [notificationItemU.getNotification()] 
                    }
                }
            }
            updatedUserNotification = await notificationCollection.updateOne(userQuery,userNotificatonUpdateDocument)
        }
        else {
            userNotificatonUpdateDocument = {
                $push : {
                    "notifications.$[day].notifications" : notificationItemU.getNotification()
                }
            }
            updatedUserNotification = await notificationCollection.updateOne(userQuery,userNotificatonUpdateDocument,options)
        }
        if(!toFollowDayInit){
            toFollowNotificationUpdateDocument = {
                $push : {
                    notifications : {
                        date,
                        notifications : [notificationItemT.getNotification()] 
                    }
                }
            }
            updatedToFollowNotification = await notificationCollection.updateOne(toFollowQuery,toFollowNotificationUpdateDocument)
        }
        else {
            toFollowNotificationUpdateDocument = {
                $push : {
                    "notifications.$[day].notifications" : notificationItemT.getNotification()
                }
            }
            updatedToFollowNotification = await notificationCollection.updateOne(toFollowQuery,toFollowNotificationUpdateDocument,options)
        }

        // send to notification stream 
        let dataT = {
            type : "notification",
            data : notificationItemT.getNotification()
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == toFollow){
                x.send(JSON.stringify(dataT));
                console.log("send data to recipients")
            }
        })
        let dataU = {
            type : "notification",
            data : notificationItemU.getNotification()
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == MID){
                x.send(JSON.stringify(dataU));
                console.log("send data to recipients")
            }
        })
        // sent the notification
        userData = await userInfocollection.findOne({__mid : MID})
        // return stil needs trimming though to conserve user internet data
        return {
            status  : "success",
            userData
        }
    })
    // unfollow user
    fastify.get("/unfollowuser/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let toUnfollow = request.query.toUnfollow;

        let toUnfollowQuery = {
            __mid : toUnfollow
        }
        let userQuery = {
            __mid : MID
        }

        let userData = await userInfocollection.findOne(userQuery)

        let toUnfollowData = await userInfocollection.findOne(toUnfollowQuery)

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        // remove the follower from user' following 
        let userUpdateDocument = {
            $unset : {
                "following.$[userIdentifier]" : ""
            }
        }
        let optionsUUD = {
            arrayFilters : [
                {
                    "userIdentifier.user" : toUnfollow
                }
            ]
        }
        let optionsTUUD = {
            arrayFilters : [
                {
                    "userIdentifier.user" : MID
                }
            ]
        }
        let removeFollowing = await userInfocollection.updateOne(userQuery,userUpdateDocument,optionsUUD)
        // remove following from toUnfollow's followers

        let toUnfollowUpdateDocument = {
            $unset : {
                "followers.$[userIdentifier]" : ""
            }
        }

        let removeFollower = await userInfocollection.updateOne(toUnfollowQuery,toUnfollowUpdateDocument,optionsTUUD)
        
        if(removeFollower.acknowledged && removeFollowing.acknowledged){
            console.log("completed following / follower document update");
        }
        else{
            console.log("unable to complet following/ follower document update")
            return {
                status  : "failed",
                reason : "unable to complete the unfollow action."
            }
        }
        // notify the user;
        let notificationID = generateID();
        let userNotificationItem = new notificationClass("unfollow-success", "You unfollowed " + toUnfollowData.username + " successfully.", "N/A",MID);
        userNotificationItem.addInfo("unfollowed_username", toUnfollowData.username);
        userNotificationItem.addInfo("unfollowed_mid",toUnfollowData.__mid);
        userNotificationItem.addNID(notificationID);
        console.log("user-----notification",userNotificationItem.getNotification())
        let notifcationData = await notificationCollection.findOne({
            __mid : MID
        });
        // determine if the notification day is initialized
        let dayInit = false;
        notifcationData.notifications.forEach(x=>{
            x.date == date ? dayInit = true : false;
        }) 
        let userNotificationUpdate;
        if(!dayInit){
            let addNotificationDayDoc = {
                $push : {
                    "notifications" : {
                        date ,
                        notifications : []
                    }
                }
            }
            let addedNotificationDay = await notificationCollection.updateOne(query,addNotificationDayDoc);
            // success except something went wrong which usually does not happen
        }

        let userNotificationUpdateDoc = {
            $push : {
                "notifications.$[day].notifications" : userNotificationItem.getNotification()
            }
        }
        let options = {
            arrayFilters : [
                {
                    "day.date" : date
                }
            ]
        };
        userNotificationUpdate = await notificationCollection.updateOne(userQuery,userNotificationUpdateDoc,options)
        // updated user notification
        if(userNotificationUpdate.acknowledged){
            let data = {
                type : "notification",
                data : userNotificationItem.getNotification()
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == MID){
                    x.send(JSON.stringify(data));
                    console.log("send data to recipients")
                }
            })
        }
        //NOW REMOVE NOTIFICATION FROM THE USER WHO GOT UNFOLLOWED I'm not bothering anymore


        userData = await userInfocollection.findOne({
            __mid : MID
        })
        toUnfollowData = await userInfocollection.findOne({
            __mid : toUnfollow
        })
        console.log("request unfollow completed", typeof userData, typeof toUnfollowData)
        return {
            status  : "success",
            userData, 
            toUnfollowData
        }
    })
    // add to favourite
    fastify.get("/addtofavourite/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let typec = request.query.type;
        let content = request.query.content;
        let userQuery = {
            __mid : MID
        }        

        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let favDoc = {
            created : Date.now(),
            typec,
            collection : "business"
        }
        if(typec == "post"){
            favDoc.pid = pid;
        }
        else {
            favDoc.aid = aid;
        }
        console.log("favDoc", favDoc)

        let dayInit = false;

        userData.favourites.forEach(x=>{
            if(dayInit) return;
            x.date == date ?  dayInit = true : false;
        })

        let updateDocument;
        let options = {
            arrayFilters : [
                {"day.date" : date}
            ]
        }
        let addedFavourites;
        if(dayInit){
            updateDocument = {
                $push : {
                    "favourites.$[day].saved" : favDoc
                }
            }
            addedFavourites = await userInfocollection.updateOne(userQuery,updateDocument,options)
        }
        else{
            updateDocument = {
                $push : {
                    "favourites" : {
                        date,
                        saved : [favDoc]
                    }
                }
            }
            addedFavourites = await userInfocollection.updateOne(userQuery,updateDocument)
        }

    

        if(addedFavourites.acknowledged){
            console.log("added to favourites successfully");
            // SEND NOTIFICATION HERE
            // get user notification data
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
            typec[0] = typec[0].toUpperCase();
            let type = "added-to-favourites"
            let text = typec + " added to favourites successfully... " + content;
            let action = "view-favourites";
            let addressedTo = MID;
            let notificationID = generateID();
            let notification = new notificationClass(type,text,action,addressedTo);
            notification.addNID(notificationID);
            notification.addInfo("content", content);
            notification.addInfo("ref", aid || pid || cid)

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
                console.log("notification updated");
                let data = {
                    type:"notification",
                    data : notification.getNotification()
                };
                fastify.websocketServer.clients.forEach(x=>{
                    if(x.MID == MID){
                        x.send(JSON.stringify(data));
                        console.log("send data to recipients")
                    }
                })
            }
            else{
                console.log("unable to update notification");
            }


            return {
                status : "success",
                reason : "added favDoc successfully",
            }
        }
        else {
            console.log("unable to add to the database")
            return {
                status : "failed",
                reason : "Unable to add favDoc to the database"
            }
        }
    })
    // save course for later
    fastify.get("/savecourseforlater/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let cid = request.query.cid;

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let savCDoc = {
            cid,
            created : Date.now(),
        }
        let updateDocument = {
            $push : {
                "savedCourses" : savCDoc
            }
        }
        let savedCourse = await userInfocollection.updateOne(userQuery,updateDocument);
            userData = await userInfocollection.findOne(userQuery);

        if(savedCourse.acknowledged){
            console.log("saved course successfully");
            return {
                status : "success",
                message : "saved course successfully",
                userData
            }
        }
        else {
            console.log("unable to save course")
            return {
                status  : "failed",
                reason : "unable to save course to database"
            }
        }
    })
    // like
    fastify.get("/like/", async (request,response)=>{
        // global variables 

        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let contentType = request.query.contentType;
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        // validate using user data fetched
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        // init content data and content query
        let contentData;
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
            contentData = await postsCollection.findOne(contentQuery);
        }

        else if(contentType == "article"){
            contentQuery = {
                aid
            }
            contentData = await articleCollection.findOne(contentQuery);
        }

        else {
            contentQuery = {
                cid
            }
            contentData = await courseCollection.findOne(contentQuery);
        }
        // check if the like collection for that day has been initialized.

        let dayInit = false;

        if(!contentData.likedBy){
            contentData.likedBy = []
        }
        contentData.likedBy.forEach(x=>{
            if(dayInit) return;
            x.date == date ?  dayInit = true : false;
        })
        console.log("day init", dayInit)
        // create the like update document
        // for clarity sake, id my notification for this particular one, i wil have to have an id for a convention tobe maintained
        let notificationID = generateID();
        let updateDocument = {};
        let updated;

        let likeDoc = {
            user : MID,
            notificationID,
        }

        let options = {
            arrayFilters : [
                { "day.date" : date }
            ]
        }

        if(dayInit){

            updateDocument = {
                $push : {
                    "likedBy.$[day].likes" : likeDoc
                },
                $inc : {
                    likesCount : 1
                }
            }

            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument,options);
            }
            else if(contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
            }
            else {
                updated = await courseCollection.updateOne(contentQuery,updateDocument,options);
            }

        }

        else {

            updateDocument = {
                $push : {
                    "likedBy" : 
                        { 
                            date,
                            likes : [likeDoc]
                        } 
                },
                $inc : {
                    likesCount : 1
                }
            }

            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument);
            }
            else if(contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument);
            }
            else {
                updated = await courseCollection.updateOne(contentQuery,updateDocument);
            }

        }
        // like has been updated now, send notification to the content author.

        // create the author query and author data and check if the notification for that day has been initialized

        let authorQuery = {
            __mid : author
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
        // create the notification.
        let notification = new notificationClass("content-liked",userData.username + " liked your " + contentType, "View Post");
        notification.addNID(notificationID);
        notification.addInfo("likedBy",MID);
        notification.addInfo("contentType",contentType);
        notification.addInfo("contentReference", pid || aid || cid);
        notification.addInfo("content-details", contentData.postbody|| contentData.title)

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
        console.log("Like Notification Success" , updatedAuthorNotification.acknowledged)
        // broadcast below 
        if(updatedAuthorNotification.acknowledged){
            let data = {
                type : "notification",
                data : notification.getNotification()
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == author){
                    x.send(JSON.stringify(data));
                    console.log("send data to recipients")
                }
            })
        }
        else{
            console.log("unable to send the notification")
        }
        // send realtime notification update here
        //console.log("from like container",socketReference);

        // get content data for return
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }

        if(updated.acknowledged){
            console.log("liked post success");
            return {
                status : "success",
                message : "successfully like post",
                contentData,
                likeDoc
            }
        }
        else{
            console.log("unable to like post");
            return {
                status : "failed",
                message : "unable to like post",
            }
        }
    })
    // unlike
    fastify.get("/unlike/", async (request,response)=>{
        let DID = request.query.DID;
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let notificationID = request.query.notificationID;
        let contentType = request.query.contentType;
        let date = request.query.dateLiked;
        console.log("date : ", request.query)
        // content query initialized 
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentQuery = {
                cid
            }
            contentData = await courseCollection.findOne(contentQuery);
        }
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        // carry out the unlike operation
        let unlike;
        let updateDocument = {
            $unset : {
                "likedBy.$[day].likes.$[userid]" : ""
            },
            $inc : {
                likesCount : -1
            }
        }
        let options = {
            arrayFilters : [
                {"day.date" : date},{"userid.user": MID}
            ]
        }

        if(contentType == "post"){
            unlike = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if (contentType == "article"){
            unlike = await articleCollection.updateOne(contentQuery,updateDocument,options)
        }
        else {
            unlike = await courseCollection.updateOne(contentQuery,updateDocument,options)
        }

        // remove like notification. Asa yes, i have the notification id. so get started
        let authorQuery = {
            __mid : author
        }
        console.log(authorQuery);
        let removeLikeNotification;
        let removeUpdateDoc = {
            $unset : {
                "notifications.$[day].notifications.$[theNotification]" : ""
            }
        }
        let removeOptions = {
            arrayFilters : [
                {"day.date" : date},
                {"theNotification.notificationID" : notificationID}
            ]
        }
        removeLikeNotification = await notificationCollection.updateOne(authorQuery,removeUpdateDoc,removeOptions);
        console.log("remove " + contentType + " Notification ",removeLikeNotification.acknowledged, removeUpdateDoc, removeOptions);



        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        if(unlike.acknowledged){
            console.log("unlike " + contentType + " success");
            return {
                status : "success",
                message : "successfully unlike " + contentType,
                contentData
            }
        }
        else{
            console.log("unable to like post");
            return {
                status : "failed",
                message : "unable to unlike post",
            }
        }
    })
    // comment
    fastify.get("/comment/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let comment = request.query.comment;
        let review = request.query.review;
        let contentType = request.query.contentType;
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let newCommentDoc = {
            created : Date.now(),
            date ,
            comment,
            mentions : [],
            replies : [],
            likes : [],
            likesCount : 0,
            reportCount : 0,
            reportedInfo : [],
            _commentID : generateID(20),
            commentedByInfo : {
                username : userData.username,
                MID,
                profileImageLink  : userData.profileImageLink
            }
        }
        let newReviewDoc = {
            created : Date.now(),
            date,
            review,
            mentions : [],
            replies : [],
            likes : [],
            likesCount: 0,
            reportCount : 0,
            reportedInfo : [],
            _reviewID : generateID(20),
            reviewedByInfo : {
                username : userData.username,
                MID,
                profileImageLink  : userData.profileImageLink
            }
        }
        let contentUpdated;
        if(contentType == "course"){
            let updateDocument = {
                $push : {
                    reviews : newReviewDoc
                },
                $inc : {
                    reviewsCount : 1
                }
            }
            contentUpdated = await courseCollection.updateOne(contentQuery,updateDocument);          
        }
        else if (contentType == "post") {       
            let updateDocument = {
                $push : {
                    comments : newCommentDoc
                },
                $inc : {
                    commentsCount : 1
                }
            }
            contentUpdated = await postsCollection.updateOne(contentQuery,updateDocument);
        }
        else {       
            let updateDocument = {
                $push : {
                    comments : newCommentDoc
                },
                $inc : {
                    commentsCount : 1
                }
            }
           contentUpdated = await articleCollection.updateOne(contentQuery,updateDocument);
        }

        let authorQuery = {
            __mid : author
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

        let notificationID = generateID()
        let text = `${userData.username} ${comment ? "commented on your" : "wrote a review for your"} ${contentType}`
        let notification = new notificationClass("content-comment",text, "View");
        notification.addNID(notificationID);
        notification.addInfo("commentedBy",MID);
        notification.addInfo("commentID", newCommentDoc._commentID);
        notification.addInfo("reviewID",newReviewDoc._reviewID);
        notification.addInfo("contentType",contentType);
        notification.addInfo("contentReference", pid || aid || cid);
        notification.addInfo("content-details", comment ? comment.split(" ").slice(0,9).join(" ") : review.split(" ").slice(0,9).join(" "))

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
        if(updatedAuthorNotification){
            let data = {
                type : "notification",
                data : notification.getNotification()
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == author){
                    x.send(JSON.stringify(data));
                    console.log("send data to recipients")
                }
            })
        }


        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        if(contentUpdated.acknowledged){
            console.log("comment add success");
            return {
                status : "success",
                message : "successfully added comment",
                contentData
            }
        }
        else{
            console.log("unable to add comment");
            return {
                status : "failed",
                message : "unable to add comment",
            }
        }
    })
    // reply comment
    fastify.get("/reply/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let replyingToAuthor = JSON.parse(request.query.mentionInformation).user;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let contentType = request.query.contentType;
        let reply = request.query.reply;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;
        let mentionInformation = JSON.parse(request.query.mentionInformation);
        let contentQuery;
        console.log("reply author or comment author",)
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let notificationID = generateID()
        let replyDoc = {
            created : Date.now(),
            date,
            reply,
            mentions : [],
            likes : [],
            likesCount : 0,
            reportCount : 0,
            reportedInfo : [],
            _replyID : generateID(),
            notificationID,
            mentionInformation,
            replyInfo : {
                user : MID,
                profileImageLink : userData.profileImageLink,
                username : userData.username
            }
        }
        console.log(typeof mentionInformation ,"mention thype")

        let updateDocumentPA = {
            $push : {
                "comments.$[id].replies" : replyDoc
            }
        }
        let updateDocumentC = {
            $push :{
                "reviews.$[id].replies" : replyDoc
            }
        }
        let optionsn = {
            arrayFilters : [
                {"id._commentID" : commentID},
            ]
        }
        let optionsc = {
            arrayFilters : [
                {"id._reviewID" : reviewID}
            ]
        }
        let updated;
        if(contentType == "course"){
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsc)
        }
        else if(contentType == "article") {
            updated = await articleCollection.updateOne(contentQuery,updateDocumentPA,optionsn);
        }
        else{
            updated = await postsCollection.updateOne(contentQuery,updateDocumentPA,optionsn);
        }

        let authorQuery = {
            __mid : replyingToAuthor
        }
        console.log("author Query", authorQuery)
        let authorNotificationData = await notificationCollection.findOne(authorQuery);
        console.log("author notification data", authorNotificationData)
        if(!authorNotificationData){
            console.log("author notificataion data not init", true,"initializing it now");
            await notificationCollection.insertOne({
                __mid : replyingToAuthor,
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
        // create the notification.
        let text;
        if(mentionInformation.type == "replyingTheAuthor"){
            text = `${userData.username} mentioned you in a reply to your comment`;
        }
        else{
            text = `${userData.username} mentioned you in a reply `;
        }
        let notification = new notificationClass("reply",text, "View");
        notification.addNID(notificationID);
        notification.addInfo("contentType",contentType);
        notification.addInfo("contentReference", pid || aid || cid);
        notification.addInfo("mention-information", mentionInformation);
        notification.addInfo("reply-id", replyDoc._replyID);
        notification.addInfo("comment-review-id", commentID || reviewID)

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
        console.log("Reply notification update success" , updatedAuthorNotification.acknowledged)
        if(updatedAuthorNotification.acknowledged){
            console.log("in here")
            // broadcast here
            let data = {
                type : "notification",
                data : notification.getNotification()
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == author || replyingToAuthor){
                    x.send(JSON.stringify(data));
                    console.log("send data to recipients")
                }
            })
        }
        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        if(updated.acknowledged){
            console.log("reply added successfully");
            return {
                status : "success",
                message : "reply added successfully",
                contentData,
                replyDoc
            }
        }
        else{
            console.log("unable to add reply");
            return {
                status : "failed",
                message : "unable to add reply",
            }
        }
    })
    // item viewed
    fastify.get("/update-item-view/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let contentType= request.query.contentType;
        let contentData;
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userQuery = {
            __mid : MID
        }
        console.log("contentQuery",contentQuery,)
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let viewDoc = {
            created : Date.now(),
            user : MID,
        }

        let updateDocument = {
            $push : {
                viewedBy : viewDoc
            },
            $inc : {
                viewsCount : 1
            }
        }
        let updated;
            if(contentType == "post"){
                updated =await postsCollection.updateOne(contentQuery,updateDocument)
            }
            else if (contentType == "article"){
                updated =await articleCollection.updateOne(contentQuery,updateDocument)
            }
            else {
                updated =await courseCollection.updateOne(contentQuery,updateDocument)
            }
            if(contentType == "post"){
                contentData = await postsCollection.findOne(contentQuery);
            }
            else if(contentType == "article"){
                contentData = await articleCollection.findOne(contentQuery);
            }
            else {
                contentData = await courseCollection.findOne(contentQuery);
            }
            // update user seen content
        let updateDocumentUser = {
            $push : {
                seenContent : contentQuery
            }
        }
        let updatedUser = await feedDataCollection.updateOne({
            user : MID,
        }, updateDocumentUser);
        
        // send the reply author the notification 
        // create and send the notification here
        let authorQuery = {
            __mid : author
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
        console.log("updated viewcount");
        let mileStones = [100,1000,10000,100000]
        if(mileStones.includes(contentData.viewsCount)){
            console.log("sending milestone notification.")
            let text;
            if(contentData.viewsCount == 100){
                text = `Your ${contentType} got viewed by 100 people!`;
            }
            else if(contentData.viewsCount == 1000){
                text = `Your ${contentType} just got seen by 1000 people!`;
            }
            else if(contentData.viewsCount == 10000){
                text = `Your ${contentType} just got seen by 10000 people!`;
            }
            else if(contentData.viewsCount == 100000){
                text = `Your ${contentType} just got seen by 1000 people!`;
            }
            let notificationID = generateID();
            let nUpdateDoc;
            let notificationUpdated;
            let nOptions;
            let type = "view-milestone";
            let action = "view-post";
            let addressedTo = MID;
            let notification = new notificationClass(type,text,action,addressedTo)
            if(contentType == "post" || "article"){
                notification.addNID(notificationID);
                notification.addInfo("viewedBy" , MID);
                notification.addInfo("contentType",contentType);
                notification.addInfo("contentReference", pid || aid );
                if(authorNotificationDayInit){
                    // update the notification
                    nUpdateDoc = {
                        $push : {
                            "notifications.$[day].notifications" : notification.getNotification()
                        }
                    }
                    nOptions = {
                        arrayFilters : [
                            {"day.date" : date}
                        ]
                    }
                    // update notification
                    notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc, nOptions)
                }
                else {
                    // Create new notification day.
                    nUpdateDoc = {
                        $push : {
                            notifications : {
                                date,
                                notifications : [notification.getNotification()]
                            }
                        }
                    }
                    notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc)
                }
                if(notificationUpdated.acknowledged){
                    console.log("notification updated success");
                    let data = {
                        type : "notification",
                        data : notification.getNotification()
                    };
                    fastify.websocketServer.clients.forEach(x=>{
                        if(x.MID == author){
                            x.send(JSON.stringify(data));
                            console.log("send data to recipients")
                        }
                    })
                }
                else {
                    console.log("unable to broadcast notification")
                }
            }

        }
        // initialize the notification here
       
            
        if(updated.acknowledged){
            return {
                status : "success",
                message : "updated viewcount",
                contentData
            }
        }
        else{
            console.log("unable to update view count");
            return {
                status : "failed",
                message : "unable to update view count",
            }
        }
    })
    // take course
    fastify.get("/take-course/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let cid = request.query.cid;

        let userQuery = {
            __mid : MID
        }

        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let courseDoc = {
            created : Date.now(),
            _id : generateID(),
            cid,
            firstEntry : true,
            currentSection : 0,
            answers : [],
            completed : false
        }
        let updateDocument = {
            $push : {
                myCourses : courseDoc
            }
        }
        let updated = await userInfocollection.updateOne(userQuery,updateDocument);
        userData = await userInfocollection.findOne(userQuery);
        if(updated.acknowledged){
            let studentDoc = {
                created : Date.now(),
                student : MID,
                id : generateID()
            }
            updateDocument = {
                $inc : {
                    studentsCount : 1,
                },
                $push : {
                    students : studentDoc
                }
            }
            let updatedStudents = await courseCollection.updateOne({cid},updateDocument);
            console.log("updatedStudents", updatedStudents);
            if(updatedStudents.acknowledged){
                console.log("sending course author new student notification now.");
                let authorQuery = {
                    __mid : author,
                }
                let notifcationData = await notificationCollection.findOne(authorQuery);
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
                let addedNotificationDay = await notificationCollection.updateOne(authorQuery,addNotificationDayDoc);
                // success except something went wrong which usually does not happen
                }
                // move on to initialize the notification
                let type = "new-student";
                let text = `${userData.username} Just started taking your course.`;
                let action = "N/A";
                let addressedTo = MID;
                let notificationID = generateID();
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

                let updatedNotificationDb = await notificationCollection.updateOne(authorQuery,updateDocument,sendOptions);

                if(updatedNotificationDb.acknowledged){
                    console.log("notification updated");
                    let data = {
                        type : "notification",
                        data : notification.getNotification()
                    };
                    fastify.websocketServer.clients.forEach(x=>{
                        if(x.MID == author){
                            x.send(JSON.stringify(data));
                            console.log("send data to recipients")
                        }
                    })
                }
                else{
                    console.log("unable to update notification");
                }


            }
            console.log("added to my courses success");
            return {
                status : "success",
                message : "added to my courses success",
                userData
            }
        }
        else{
            console.log("unable to add course to my courses");
            return {
                status : "failed",
                message : "unable to add course to my courses",
            }
        }
    })
    //update user activity log
    fastify.get("/update-activity-log/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let infoOptions = request.query.infoOptions;
        let type = request.query.type
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let dayInit = false;
        userData.activityLog.forEach(x=>{
            if(dayInit) return;
            x.date == date ?  dayInit = true : false;
        })
        
        let updateDocument = {}
        let options = {
            arrayFilters : [
                {date}
            ]
        }
        let activityDoc = {
            type,
            infoOptions,
            id : generateID()
        }
        let updated;
        if(dayInit){
            updateDocument = {
                $push : {
                    activityLog : {
                        date,
                        activities : [activityDoc]
                    }
                }
            }
            updated = await userInfocollection.updateOne(userQuery,updateDocument)
        }

        else {
            updateDocument = {
                $push : {
                    "activityLog.$[date].activities" : activityDoc
                }
            }
            updated = await userInfocollection.updateOne(userQuery,updateDocument,options)
        }
        if(updated.acknowledged){
            console.log("updated the activitylog successfully");
            return {
                status : "success",
                message : "updated the activitylog successfully",
            }
        }
        else{
            console.log("unable to updat the activitylog");
            return {
                status : "failed",
                message : "unable to updat the activitylog",
            }
        }

    })
    fastify.get("/share/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let ref = request.query.ref;
        let contentType = request.query.contentType;
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);
        console.log("shared content author  :", author)
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid : ref
            }
            contentData = await postsCollection.findOne(contentQuery);
            console.log("content data fetched", typeof contentData == "object")
        }
        else if(contentType == "article"){
            contentQuery = {
                aid : ref
            }
            contentData = await articleCollection.findOne(contentQuery);
            console.log("content data fetched ", typeof contentData == "object")
        }
        else {
            contentQuery = {
                cid : ref
            }
            contentData = await courseCollection.findOne(contentQuery);
        }
        console.log("content data fetched ", contentData)
        let dayInit = false;
        contentData.sharedBy.forEach(x=>{
            if(dayInit) return;
            x.date == date ?  dayInit = true : false;
        })

        let shareDoc = {
            id : generateID(),
            sharedBy : MID,
            sharedTo : request.query.to,
            created : Date.now()
        }

        let updateDocument;
        let updated;
        let options = {
            arrayFilters : [
                {
                    "day.date" : date
                }
            ]
        }
        if(dayInit){
            updateDocument = {
                $push : {
                    "sharedBy.$[day].shares" : shareDoc
                },
                $inc : {
                    shareCount : 1
                }
            }
            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument,options);
            }
            else if(contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument,options)
            }
            else {
                updated = await courseCollection.updateOne(contentQuery,updateDocument,options)
            }
        }
        else {
            updateDocument = {
                $push : {
                    sharedBy : {
                        date,
                        shares : [shareDoc]
                    }
                },
                $inc : {
                    shareCount : 1
                }
            };
            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument);
            }
            else if(contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument)
            }
            else {
                updated = await courseCollection.updateOne(contentQuery,updateDocument)
            }
        }
        if(updated.acknowledged){
            console.log("content shared successfully");
            // send notification to the author.
            let authorQuery = {
                __mid : author
            }
            let notifcationData = await notificationCollection.findOne(authorQuery);
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
                let addedNotificationDay = await notificationCollection.updateOne(authorQuery,addNotificationDayDoc);
                // success except something went wrong which usually does not happen
            }
            // move on to initialize the notification
            let type = "content-shared";
            let text = `${userData.username} shared your ${contentType}`;
            let action = `View ${contentType}`;
            let addressedTo = author;
            let notificationID = generateID();
            let notification = new notificationClass(type,text,action,addressedTo);
            notification.addNID(notificationID);
            notification.addInfo('contentType', contentType);
            notification.addInfo('reference', ref);

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
            
            let updatedNotificationDb = await notificationCollection.updateOne(authorQuery,updateDocument,sendOptions);

            if(updatedNotificationDb.acknowledged){
                console.log("notification updated");
                // broadcast live here 
                let data = {
                    type : "notification",
                    data : notification.getNotification()
                };
                fastify.websocketServer.clients.forEach(x=>{
                    if(x.MID == author){
                        x.send(JSON.stringify(data));
                        console.log("sent data to recipient(s).")
                    }
                })
            }
            else{
                console.log("unable to update notification");
            }

            return {
                status : "success",
                message : "content shared successfully",
            }
        }
        else{
            console.log("unable to share content");
            return {
                status : "failed",
                message : "unable to share content",
            }
        }
    })
    fastify.get("/deletecomment/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let contentType = request.query.contentType;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;

        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updated;
        let updateDocument = {
            $unset : {
                "comments.$[theComment]" : null
            },
            $inc : {
                "commentsCount" : -1
            }
        }
        let updateDocumentC = {
            $unset : {
                "reviews.$[theReview]" : null
            },
            $inc : {
                "reviewsCount" : -1
            }
        }
        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
            ]
        }
        let optionsC = {
            arrayFilters : [
                {"theReview._reviewID" : reviewID},
            ]
        }
        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }
        console.log("updated ", updated);

        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        if(updated.acknowledged){
            console.log("review/ comment delete success");
            return {
                status : "success",
                message : "successfully deleted review",
                contentData,
            }
        }
        else{
            console.log("unable to add comment");
            return {
                status : "failed",
                message : "unable to add comment",
            }
        }

    })
    fastify.get("/editcomment/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
    
        let contentType = request.query.contentType;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;
        let review = request.query.review;
        let comment = request.query.comment
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updated;
        
        let updateDocument = {
            $set : {
                "comments.$[theComment].comment" : comment 
            },
        }
        let updateDocumentC = {
            $set : {
                "reviews.$[theReview].review" : review
            },
        }
        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
            ]
        }
        let optionsC = {
            arrayFilters : [
                {
                    "theReview._reviewID" : reviewID
                },
            ]
        }
        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }
        console.log("updated ", updated);

        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        if(updated.acknowledged){
            console.log("comment edit success");
            return {
                status : "success",
                message : "successfully edited comment",
                contentData,
            }
        }
        else{
            console.log("unable to edit comment");
            return {
                status : "failed",
                message : "unable to edit comment",
            }
        }

    })
    fastify.get("/updatecommentlikes/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let action = request.query.action;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let contentType = request.query.contentType;
        let reviewID = request.query.reviewID;
        let details = request.query.details; 
        let reqNID = request.query.notificationID
        let contentQuery;

        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }

        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }

        else {
            contentQuery = {
                cid
            }
        }

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let updated
        let notificationID = generateID();
        let commentLikeDoc = {
            created : Date.now(),
            dateLiked : date,
            likedBy : MID,
            username : userData.username,
            id : generateID(16),
            notificationID
        }

        contentType == "course" ? commentLikeDoc.reviewNID = notificationID : commentLikeDoc.commentLikeNID = notificationID;
        let updateDocument;
        let updateDocumentC;
        if(action == "like"){
            updateDocument = {
                $push : {
                    "comments.$[theComment].likes" : commentLikeDoc
                },
                $inc : {
                    "comments.$[theComment].likesCount" : 1,
                }
            }
            updateDocumentC = {
                $push : {
                   "reviews.$[theReview].likes" : commentLikeDoc 
                },
                $inc : {
                    "reviews.$[theReview].likesCount" : 1
                }
            }

        }
        else{
            updateDocument = {
                $unset : {
                    "comments.$[theComment].likes" : commentLikeDoc
                },
                $inc : {
                    "comments.$[theComment].likesCount" : -1,
                }
            }
            updateDocumentC = {
                $unset : {
                   "reviews.$[theReview].likes" : commentLikeDoc 
                },
                $inc : {
                    "reviews.$[theReview].likesCount" : -1
                }
            }
        }
        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID}
            ]
        }
        let optionsC = {
            arrayFilters : [
                {"theReview._reviewID" : reviewID}
            ]
        }

        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }
        console.log("updated ", updated);

        // create and send the notification here
        let authorQuery = {
            __mid : author
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
        
        // initialize the notification here
        let nUpdateDoc;
        let notificationUpdated;
        let nOptions;
        if(action == "like"){
            let notification = new notificationClass("comment-liked",`${userData.username} liked your ${contentType == "course" ? "review" : "comment"} on a ${contentType}`, "View")
            notification.addNID(notificationID);
            notification.addInfo("likedBy" , MID);
            notification.addInfo("contentType",contentType);
            notification.addInfo("contentReference", pid || aid || cid);
            notification.addInfo("comment-details", details);
            notification.addInfo("commentID", commentID)
            notification.addInfo("reviewID", reviewID)
            if(authorNotificationDayInit){
                // update the notification
                nUpdateDoc = {
                    $push : {
                        "notifications.$[day].notifications" : notification.getNotification()
                    }
                }
                nOptions = {
                    arrayFilters : [
                        {"day.date" : date}
                    ]
                }
                // update notification
                notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc, nOptions)
            }
            else {
                // Create new notification day.
                nUpdateDoc = {
                    $push : {
                        notifications : {
                            date,
                            notifications : [notification.getNotification()]
                        }
                    }
                }
                notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc)
            }
            if(notificationUpdated.acknowledged){
                console.log("comment liked notifiction acknowleded");
                let data = {
                    type : "notification",
                    data : notification.getNotification()
                };
                fastify.websocketServer.clients.forEach(x=>{
                    if(x.MID == author){
                        x.send(JSON.stringify(data));
                        console.log("send data to recipients")
                    }
                })
            }
        }
        else {
            // here the action is unlike 
        console.log("unlike comment operation , removing the comment liked notification.");
            nUpdateDoc = {
                $unset : {
                    "notifications.$[day].notifications.$[theNotification]" : ""
                }
            }
            nOptions = {
                arrayFilters : [
                    {"day.date" : date},
                    {"theNotification.notificationID" : reqNID}
                ]
            }
            console.log(nOptions)
            // update notification
            notificationUpdated = await userInfocollection.updateOne(authorQuery, nUpdateDoc, nOptions)
        }
        
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }

        if(updated.acknowledged){
            console.log("comment like success");
            return {
                status : "success",
                message : "successfully liked comment",
                contentData,
                likeDoc : commentLikeDoc
            }
        }
        else{
            console.log("unable to like comment");
            return {
                status : "failed",
                message : "unable to like comment",
            }
        }        
        
    })
    fastify.get("/updatereplylikes/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;
        let replyID = request.query.replyID;
        let contentType = request.query.contentType;
        let action = request.query.action;
        let reqNID = request.query.notificationID;
        let details = request.query.details;
        console.log("review id", reviewID)
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let notificationID = generateID();
        let replyLikeDoc = {
            created : Date.now(),
            likedBy : MID,
            username : userData.username,
            id : generateID(16),
            notificationID
        }
        let updateDocument;
        let updateDocumentC;
        if(action == "like"){
            updateDocument = {
                $push : {
                    "comments.$[theComment].replies.$[theReply].likes" : replyLikeDoc
                },
                $inc : {
                    "comments.$[theComment].replies.$[theReply].likesCount" : 1,
                }
            }
            updateDocumentC = {
                $push : {
                    "reviews.$[theReview].replies.$[theReply].likes" : replyLikeDoc
                },
                $inc : {
                    "reviews.$[theReview].replies.$[theReply].likesCount" : 1
                }
            }
        }
        else{
            updateDocument = {
                $unset : {
                    "comments.$[theComment].replies.$[theReply].likes.$[theLike]" : replyLikeDoc
                },
                $inc : {
                    "comments.$[theComment].replies.$[theReply].likesCount" : -1,
                }
            }
            updateDocumentC = {
                $unset : {
                    "reviews.$[theReview].replies.$[theReply].likes.$[theLike]" : replyLikeDoc
                },
                $inc : {
                    "reviews.$[theReview].replies.$[theReply].likesCount" : -1
                }
            }
        }

        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
                {"theReply._replyID" : replyID},
                {"theLike.notificationID" : reqNID}
            ]
        }
        let optionsC = {
            arrayFilters : [
                {"theReview._reviewID" : reviewID},
                {"theReply._replyID" : replyID},
                {"theLike.notificationID" : reqNID}
            ]
        }
        let options2 = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
                {"theReply._replyID" : replyID},
            ]
        }
        let optionsC2 = {
            arrayFilters : [
                {"theReview._reviewID" : reviewID},
                {"theReply._replyID" : replyID},
            ]
        }

        if(contentType == "post"){
            if (action == "like"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument,options2)
            }
            else{
                updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
            }
        }
        else if(contentType == "article"){
            if (action == "like"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument,options2)
            }
            else{
                updated = await articleCollection.updateOne(contentQuery,updateDocument,options)
            }
        }
        else {
            if (action == "like"){
                updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC2)
            }
            else{
                updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC)
            }
        }
        

        // send the reply author the notification 
        let authorQuery = {
            __mid : author
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
        
        // initialize the notification here
        let nUpdateDoc;
        let notificationUpdated;
        let nOptions;        
        if(action == "like"){
            let notification = new notificationClass("reply-liked",`${userData.username} liked your reply.`, "View")
            notification.addNID(notificationID);
            notification.addInfo("likedBy" , MID);
            notification.addInfo("contentType",contentType);
            notification.addInfo("contentReference", pid || aid || cid);
            notification.addInfo("commentID" , commentID);
            notification.addInfo("reviewID", reviewID)
            notification.addInfo("replyID", replyID);
            notification.addInfo("reply-details", details);
            if(authorNotificationDayInit){
                // update the notification
                nUpdateDoc = {
                    $push : {
                        "notifications.$[day].notifications" : notification.getNotification()
                    }
                }
                nOptions = {
                    arrayFilters : [
                        {"day.date" : date}
                    ]
                }
                // update notification
                notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc, nOptions)
            }
            else {
                // Create new notification day.
                nUpdateDoc = {
                    $push : {
                        notifications : {
                            date,
                            notifications : [notification.getNotification()]
                        }
                    }
                }
                notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc)
            }
            if(notificationUpdated.acknowledged){
                let data = {
                    type : "notification",
                    data : notification.getNotification()
                };
                fastify.websocketServer.clients.forEach(x=>{
                    if(x.MID == author){
                        x.send(JSON.stringify(data));
                        console.log("send data to recipients")
                    }
                })
            }
        }
        else {
            // here the action is unlike 
        console.log("unlike comment operation , removing the comment liked notification.");
            nUpdateDoc = {
                $unset : {
                    "notifications.$[day].notifications.$[theNotification]" : ""
                }
            }
            nOptions = {
                arrayFilters : [
                    {"day.date" : date},
                    {"theNotification.notificationID" : reqNID}
                ]
            }
            console.log(nOptions)
            // update notification
            notificationUpdated = await notificationCollection.updateOne(authorQuery, nUpdateDoc, nOptions)
        }
        


        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }

        if(updated.acknowledged){
            console.log("reply like success");
            return {
                status : "success",
                message : "successfully liked reply",
                contentData,
            }
        }
        else{
            console.log("unable to like reply");
            return {
                status : "failed",
                message : "unable to like reply",
            }
        }       
    })   
    fastify.get("/editreply/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;
        let replyID = request.query.replyID;
        let contentType = request.query.contentType;
        let replyEdit = request.query.reply;

        
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let updateDocument = {
            $set : {
                "comments.$[theComment].replies.$[theReply].reply" : replyEdit
            } 
        }
        let updateDocumentC = {
            $set : {
                "reviews.$[theReview].replies.$[theReply].reply" : replyEdit
            } 
        }
        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
                {"theReply._replyID": replyID}
            ]
        }
        let optionsC = {
            arrayFilters : [
                {"theReview._reviewID" : reviewID},
                {"theReply._replyID": replyID}
            ]
        }
        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }

        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        console.log(contentData);
        if(updated.acknowledged){
            console.log("reply edit success");
            return {
                status : "success",
                message : "successfully edited reply",
                contentData,
            }
        }
        else{
            console.log("unable to edit reply");
            return {
                status : "failed",
                message : "unable to edit reply",
            }
        }     
    })
    fastify.get("/deletereply/", async (request,response)=>{
        let DID = request.query.DID;
                let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let commentID = request.query.commentID;
        let reviewID = request.query.reviewID;
        let replyID = request.query.replyID;
        let contentType = request.query.contentType;

        
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }

        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let updateDocument = {
            $unset : {
                "comments.$[theComment].replies.$[theReply]" : null,
            }
        }
        let updateDocumentC = {
            $unset : {
                "reviews.$[theReviews].replies.$[theReply]" : null,
            }
        }

        let options = {
            arrayFilters : [
                {"theComment._commentID" : commentID},
                {"theReply._replyID": replyID}
            ]
        }
        let optionsC = {
            arrayFilters : [
                {"theReviews._reviewID" : reviewID},
                {"theReply._replyID": replyID}
            ]
        }
        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument,options)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocument,options);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }

        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        console.log(contentData);
        if(updated.acknowledged){
            console.log("reply delete success");
            return {
                status : "success",
                message : "successfully deleted reply",
                contentData,
            }
        }
        else{
            console.log("unable to delette reply");
            return {
                status : "failed",
                message : "unable to delete reply",
            }
        } 
    })
    fastify.get("/report/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let author = request.query.author;
        let reportReason = request.query.reportReason;
        let otherReason = request.query.otherReason;
        let reportInfo = JSON.parse(request.query.reportInfo);
        let commentID = reportInfo.commentID;
        let replyID = reportInfo.replyID;
        let reviewID = reportInfo.reviewID;
        let contentType = reportInfo.contentType;
        let aid = reportInfo.aid;
        let pid = reportInfo.pid;
        let cid = reportInfo.cid;
        
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userQuery = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(userQuery);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let reportedInfo = {
            reportedBy : MID,
            username : userData.username,
            reportReason,
            otherReason,
        }
        let updateDocumentC = {};
        let updateDocumentN = {};
        let optionsC = {}
        let optionsN = {}
        console.log("content query", contentQuery)
        if(reportInfo.type == "report-comment"){
            updateDocumentC = {
                $push : {
                    "reviews.$[theReview].reportedInfo" :  reportedInfo
                },
                $inc : {
                    "reviews.$[theReview].reportedCount" : 1
                }
            };
            updateDocumentN = {
                $push : {
                    "comments.$[theComment].reportedInfo" : reportedInfo,
                },
                $inc : {
                    "comments.$[theComment].reportedCount" : 1
                }
            };
            optionsN = {
                arrayFilters : [
                    {"theComment._commentID" : commentID},
                ]
            }
            optionsC = {
                arrayFilters : [
                    {"theReview._reviewID" : reviewID}
                ]
            }
        }
        if(reportInfo.type == "reporting-reply"){
            updateDocumentC = {
                $push : {
                    "reviews.$[theReview].replies.$[theReply].reportedInfo" :  reportedInfo
                },
                $inc : {
                    "reviews.$[theReview].replies.$[theReply].reportedCount" : 1
                }
            };
            updateDocumentN = {
                $push : {
                    "comments.$[theComment].replies.$[theReply].reportedInfo" : reportedInfo,
                },
                $inc : {
                    "comments.$[theComment].replies.$[theReply].reportedCount" : 1
                }                
            };
            optionsN = {
                arrayFilters : [
                    {"theComment._commentID" : commentID},
                    {"theReply._replyID" : replyID}
                ]
            }
            optionsC = {
                arrayFilters : [
                    {"theReview._reviewID" : reviewID},
                    {"theReply._replyID" : replyID}
                ]
            }
        }
        if(reportInfo.type == "reporting-post"){
            updateDocumentN = {
                $push : {
                    reportedInfo : reportedInfo,
                },
                $inc : {
                    reportedCount : 1
                }
            };
        }
        if(reportInfo.type == "reporting-course"){
            updateDocumentC = {
                $push : {
                    reportedInfo : reportedInfo,
                },
                $inc : {
                    reportedCount : 1
                }
            };
        }
        if(reportInfo.type == "reporting-article"){
            updateDocumentN = {
                $push : {
                    reportedInfo : reportedInfo,
                },
                $inc : {
                    reportedCount : 1
                }                
            };
        }
        //done just that options need to be really specific.


        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocumentN,optionsN)
        }
        else if(contentType == "article"){
            updated = await articleCollection.updateOne(contentQuery,updateDocumentN,optionsN);
        }
        else {
            updated = await courseCollection.updateOne(contentQuery,updateDocumentC,optionsC);
        }

        let contentData;
        if(contentType == "post"){
            contentData = await postsCollection.findOne(contentQuery);
        }
        else if(contentType == "article"){
            contentData = await articleCollection.findOne(contentQuery);
        }
        else {
            contentData = await courseCollection.findOne(contentQuery);
        }
        console.log(contentData);
        if(updated.acknowledged){
            console.log(reportInfo.type," success");
            return {
                status : "success",
                message : reportInfo.type+" success",
                contentData,
            }
        }
        else{
            console.log(reportInfo.type, "failed");
            return {
                status : "failed",
                message : reportInfo.type+" failed",
            }
        } 

    })
    fastify.get("/share-to-profile/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        
        let query = {
            __mid : MID
        }

        let userData =await userInfocollection.findOne(query);
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let updateDocument = {
            $push : {
                shared_to_profile : {
                    type : aid ? "article" : false || pid ? "post" : false || cid ? "course" : false,
                    reference : aid || pid || cid,
                    created : Date.now(),
                    date
                }
            }
        }
        let updated = await userInfocollection.updateOne(query,updateDocument);
        if(updated.acknowledged){
            return {
                status : "success"
            }
        }
        else {
            return {
                status : "failed"
            }
        }
    })
    fastify.get("/mute-content/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let aid = request.query.aid
        let cid = request.query.cid
        let pid = request.query.pid
        let query = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(query);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }        
        let updateDocument = {
            $push : {
                muted_content : {
                    type : aid ? "article" : false || pid ? "post" : false || cid ? "course" : false,
                    reference : aid || pid || cid,
                    created : Date.now(),
                    date
                }
            }
        }
        let updated = await userInfocollection.updateOne(query,updateDocument);

        if(updated.acknowledged){
            console.log("success done");
            return {
                status : "success"
            }
        }
        else{
            console.log("failed not done");
            return {
                status : "failed"
            }
        }

    })
    fastify.get("/toggle-content-commenting/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let contentType = request.query.contentType;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let action = request.query.action;

        let query = {
            __mid : MID
        }

        let userData = await userInfocollection.findOne(query);
        
        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updated;
        if(action == "turn-off"){
            let updateDocument = {
                $set : {
                    commentAllowed : false,
                }
            }
            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument)
            }
            else if( contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument)
            }
            else{
                updateDocument.$set.commentAllowed = undefined;
                updateDocument.$set.reviewAllowed = false;
                updated = await courseCollection.updateOne(contentQuery,updateDocument)
            }
        }
        else{
            let updateDocument = {
                $set : {
                    commentAllowed : true
                }
            }        
            if(contentType == "post"){
                updated = await postsCollection.updateOne(contentQuery,updateDocument)
            }
            else if( contentType == "article"){
                updated = await articleCollection.updateOne(contentQuery,updateDocument)
            }
            else{
                updateDocument.$set.commentAllowed = undefined;
                updateDocument.$set.reviewAllowed = true;
                updated = await courseCollection.updateOne(contentQuery,updateDocument)
            }
        }
        if(updated.acknowledged){
            console.log("success done");
            return {
                status : "success"
            }
        }
        else{
            console.log("failed not done");
            return {
                status : "failed"
            }
        }
    })
    fastify.get("/delete-content/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let aid = request.query.aid;
        let pid = request.query.pid;
        let cid = request.query.cid;
        let unpublish = request.query.unpublish;

        let contentType = request.query.contentType;

        let query = {
            __mid : MID
        }

        let contentQuery;
        if(contentType == "post"){
            contentQuery = {
                pid
            }
        }
        else if(contentType == "article"){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let userData = await userInfocollection.findOne(query);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updateDocument = {
            $set : {
                deleted : true
            }
        }

        let updated;

        if(contentType == "post"){
            updated = await postsCollection.updateOne(contentQuery,updateDocument)
        }
        else if( contentType == "article"){
            if(unpublish){
                updateDocument.$set.deleted = undefined;
                updateDocument.$set.published = false;
            }
            updated = await articleCollection.updateOne(contentQuery,updateDocument)
        }
        else{
            if(unpublish){
                updateDocument.$set.deleted = undefined;
                updateDocument.$set.published = false;
            }
            updated = await courseCollection.updateOne(contentQuery,updateDocument)
        }

        if(updated.acknowledged){
            console.log("success done");
            return {
                status : "success"
            }
        }
        else{
            console.log("failed not done");
            return {
                status : "failed"
            }
        }
    })
    fastify.get("/shared/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let ref = request.query.ref;
        let to = request.query.to;
        let contentType = request.query.contentType;
        console.log("ref, to , contentType", ref, to , contentType)
        let query = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(query);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updated;

        if(updated.acknowledged){
            console.log("success done");
            return {
                status : "success"
            }
        }
        else{
            console.log("failed not done");
            return {
                status : "failed"
            }
        }
    })
    fastify.get("/temp-url/", async (request,reply)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let query = {
            __mid : MID
        }
        let userData = await userInfocollection.findOne(query);

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let updated;

        if(updated.acknowledged){
            console.log("success done");
            return {
                status : "success"
            }
        }
        else{
            console.log("failed not done");
            return {
                status : "failed"
            }
        }
    })
    fastify.get("/unpublish-content/", async (request,reply)=>{

    })
}
module.exports = contentItemFunctionalities;
