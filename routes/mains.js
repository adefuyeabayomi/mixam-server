let validateDevice = require("../utils/validateDevice");
let notificationClass = require("../utils/notificationCreator");
let retroArray = require("../utils/retroArr");
let generateID = require("../utils/generateID");
let shuffle = require("shuffle-array");
const path = require("path");
const fs = require("fs");

async function mains (fastify,options){
    let appUtilsCollection = fastify.mongo.db.collection("mixam-utils");
    let exist =await appUtilsCollection.findOne({name : "subscriber"});
    if(!exist){
        appUtilsCollection.insertOne({
            name : "subscriber",
            data : []
        }) 
    }
    let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation");
    let articleCollection = fastify.mongo.db.collection("articles_main");
    let courseCollection = fastify.mongo.db.collection("course_main");
    let dailyPostList = fastify.mongo.db.collection("dailyPostList");
    
    let dailyArticleList = fastify.mongo.db.collection("dailyArticleList");
    let dailyCourseList = fastify.mongo.db.collection("dailyCourseList");
    let postsCollection  = fastify.mongo.db.collection("postCollection");
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
    let utilsCollection = fastify.mongo.db.collection("mixam-utils");
    fastify.get("/addsubscriber/",async (request,reply)=>{
        let query = {
            name : "subscribers"            
        }
        let updateDocument = {
            $push : {
                data : request.query.subscriber
            }
        }
        let done = await appUtilsCollection.updateOne(query,updateDocument);
        if(done.acknowledged){
            return {
                status : "success",
                subscriber : request.query.subscriber
            }
        }
        else {
            return {
                status : "failed",
                subscriber : request.query.subscriber
            }
        }
    })
    fastify.get("/verify-account/",async (request, reply)=>{
        let verifyToken = request.query.verifyToken;
        let DID = request.query.DID;
        let MID = request.query.MID;
        console.log("verifyToken From the user", verifyToken);
        let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation");
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        let verified = false;
        userData.devices.forEach(x=>{
            if(verified){
                return;
            }
            if(x.id == DID){
                console.log("checking verify token", x.verifyToken == verifyToken,x.verifyToken,verifyToken)
                if(x.verifyToken == verifyToken){
                    verified = true;
                }
            }
        })
        console.log("verified", verified);
        if(!verified){
            //reply.sendFile('index.html');
            return {
                status : "failed",
                reason : "conflict in the verification parameters."
            }
        }
        else {
            let updateDocument = {
                $set : {
                "devices.$[theDevice].verified" : true
                }
            }            
            let options = {
                arrayFilters : [{
                    "theDevice.id" : DID
                }] 
            }
            let updatedVerified = await userInfoCollection.updateOne({__mid : MID}, updateDocument, options);
            if(updatedVerified.acknowledged){
                console.log("updated the verified, Proceeding to serve the home page");
                
                return { done : true} //reply.sendFile('index.html');
            }
            else {
                return {
                    status : "failed",
                    reason : "unable to verify due to some technical issues. Our teams are working to get the issue fixed and you can complete the process as soon as possible"
                }
            }
        }
    })
    fastify.get("/resend-email/",async (request,reply)=>{
        
        // handle for verify and welcome
        let resend_type = request.query.resend_type;
        let MID = request.query.MID;
        let DID = request.query.DID;
        let email = request.query.email;

        let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation")

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        let userExist = userData !== null;
        let deviceInfo;
        if(userExist){
            userData.devices.forEach(x=>{
                x.id == DID ? deviceInfo = x : false
            })
        }
        console.log("device info : ", deviceInfo)
        switch (resend_type) {
            case "verify" : {

                // send verify mail here    
                let formatName = "verify";
                let verifyToken = deviceInfo.verifyToken;
                let link = `http://mixam-business.onrender.com/verify-account/?MID=${userData.__mid}&DID=${DID}&verifyToken=${verifyToken}`;
                let formatOptions = {
                    verifyToken,
                    link
                }
                let mailOptions = {
                    from : "Mixam Business<abayomiadefuye1@gmail.com>",
                    to : userData.email,
                    subject : "Re-Send : Verification Required For This Login."
                }
                await options.mailer(formatName,formatOptions,mailOptions);
                console.log("resent verify email");
                break;
            }

            case "welcome" : {
                // send welcome mail here
                let formatName = "welcome";
                let mailOptions = {
                    from : "Mixam Business<abayomiadefuye1@gmail.com>",
                    to : email,
                    subject : "Re-Send : Welcome To Mixam",
                }
                let formatOptions = {
                    username : userData.username,
                    verify_token : deviceInfo.verifyToken,
                    device_id : DID,
                    mid : MID
                }
                await options.mailer(formatName,formatOptions,mailOptions);
                console.log("resent welcome email");
                break;
            }

            case "temp" : {
                // send verify mail here    
                let formatName = "";
                let formatOptions = {

                }
                let mailOptions = {

                }
                options.mailer(formatName,formatOptions,mailOptions);
                
                break;
            }
        }
        console.log("before resend return");
        return {
            status : "success",
        }
    })
    fastify.get("/fetch-saved-courses/", async (request,reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation")

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 

        return {
            status : 'success',
            savedCourses : userData.savedCourses
        }
    })
    fastify.get("/fetch-my-courses/", async (request,reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation")

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 

        return {
            status : 'success',
            myCourses : userData.myCourses
        }
    })
    fastify.get("/update-classroom-firstentry/", async (request,reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let cid = request.query.cid;
        let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation")

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 

        let updateDocument = {
            $set : {
                "myCourses.$[theCourse].firstEntry" : false
            }
        }

        let options = {
            arrayFilters : [
                {
                    "theCourse.cid" : cid
                }
            ]
        }
        let updated = await userInfoCollection.updateOne({__mid : MID}, updateDocument, options)
        if(updated.acknowledged){
            return {
                status : "success",
            }
        }
        else{
            return {
                status : "failed",
            }
        }
    })
    fastify.get("/move-to-next-section/", async (request,reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let cid = request.query.cid;
        let hasQuiz = request.query.hasQuiz;
        let quizAnswers = request.query.quizAnswers;
        let sectionID = request.query.sectionID;
        let finalSection = request.query.finalSection;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        console.log("request Queries", request.query)

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        // set the quiz currentSection and the push the quizAnswers to the quiz answers.
        let answerDoc = {
            sectionID ,
            quizAnswers
        }

        let updateDocument = {
            $set : {
                "myCourses.$[theCourse].currentSection" : finalSection == "true" ? sectionID : sectionID + 1
            },
            $push : {
                "myCourses.$[theCourse].answers" : answerDoc
            },
        }

        let options = {
            arrayFilters : [
                {
                    "theCourse.cid" : cid
                }
            ]
        }
        let updated = await userInfoCollection.updateOne({__mid : MID}, updateDocument, options)
        if(updated.acknowledged){
            if(finalSection == "true"){
                // update user learning milestones before sending the response back to user.
                let milestoneDoc = {
                    course : cid,
                    completed : Date.now(),
                    started : undefined,
                    date 
                }
                let updateDocument = {
                    $set : {
                        "myCourses.$[theCourse].completed" : true
                    },
                    $push : {
                        learning_milestones : milestoneDoc
                    }
                }
                let updated = await userInfoCollection.updateOne({__mid : MID}, updateDocument,options)
                if(updated.acknowledged){
                    let notifcationData = await notificationCollection.findOne({
                        __mid : MID
                    });
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
                        let addedNotificationDay = await notificationCollection.updateOne({
                            __mid : MID
                        },addNotificationDayDoc);
                        // success except something went wrong which usually does not happen
                    }
                    // move on to initialize the notification
                    let type = "course-milestone";
                    let text = "Congratulations on completing this course. Good one Champ.";
                    let action = "N/A";
                    let addressedTo = MID;
                    let notificationID = generateID();
                    let notification = new notificationClass(type,text,action,addressedTo);
                    notification.addNID(notificationID);
                    notification.addInfo("ref",cid)
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
                    
                    let updatedNotificationDb = await notificationCollection.updateOne({
                        __mid : MID
                    },updateDocument,sendOptions);
                    
                    if(updatedNotificationDb.acknowledged){
                        let data = {
                            type:"notification",
                            data : notification.getNotification()
                        };
                        fastify.websocketServer.clients.forEach(x=>{
                            if(x.MID == MID){
                                x.send(JSON.stringify(data));
                                console.log("sent data to recipients");
                            }
                        })
                        console.log("notification updated");
                    }
                    else{
                        console.log("unable to update notification");
                    }
                }
                else {
                    console.log("unable to update the notification")
                }
                // add to contribution functionality 
                let contributionDoc = {
                    cid,
                    created : Date.now(),
                    type: "completed-a-course"
                }
                let cUpdateDoc = {
                    $push : {
                        contributions : contributionDoc
                    }
                }
                let updatedContribution = await userInfoCollection.updateOne({__mid : MID}, cUpdateDoc);
            }
            return {
                status : "success",
            }
        }
        else{
            return {
                status : "failed",
            }
        }
    })
    fastify.get("/fetch-learning-milestones/", async (request, reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;

        let userData = await userInfoCollection.findOne({__mid : MID}) || await userInfoCollection.findOne({email});
        
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        console.log({
            status : "success",
            milestones : userData.learning_milestones
        })
        return {
            status : "success",
            milestones : userData.learning_milestones
        }
    })
    fastify.get("/publish-draft/" , async (request, reply)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let aid = request.query.aid;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let cid = request.query.cid;
        let contentType = request.query.contentType;
        let publishDate = request.query.publishDate;
        let action = request.query.action;
        console.log("publish action", action);
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let contentQuery;
        if(contentType == 'article'){
            contentQuery = {
                aid
            }
        }
        else {
            contentQuery = {
                cid
            }
        }
        let publishedA =  action == "publish" ? true : false;
        let publishDateInit = action == "publish" ? date : undefined;
        let updateDocument = {
            $set : {
                published : publishedA,
                publishDate : publishDateInit,
            }
        }
        console.log("publish update document", updateDocument)
        let updatedPublished;

        if(contentType == "article"){
            updatedPublished = await articleCollection.updateOne(contentQuery, updateDocument);
        }
        else {
            updatedPublished = await courseCollection.updateOne(contentQuery,updateDocument)
        }
        if(updatedPublished.acknowledged){
            if(true){
                let notifcationData = await notificationCollection.findOne({
                    __mid : MID
                });
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
                    let addedNotificationDay = await notificationCollection.updateOne({
                        __mid : MID
                    },addNotificationDayDoc);
                    // success except something went wrong which usually does not happen
                }
                // move on to initialize the notification
                let type = contentType + "-" + action;
                let text;
                action == 'publish' ? text = "Congratulations. You just Published your "+ contentType +". Now it is accessible to the public." : text = "You just Unpublished your "+ contentType +". Now it is no Longer accessible to the public. All data related to this content so far are still intact";
                let actionN = "N/A";
                let addressedTo = MID;
                let notificationID = generateID();
                let notification = new notificationClass(type,text,actionN,addressedTo);
                notification.addNID(notificationID);
                notification.addInfo("ref",aid || cid)
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
                
                let updatedNotificationDb = await notificationCollection.updateOne({
                    __mid : MID
                },updateDocument,sendOptions);
                
                if(updatedNotificationDb.acknowledged){
                    let data = {
                        type:"notification",
                        data : notification.getNotification()
                    };
                    fastify.websocketServer.clients.forEach(x=>{
                        if(x.MID == MID){
                            x.send(JSON.stringify(data));
                            console.log("sent data to recipients");
                        }
                    })
                    console.log("notification updated");
                }
                else{
                    console.log("unable to update notification");
                }
                if(action == "publish"){
                    // initialize the content in the data
                    if(contentType == "article"){
                        let dayIsInitialized = await dailyArticleList.findOne({date});
                        
                        if(dayIsInitialized){
                            let query = {date};
                            let updateDocument = {
                                $push : {  
                                    "articles" : { aid}
                                },
                                $inc: {
                                    "count" : 1
                                }
                            }
                            let added = await dailyArticleList.updateOne(query,updateDocument)
                            if(added.acknowledged){
                                console.log("added to articles daily lists");
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
                            let initializeDay = await dailyArticleList.insertOne({date, articles : [{aid}], count : 1})
                            if(initializeDay.acknowledged){
                                console.log("added to  articles daily lists");
                            }
                            else{
                                return {
                                    status : "failed",
                                    reason : "unable to add to database"
                                }
                            }
                        }
                    }
                    else if(contentType == "course"){
                        let dayIsInitialized = await dailyCourseList.findOne({date});
                        
                        if(dayIsInitialized){
                            let query = {date};
                            let updateDocument = {
                                $push : {  
                                    "courses" : {cid}
                                },
                                $inc: {
                                    "count" : 1
                                }
                            }
                            let added = await dailyCourseList.updateOne(query,updateDocument)
                            if(added.acknowledged){
                                console.log("added to course daily lists");
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
                            let initializeDay = await dailyCourseList.insertOne({date,courses : [{cid}], count : 1})
                            if(initializeDay.acknowledged){
                                console.log("added to course lists");
                            }
                            else{
                                return {
                                    status : "failed",
                                    reason : "unable to add to database"
                                }
                            }
                        }
                    }

                }
                else {
                    // remove it from published list
                    console.log("publish date in remove", publishDate,cid,aid)
                    if(contentType == "course"){
                        let updateDoc = {
                            $set : {
                                "courses.$[theCourse].cid" : undefined,
                            }
                        }
                        let options = {
                            arrayFilters : [
                                {
                                    "theCourse.cid" : cid
                                }
                            ]
                        }
                        let updated = await dailyCourseList.updateOne({
                            date : publishDate
                        }, updateDoc,options)

                    }
                    else if(contentType == "article"){
                        let updateDoc = {
                            $set : {
                                "articles.$[theArticle].aid" : undefined,
                            }
                        }
                        let options = {
                            arrayFilters : [
                                {
                                    "theArticle.aid" : aid
                                }
                            ]
                        }
                        let updated = await dailyArticleList.updateOne({
                            date : publishDate
                        }, updateDoc,options)
                    }

                }
            }
            return {
                status : "success",
            }

        }
        else{
            return {
                status : "false",
            }
        }
    })
    fastify.get("/update-seen-notification/", async (request,response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        //let unseenNotifications = JSON.parse(request.query.unseenNotifications).data;
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let query = {
            __mid : MID
        }
        let updateDocument = {
            $set : {
                "notifications.$[].notifications.$[theNotification].seen" : true
            }
        }
        let options = { 
            arrayFilters : [
                {"theNotification.seen" : false}
            ]
        }
        let updated = await notificationCollection.updateOne(query,updateDocument,options);
        if(updated.acknowledged){
            return {
                status : "success",
            }
        }
        else {
            return {
                status : "failed",
            }
        }

    })
    fastify.get("/mark-all-notification-read/", async (request,response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        //let unseenNotifications = JSON.parse(request.query.unseenNotifications).data;
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let query = {
            __mid : MID
        }
        let updateDocument = {
            $set : {
                "notifications.$[].notifications.$[theNotification].read" : true
            }
        }
        let options = {
            arrayFilters : [
                {"theNotification.read" : false}
            ]
        }
        let updated = await notificationCollection.updateOne(query,updateDocument,options);
        if(updated.acknowledged){
            return {
                status : "success",
            }
        }
        else {
            return {
                status : "failed",
            }
        }
    })
    fastify.get("/clear-notifications/", async (request,response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let query = {
            __mid : MID
        }
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let updateDocument = {
            $set  : {
                notifications : []
            }
        }
        let cleared = await notificationCollection.updateOne(query,updateDocument);
        if(cleared.acknowledged){
            return {
                status : "success"
            }
        }
        else {
            return {
                status : "failed"
            }
        }
        return true;
    })
    fastify.get("/read-notification/", async (request,response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let notificationID = request.query.notificationID;
        let day = request.query.day;

        let query = {
            __mid : MID
        }
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let updateDocument = {
            $set : {
                "notifications.$[theDay].notifications.$[theNotification].read" : true,
            }
        }
        let options = {
            arrayFilters : [
                {
                    "theDay.date" : day
                },
                {
                    "theNotification.notificationID" : notificationID
                }
            ]
        }
        console.log("arrayFilters",options)
        let updated = await notificationCollection.updateOne(query,updateDocument,options);
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

        return true;
    })
    fastify.get("/fetch-drafts/", async (request, response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        //let unseenNotifications = JSON.parse(request.query.unseenNotifications).data;
        let query = {
            __mid : MID
        }
        let userData = await userInfoCollection.findOne(query)
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        return {
            status : "success",
            drafts : userData.drafts
        }
    })
    fastify.post("/edit-profile/", async (request, reply)=>{
        let requestBody = request.body;
        let MID = requestBody.MID;
        let DID = requestBody.DID;
        let username = requestBody.username;
        let website = requestBody.website;
        let location = requestBody.location;
        let profileImageLink = requestBody.profileURL;
        let about = requestBody.about;
        let interests = JSON.parse(requestBody.interests);
        let employmentStatus = requestBody.employmentStatus;
        let photoUploaded = requestBody.photoUploaded;
        let created = Date.now();
        let date = String(new Date()).split(" ").slice(0,4).join(" "); 
        // date is in the format "Mon Mar 28 2022" Day Month Date Year
        let userData = await userInfoCollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 
        let query = {
            __mid : MID
        }
        var imageUploadSuccess = "not_available";
        let updateDocument = {
            $set : {
                username : username ,
                website : website,
                location : location,
                about : about,
                interests : interests,
                employment_status : employmentStatus,
            }
        }
        if(photoUploaded == "true"){
            updateDocument.$set.profileImageLink = profileImageLink;           
        }
        console.log("upload doc", updateDocument)
        let updatedProfile = await userInfoCollection.updateOne({__mid : MID},updateDocument)
        if(updatedProfile.acknowledged){
            return {
                status : "success",
                imgLink : updateDocument.$set.profileImageLink
            }
        }
        else {
            return {
                status : "failed"
            }
        }
        return true;
    })
    fastify.post("/update-daily-admin-message/", async (request,reply)=>{
        let key1 = request.body.key1;
        let key2 = request.body.key2;
        let key3 = request.body.key3;
        let theme = request.body.theme;
        let messageTitle = request.body.messageTitle;
        let messageContent = request.body.messageContent;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        console.log("key1",key1,"key2", key2,"key3", key3,"messageTitle",messageTitle,"messageContent",messageContent);

        let files = request.raw.files; 
        let keys = await utilsCollection.findOne({
            name : "admin-keys"
        });
        console.log("fetched keys", keys)
        //validate the admin keys;
        let validAdminCredentials = false;
        if(keys.key1 == key1 && keys.key2 == key2 && keys.key3 == key3){
            validAdminCredentials = true;
        }
        if(!validAdminCredentials){
            return {
                status : "unauthorized access",
                message : "Access Denied!"
            }
        }
        else {
            let filePath = path.join(__dirname,'../.temp/');
            let fileName = files.aamImage.name;
            let filedir = filePath+fileName;
            let data = request.body.aamImage.data;
            let imageUploadSuccess;
            let messageObj = {
                title : messageTitle,
                theme,
                content : messageContent,
                date,
                id : generateID(),
                created : Date.now(),
                imgLink : ""
            }
            fs.writeFile(filedir,data,(err)=>{
                if(err){
                    console.log(err.message);
                    imageUploadSuccess = false;
                }
                else{
                    console.log("done saving to temp dir");               
                }
            });
            await options.cloudinary.uploader.upload(".temp/"+fileName,{tags:"basic_sample"},(err,result)=>{
                if(err){
                    console.log(err.message);
                    imageUploadSuccess = false;
                }
                else {
                    console.log(result.url);
                    console.log("photo upload successful to both cloudinary",{profileImageLink : result.url});
                    fs.unlink(filedir,()=>{
                        console.log("deleted successfully")
                    })
                    messageObj.imgLink = result.url;
                    imageUploadSuccess = true;
                    console.log("inside cloudinary", messageObj)
                }
            })      

                if(imageUploadSuccess){
                    let updateQuery = {
                        name : "admin-daily-messages"
                    }                    
                    let updateDocument = {
                        $push : {
                            dailyMessages : messageObj
                        }
                    }
                    let updated = await utilsCollection.updateOne(updateQuery,updateDocument);
                    if(updated.acknowledged){
                        return {
                            status : "success",
                            message : "Successfully updated the message",
                            messageObj
                        }
                    }
                    else {
                        return {
                            status : "failed",
                            message : "Unable to update message in the database"
                        }
                    }
                }
                else {
                    return {
                        status : "failed",
                        message : "Unable to upload image to cloudinary"
                    }
                }
            }
            return {
                status : "failed"
            }
    })
    fastify.get("/fetch-admin-daily-message/",async (request,response)=>{
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let result = await utilsCollection.findOne({
            name : "admin-daily-messages"
        });
        let lastMsgResults = [];
        let totalMessagesCount = result.dailyMessages.length;
        console.log(totalMessagesCount)
        function recentMessages (output,currDate){
            if(output.length == totalMessagesCount){
                return output;
            }
            if(output.length >= 1){
                return output;
            }
            else {
                let messagesToday = result.dailyMessages.filter(x=>x.date == currDate);
                messagesToday = shuffle(messagesToday);
                console.log("messagesToday", currDate, messagesToday);
                let taken = messagesToday.slice(0,1);
                output = output.concat(taken);
                console.log("messagesToday", currDate, messagesToday, "output", output);
                let nextDate = retroArray(currDate,0)[0];
                return recentMessages(output,nextDate);
            }
        }
        let output = recentMessages([],date);
        // the job is to return the last 3-5 messages.

        return {
            status : "success",
            messages : output
        }
    })
    fastify.get("/fetch-users-updated/", async (request,response)=>{
        let usersID = JSON.parse(request.query.users);
        let found = await userInfoCollection.find({
            __mid : {
                $in : usersID
            }
        }).toArray()
        let sorted = [];
        for(let each of found){
            let {username,__mid,profileImageLink} = each;
            sorted.push({username,__mid,profileImageLink});
        }
        return {
            status : "success",
            sorted
        }
    })
}

module.exports = mains;