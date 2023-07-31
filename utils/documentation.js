// DOCUMENTATION FOR THE AUTH AND THE USERINFO / USERPROFILE DATA OBJECTS.
// the auth request to the server has the following request parameters 
// email, password , logintype , authtype , deviceID 
// here the main query is just the email, used to check if the user has been registered on the site

const generateID = require("./generateID");

let query = {
    email
}
// the response is sent in form of an object 

let response = {};

// a check is conducted to see if the the user exists

// if user exist , a response is sent,
// if not the user is created with the userinfo and userprofile data objects.
// another check is conducted how the user logged in. either manual or by google sign in
// every user is initialized with userinfo objects that look like this
let document = {
    email,
    password,
    loginType,
    deviceID : [deviceID],
    recoveryEmail : "",
    securityQuestion : "",
    answerToSecurityQuestion : "",
    profileImageLink : "",
    username: "",
    userbusiness : "",
    interests : [],
    lastLoggedIn: "",
    created : Date.now(),
    verified: false,
    following : [],
    followers : [],
    __mid: mid,
}

// if an error occured, then the response containes an errorMessage.
// the response object if successful containes the status = success, __userAccountData,new_user,successMessage

//the response is returned



// WELCOME DATA DOCUMENTATION SECTION
// this section updates some user profile data and the updated info will be sent in real time.


// POST PUBLISHING DOCUMENTATION SECTION.
// When a request to publish a post comes in, the parameters recieved includes.
// MID, DID, postbody, hashtags, photouploaded, actiontype, created, date, files. 
// THE POST OBJECT IS LIKE SHOWN BELOW

var postObj = {
    pid : String(Math.round(Math.random() * 1000000000)) + MID, // type string
    postbody, // type string
    hashtags, // type array 
    imageurl : "",
    created , // type number
    type : "post",
    date , // string
    author : userData.__mid,
    author_username : userData.username,
    author_image : userData.profileImageLink,
    likesCount : 0,
    comments : [],
    commentsCount : 0,
    views : 0,
    viewedBy : [],
    shareCount : 0,
    sharedBy : [],
    reported : [],
    banned : false,
    deleted : false
}

// CREATE ARTICLE DOCUMENTATION SECTION
// the article has a base object structure that looks like this when created, but when saved to data base looks like the second object
let objInit = {
    aid, //type string 
    title, // type string
    author,  // type string
    coverImage,  // type string
    hashtags, //array add _reqUpdateHashtag to the functions
    sections // array
}

// to db looks like;
let articleObjInit = {
    aid,
    title,
    author,
    coverImage,
    hashtags,
    sections,
    created,
    date,
    author_username,
    author_image,
    published,
    banned,
    deleted,
    reported : [],
    likesCount : 0,
    comments : [],
    commentsCount : 0,
    views : 0,
    viewedBy : [],
    shareCount : 0,
    sharedBy : [],
}
// the module performs functions such as creating a new article, updating and modifying the article contents.

// DOCUMENTATION FOR THE CREATE COURSE SECTION.
// This section initializes the course in the database and modifies / updates the course content
// The init sent data to the server looks like the first and when initialized in the database looks like the second object, kind of similar to the article section
let objInite = {
    cid, // string
    title, // string
    author, // string
    coverImage, // string
    hashtags, // array
    sections // array
}

// when init in the database

let courseObjInit = {
    cid,
    title,
    author,
    coverImage,
    hashtags,
    sections,
    date,
    created,
    author_username,
    author_image,
    published,
    banned,
    deleted,
    reported : [],
    likesCount : 0,
    likedBy : [],
    reviews : [],
    reviewsCount : 0,
    students : [],
    studentsCount : 0,
    viewsCount : 0,
    viewedBy : [],
    shareCount : 0,
    sharedBy : []
}


// DOCUMENTATION FOR THE SORT-ENGINE FOR MIXAM CONTENTS.

/*
Algorithm for content-item like notification*/
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
let text = `${userData.username}`;
let notification = new notificationClass("content-liked",text, "View");
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

// Algorithm for the notifications of the applications

// Algorithm for comment like
/**
 * to the commentLikeDoc, add the notificationID
 * send the notificationID to the backend when the commentliked is sent to unlike so it can be removed
 *  
 * 
 * 
 */



// Algorithm for reply like



