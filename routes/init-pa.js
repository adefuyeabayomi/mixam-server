// collections = mixam community articles.
let fs = require("fs");
let path = require("path");
let validateDevice = require("../utils/validateDevice");
//install moment for the time blah blah-- on looking again, that will happen in the front end 

// publish articles
let notificationClass = require("../utils/notificationCreator");
const generateID = require("../utils/generateID");
async function editArticle (fastify,options){
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
     fastify.post("/edit-article/", async (request,reply) => {
        let MID = request.body.MID;
        let DID = request.body.DID;
        let aid = request.body.aid;
        let file = request.body.attachedFile;
        let data =request.body.data ? JSON.parse(request.body.data) : false;
        let editType = request.body.editType; 
        let created = Date.now();
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        console.log("MID", MID, "DID", DID, "aid", aid, "attachedFile" , file, "data" , data, "editType", editType);
        // edit type : initArticle;
        let articleCollection = fastify.mongo.db.collection("articles_main");
        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let dailyArticleListCollection = fastify.mongo.db.collection("dailyArticleList");
        
        let userData = await userInfocollection.findOne({__mid : MID});
        // reject request if from an unknown source
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        } 

        let query = {
            aid
        };
        let articleData = await articleCollection.findOne(query);
        console.log("article data", articleData);
        // validateAuthor 
        if(editType !== "createNew" && articleData.author !== MID){
            return {
                status : "request_denied",
                reason : "unauthorized request, you are not the author."
            }
        }
        let cloudinary = options.cloudinary;
        switch (editType){
            case "createNew" : {
               let articleObjInit = {
                    aid : data.aid,
                    title : data.title,
                    author : MID,
                    coverImage : "",
                    hashtags : [],
                    sections : data.sections,
                    created,
                    date,
                    author_username : userData.username,
                    author_image : userData.profileImageLink,
                    published : false,
                    banned : false,
                    deleted : false, 
                    reportedInfo : [], 
                    likesCount : 0,
                    likedBy : [],
                    comments : [],
                    commentsCount : 0,
                    viewsCount : 0,
                    viewedBy : [],
                    shareCount : 0,
                    sharedBy : [],
                    commentAllowed : true,
                }
                console.log("article object init : ",articleObjInit)
                let added = await articleCollection.insertOne(articleObjInit);
                console.log("added", added.acknowledged);
                if(added.acknowledged){
                    return {
                        status : "success",
                    }
                } 
                else{
                    return {
                        status : "failed",
                        reason : "unable to add the article to the database, please try again."
                    }                    
                }
                break;
            }
            case "updateArticleTitle" : {
                // this block handles the article title update.
                let updateDocument = {
                    $set : {
                        title : data.value
                    }
                }
                let query = {
                    aid : aid
                }
                let added = await articleCollection.updateOne(query,updateDocument);
                if(added.acknowledged){
                    console.log("added the title successfuly to database.");
                    let dataObj = await articleCollection.findOne(query);
                    return {
                        status : "success",
                        dataObj
                    }
                }
                else{
                    console.log("unable to add the title to the database.");
                    return {
                        status : "failed",
                        reason : "Unable to add the title to the database."
                    }                    
                }
                break;
            }
            case "addDraft" : {
                let updateDocument = {
                    $push : {
                        drafts : {
                            aid,
                            type : "article",
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
                    let text = "You just created a new draft article";
                    let action = "N/A";
                    let addressedTo = MID;
                    let notificationID = generateID();
                    let notification = new notificationClass(type,text,action,addressedTo);
                    notification.addNID(notificationID);
                    notification.addInfo("ref",aid)
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
                        aid,
                        created : Date.now(),
                        type: "created-an-article"
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
            case "updateArticleCoverImage" : {
                let coverImageLink = request.body.coverImageUrl;
                console.log("coverImgUrl", coverImageLink)
                let updateDocument = {
                    $set : {
                        coverImage : coverImageLink 
                    }
                }
                let query = {
                    aid : aid
                }
                let added = await articleCollection.updateOne(query,updateDocument);
                if(added.acknowledged){
                    console.log("added the cover image to the database successfully");
                    let dataObj = await articleCollection.findOne(query);
                    return {
                        status : "success",
                        dataObj,
                        coverImageLink
                    }
                }
                else {
                    console.log("unable to add the image to the database.");
                    return {
                        status : "failed",
                        reason : "Unable to add the image to the database."
                    }
                }
                break;
            }
            case "updateArticleHashTags" : {
                let updateDocument = {
                    $set : {
                        hashtags : data.hashtags
                    }
                }
                let query = {
                    aid : aid
                }
                let added = await articleCollection.updateOne(query,updateDocument);
                if(added.acknowledged){
                    let doc = await articleCollection.findOne(query);
                    console.log("added the hashtags successfuly to database.");
                    return {
                        status : "success",
                        doc
                    }
                }
                else{
                    console.log("unable to add the hashtags to the database.");
                    return {
                        status : "failed",
                        reason : "Unable to add the hashtags to the database."
                    }                    
                }
                break;
            }
            case "addNewSection" : {
                let query = {
                    aid
                }
                let updateDocument = {
                    $push : {
                        "sections" : data
                    }
                }
                let added = await articleCollection.updateOne(query, updateDocument);
                if(added.acknowledged){
                    console.log("added new section successfully to database.");
                    let dataObj = await articleCollection.findOne(query);
                    return {
                        status : "success",
                        dataObj
                    }
                }
                else{
                    console.log("unable to add new section to the database.");
                    return {
                        status : "failed",
                        reason : "Unable to add new section to the database."
                    }                    
                }
                break;
            }
            case "updateSectionTitle" : {
                let title = data.value;
                let sid = data.sectionID;
                console.log("title",title,"sid",sid);
                let query = {
                    aid
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
                let added = await articleCollection.updateOne(query,updateDocument,options);
                let ret = await articleCollection.findOne(query);
                if(added.acknowledged){
                    console.log("updated the section title successfuly in the database.");
                    return {
                        status : "success",
                        article : ret
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
            case "updateContentItem" : {
                let cloudinaryURL = file;

                // add to db here
                let query = {
                    aid
                }
                let updateDocument = {
                    $set : {
                        "sections.$[section].contentItems.$[contentItem].content" : data.contentType == "image" ? cloudinaryURL : data.value
                    }
                }
                let options = {
                    arrayFilters : [
                        {"section.id" : data.sectionID},
                        {"contentItem.id" : data.contentItemID}
                    ]
                }
                let added = await articleCollection.updateOne(query, updateDocument,options);
                if(added.acknowledged){
                    console.log("updated the content item successfuly in the database.");
                    let dataObj = await articleCollection.findOne(query);
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
                break;
            }
            case "addContentItem" : {
                console.log(data);
                let query = {
                    aid
                }
                let updateDocument = {
                    $push : {
                        "sections.$[section].contentItems" : data
                    }
                }
                let options = {
                    arrayFilters : [
                        {
                            "section.id" : data.sectionID
                        }
                    ]
                }
                let added = await articleCollection.updateOne(query, updateDocument, options);
                if(added.acknowledged){
                let dataObj = await articleCollection.findOne(query);
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
            case "deleteSection" : {
                console.log(data);
                let query = {
                    aid
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
                let added = await articleCollection.updateMany(query, updateDocument, options);
                if(added.acknowledged){
                let dataObj = await articleCollection.findOne(query);
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
                        aid
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
                    let added = await articleCollection.updateMany(query, updateDocument, options);
                    if(added.acknowledged){
                    let dataObj = await articleCollection.findOne(query);
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
        }
        // end of switch block remaining delete for now.
    })
}
module.exports = editArticle;