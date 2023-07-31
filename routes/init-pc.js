//publishcourse 
let fs = require("fs");
let path = require("path");
let validateDevice = require("../utils/validateDevice");
let notificationClass = require("../utils/notificationCreator");
let generateID = require("../utils/generateID");
async function publishCourse (fastify,options){
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
     fastify.post("/edit-course/", async (request, reply)=>{
        let MID = request.body.MID;
        let DID = request.body.DID;
        let cid = request.body.cid;
        let file = request.body.attachedFile;
        let data =request.body.data ? JSON.parse(request.body.data) : false;
        let created = Date.now();
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let editType = request.body.editType;
        console.log("MID", MID, "DID", DID, "cid", cid, "attachedFile" , file, "data" , data, "editType", editType);
        
        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let courseCollection = fastify.mongo.db.collection("course_main");
        let dailyCourseListCollection = fastify.mongo.db.collection("dailyCourseList")
        let cloudinary = options.cloudinary;
        let query = {
            cid
        }
        let userData = await userInfocollection.findOne({__mid : MID});
        // reject request if from an unknown source
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        }

        let courseData = await courseCollection.findOne(query);
        if(editType !== "createNew" && courseData.author !== MID){
            return {
                status : "request_denied",
                reason : "unauthorized request, you are not the author."
            }
        } 
        switch (editType) {
            case "createNew" : {

                let courseObjInit = {
                    cid : data.cid,
                    title : data.title,
                    author : MID,
                    coverImage : "",
                    hashtags : [],
                    sections : data.sections,
                    date,
                    created,
                    author_username : userData.username,
                    author_image : userData.profileImageLink,
                    published : false,
                    banned : false,
                    deleted: false,
                    reportedInfo : [],
                    likesCount : 0,
                    likedBy : [],
                    reviews : [],
                    reviewsCount : 0,
                    students : [], 
                    studentsCount : 0,
                    viewsCount : 0,
                    viewedBy : [],
                    shareCount : 0,
                    sharedBy : [],
                    reviewAllowed : true,
                }

                //insert arrays that need to be inserted here.
                let added = await courseCollection.insertOne(courseObjInit);
                console.log("course initialized", added.acknowledged);
                let query = {
                    cid
                }
                let ret = await courseCollection.findOne(query);
                if(added.acknowledged){
                    return {
                        status : "success",
                        ret
                    }
                }
                else{
                    return {
                        status : "failed",
                        reason : "unable to add the article to th e database, please try again."
                    }
                }
                break;
            }
            case "updateCourseTitle" : {
                 let query = {
                     cid
                 }
                 let updateDocument = {
                     $set : {
                        title : data.value
                     }
                 }
                 let added = await courseCollection.updateOne(query,updateDocument);
                 let ret = await courseCollection.findOne(query);
                 console.log(ret)
                 if(added.acknowledged){
                     return {
                         status : "success",
                         ret
                     }
                 }
                 else {
                    return {
                        status : "failed",
                        reason : "unable to save title to the database"
                    }
                }
                break;
            }
            case "addDraft" : {
                let updateDocument = {
                    $push : {
                        drafts : {
                            cid,
                            type : "course",
                            created : Date.now(),
                        }
                    }
                }
                let updated = await userInfocollection.updateOne({
                    __mid : MID
                },updateDocument);
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
                    let type = "new-draft";
                    let text = "You just created a new draft Course";
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
                            type,
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
                    let contributionDoc = {
                        cid,
                        created : Date.now(),
                        type: "created-a-course"
                    }
                    let cUpdateDoc = {
                        $push : {
                            contributions : contributionDoc,
                            myContents : contributionDoc
                        }
                    }
                    let updatedContribution = await userInfocollection.updateOne({__mid : MID}, cUpdateDoc);
                }
                else {
                    console.log("unable to add to drafts")
                }
                return {
                    status : 'success'
                }
            }
            case "testcase" : {
                 let query = {
                     cid
                 }
                 let updateDocument = {
                     $command : {

                     }
                 }
                 let options = {
                     arrayFilters : [
                         {"filter.target" : ""}
                     ]
                 }
                 let added = await courseCollection.updateOne(query,updateDocument,options);
                 if(added.acknowledged){
                     let doc = await courseCollection.findOne(query);
                     return {
                         status : "success",
                         doc
                     }
                 }
                 else {
                     return {
                         status : "failde",
                         reason : "unable to save title to the database"
                    }
                 }
                break;
            }
            case "updateCourseCoverImage" : {
                let cloudinaryURL = file;
    
                let query = {
                    cid
                }
                let updateDocument = {
                    $set : {
                        coverImage : cloudinaryURL
                    }
                }
                console.log(updateDocument);
                let added = await courseCollection.updateOne(query,updateDocument);
                if(added.acknowledged){
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    return {
                        status : "failde",
                        reason : "unable to update course cover image"
                    }
                }
               break;
            }
            case "updateCourseHashtags" : {
                let query = {
                    cid
                }
                let updateDocument = {
                    $set : {
                        hashtags : data.value
                    }
                }
                let added = await courseCollection.updateOne(query,updateDocument);
                if(added.acknowledged){
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    return {
                        status : "failde",
                        reason : "unable to update course hashtags"
                    }
                }
               break;
            }
            case "addNewSection" : {
                let query = {
                    cid
                }
                let updateDocument = {
                    $push : {
                        "sections" : data
                    }
                }
                let added = await courseCollection.updateOne(query,updateDocument,options);
                if(added.acknowledged){
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    return {
                        status : "failde",
                        reason : "unable to add new section to the database"
                    }
                }
               break;
            }
            case "updateSectionTitle" : {
                let title = data.value;
                let sid = data.sectionID;
                console.log("title",title,"sid",sid);
                let query = {
                    cid
                }
                // i have the aid which is the article draft id
                // in the article drafts , there is an array of sections
                // the goal, to update the title of the section that has an id of the sectionID;
                let updateDocument = {
                    $set : {
                        "sections.$[section].title.content" : title
                    }
                }
                let options = {
                    arrayFilters : [
                        {"section.id":sid}
                    ]
                }
                console.log(options.arrayFilters)
            
                let added = await courseCollection.updateOne(query,updateDocument,options);
                if(added.acknowledged){
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    return {
                        status : "failde",
                        reason : "unable to update section title  the database"
                    }
                }
               break;
            }
            case "addContentItem" : {
                console.log("adding content item ", data.contentObj.contentType,data.contentObj)
                let query = {
                    cid
                }
                let updateDocument = {
                    $push : {
                        "sections.$[section].contentItems" : data.contentObj
                    }
                }
                let options = {
                    arrayFilters : [
                        {
                            "section.id" : data.sectionID
                        }
                    ]
                }
                let added = await courseCollection.updateOne(query, updateDocument, options);
                if(added.acknowledged){
                let dataObj = await courseCollection.findOne(query);
                    console.log("updated the section title successfuly in the database.");
                    return {
                        status : "success",
                        dataObj
                    }
                }
                else {
                    return {
                        status : "failde",
                        reason : "unable to save new content item to the database"
                    }
                }
               break;
            }
            case "updateContentItem" : {
                let cloudinaryURL = file;
                let query = {
                    cid
                }
                let val = data.value;
                console.log();
                if(data.contentType == "image" || data.contentType=="document"){
                    val = cloudinaryURL
                }
                console.log(val);
                let updateDocument = {
                    $set : {
                        "sections.$[section].contentItems.$[contentItem].content" : val
                    }
                }
                let options = {
                    arrayFilters : [
                        {"section.id" : data.sectionID},
                        {"contentItem.id" : data.contentItemID}
                    ]
                }
                let added = await courseCollection.updateOne(query, updateDocument,options);
                if(added.acknowledged){
                    console.log("updated the content item successfuly in the database.");
                    let dataObj = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        dataObj
                    }
                }
                else{
                    console.log("unable to update content item ");
                    return {
                        status : "failed",
                        reason : "Unable to update the content item"
                    }                    
                }
                break;            }
            case "addQuizItem" : {
                    console.log(data)
                    let query = {
                        cid
                    }
                    let updateDocument = {
                        $push : {
                            "sections.$[section].quizes" : data.quizObject
                        }
                    }
                    let options = {
                        arrayFilters : [
                            {
                                "section.id" : data.sectionID
                            }
                        ]
                    }
                    console.log("the array filter", options, data.quizObject)
                    let added = await courseCollection.updateOne(query,updateDocument,options);
                    if(added.acknowledged){
                        let doc = await courseCollection.findOne(query);
                        return {
                            status : "success",
                            doc
                        }
                    }
                    else {
                        return {
                            status : "failde",
                            reason : "unable to add quiz item"
                        }
                    }
                   break;
            }
            case "updateQuizItem" : {
                let query = {
                    cid
                }
                let updateDocument = {
                    $set : {
                        "sections.$[section].quizes.$[quiz]" : data.newQuizObj,
                    }
                }

                let options = {
                    arrayFilters : [
                        {"section.id" : data.sectionID},
                        {"quiz.id" : data.quizID}
                    ]
                }
                console.log("the array filter", options, data.newQuizObj)
                let added = await courseCollection.updateOne(query,updateDocument,options);
                if(added.acknowledged){
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    console.log("unable to update quiz")
                    return {
                        status : "failde",
                        reason : "unable to update quiz"
                    }
                }
               break;
            }
            case "deleteSection" : {
                console.log(data);
                let query = {
                    cid
                }
                let updateDocument = {
                    $unset : {
                        "sections.$[section]" : ""
                    },
                    $inc : {
                        "sections.$[upperSection].id" : -1,
                    }
                }
                let options = {
                    arrayFilters : [
                        {"section.id" : data.sectionID},
                        {"upperSection.id" : {$gt : data.sectionID}}
                    ]
                }
                let added = await courseCollection.updateMany(query, updateDocument, options);
                if(added.acknowledged){
                let dataObj = await courseCollection.findOne(query);
                    console.log("updated the section title successfuly in the database.");
                    return {
                        status : "success",
                        dataObj
                    }
                }
                else{
                    console.log("unable update section title");
                    return {
                        status : "failed",
                        reason : "Unable to update section title"
                    }
                }         
                break;
            }
            case "deleteContentItem" : {
                    console.log(data);
                    let query = {
                        cid
                    }
                    let updateDocument = {
                        $unset : {
                            "sections.$[section].contentItems.$[contentItem]" : null
                        },
                        $inc : {
                            "sections.$[section].contentItems.$[upperContentItem].id" : -1,
                        }
                    }
                    let options = {
                        arrayFilters : [
                            {"section.id" : data.sectionID},
                            {"contentItem.id" : data.contentItemID},
                            {"upperContentItem.id" : {$gt : data.contentItemID}}
                        ]
                    }
                    let added = await courseCollection.updateMany(query, updateDocument, options);
                    if(added.acknowledged){
                    let dataObj = await courseCollection.findOne(query);
                        console.log("updated the section title successfuly in the database.");
                        return {
                            status : "success",
                            dataObj
                        }
                    }
                    else{
                        console.log("unable update section title");
                        return {
                            status : "failed",
                            reason : "Unable to update section title"
                        }
                    }                
                break;
            }
            case "deleteQuiz" : {
                console.log(data);
                let query = {
                     cid
                };
                let updateDocument = {
                    $unset : {
                        "sections.$[section].quizes.$[quizItem]" : null
                    },
                    $inc : {
                        "sections.$[section].quizes.$[upperQuizItem].id" : -1
                    }
                }
                let options = {
                    arrayFilters : [
                        { "section.id": data.sectionID},
                        { "quizItem.id" : data.quizID},
                        { "upperQuizItem.id" : {
                                $gt : data.quizID
                            }
                        }
                    ]
                }
                let deleted = await courseCollection.updateMany(query,updateDocument,options);
                if(deleted){
                    console.log("deleted return", deleted);
                    let doc = await courseCollection.findOne(query);
                    return {
                        status : "success",
                        doc
                    }
                }
                else {
                    console.log("unable to update quiz")
                    return {
                        status : "failde",
                        reason : "unable to update quiz"
                    }
                }
            }
        }
     })
}
module.exports = publishCourse;