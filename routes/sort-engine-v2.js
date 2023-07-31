// garbage in garbage out 
let validateDevice = require("../utils/validateDevice");
let retroArr = require("../utils/retroArr");
let calculateRetroDaysBack = require("../utils/retroDaysback");
const shuffleArray = require("shuffle-array");

async function getFeed (fastify, options) {
    fastify.get("/feed/", async (request, reply)=>{ 
        //console.log("processing sort feed request")
        // define params here 
        let MID = request.query.MID;
        let DID = request.query.DID;
        let feedType = request.query.feedType;
        let feedAction = request.query.feedAction;
        let deployDate = process.env.DEPLOY_DATE;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        console.log("the deploy date.", deployDate, "the Date : ", date);

        // relevant database collections here.
        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let feedDataCollection = fastify.mongo.db.collection("feedDataCollection");
        let dailyPostList = fastify.mongo.db.collection("dailyPostList");
        let dailyArticleList = fastify.mongo.db.collection("dailyArticleList");
        let dailyCourseList = fastify.mongo.db.collection("dailyCourseList");
        console.log("feed Action ", request.query.feedAction, feedAction === "fetch-feed")
        let userData = await userInfocollection.findOne({__mid: MID});
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "request_denied",
                reason : "unauthorised request origin"
            }
        }
        let _userFeedData = await feedDataCollection.findOne({user: MID});
        let newUser = _userFeedData == null;
        if(_userFeedData == null){
            // initialize user feedData Object in the database.
            console.log("initializing user data in the database")
            let userObjInit = {
                user : MID,
                presentFeed : {
                    posts : [],
                    articles : [],
                    courses : []
                },
                lastReqDate : date,
                seenContent : [],
            }
            let updated = await feedDataCollection.insertOne(userObjInit);
            if(!updated.acknowledged){
                return {
                    status : "failed",
                    reason : "Unable to initialize feed_data for this user now due to some technical issues."
                }
            }
            _userFeedData = await feedDataCollection.findOne({user: MID});
            console.log("now updated user feed data", _userFeedData)
        }

        let presentUserFeed = _userFeedData.presentFeed || {}; // ideal length = 60;
        let myContent = userData.myContents || [];
        let seen = _userFeedData.seenContent || [];

        if(feedAction == "fetch-feed" && _userFeedData && !newUser){
            if(feedType == "posts" && presentUserFeed.posts.length > 0){
                console.log("returning from posts container",presentUserFeed.posts)
                return {
                    status : "success",
                    feed : presentUserFeed.posts
                }
            }
            else if(feedType == "articles" && presentUserFeed.articles.length > 0){
                console.log("returning from article container")
                return {
                    status : "success",
                    feed : presentUserFeed.articles
                }
            }
            else if(feedType == "courses" && presentUserFeed.courses.length > 0){
                console.log("returning from ccourses container")
                return {
                    status : "success",
                    feed : presentUserFeed.courses
                }
            }
            else if(feedType == "all" && presentUserFeed.posts.concat(presentUserFeed.courses).concat(presentUserFeed.articles).length > 0){
                console.log("in fetch feed all")
                presentUserFeed.posts = presentUserFeed.posts
                presentUserFeed.courses = presentUserFeed.courses
                presentUserFeed.articles = presentUserFeed.articles
                return {
                    status : "success",
                    feed : presentUserFeed
                }                
            }
        }
        let feedObj = {
            posts :[],
            articles :[],
            courses :[],
        }
        let seenBarePosts = seen.map(x=>{
            return x.pid;
        }).filter(x=> x!==undefined);
        let seenBareArticles = seen.map(x=>{
            return x.aid;
        }).filter(x=> x!==undefined);
        let seenBareCourses = seen.map(x=>{
            return x.cid;
        }).filter(x=> x!==undefined);
        console.log("Seen posts", seenBarePosts, "seen Articles", seenBareArticles, "seen Courses", seenBareCourses);

        async function createFeed (startDate,seen,collection,output = [],contentLimit){
            let daysBackDate = retroArr(startDate,2);
            let nextStartDate = daysBackDate.shift();
            let deployDateReached = daysBackDate.includes(deployDate);
            if(deployDateReached){
            console.log("deployDateReached ", deployDateReached, startDate, deployDate);
                return output;
            }
            let daysIntervalContent = await collection.find({
                date : {
                    $in : daysBackDate
                }
            }).toArray();
            let totalContentCount = 0;
            let totalContents = [];
            for(let each of daysIntervalContent){
                totalContentCount += each.count;
                totalContents = totalContents.concat(each.posts || each.articles || each.courses);
            }
            // filter the once that have not been seen;
            let unseenFromThisLot = totalContents.filter(x=>{
                let id = x.aid || x.pid || x.cid;
                let s = seen.includes(id);
                if(id == null){
                    s = true;
                }
                return !s;
            })
            let itemsRemaining = contentLimit - output.length;
            let items = unseenFromThisLot.splice(0,itemsRemaining);
            output = output.concat(items);
            if(output.length < contentLimit){
                return createFeed(nextStartDate,seen,collection,output,contentLimit)
            }
            else {
                return output;
            }
        }
        if(feedType === "posts" || feedType === "all" ){
            console.log("create new for posts feed");
            let newPostFeed = await createFeed(date,seenBarePosts,dailyPostList,[],2)
            console.log("newFeed posts.length", newPostFeed.length, newPostFeed)
            if(newPostFeed.length < 1 && feedType === "posts"){
                return {
                    status : "no-new-feed",
                }
            }
            feedObj.posts = newPostFeed;
        }
        if(feedType === "articles" || feedType === "all"){
            console.log("create new for articles feed");
            let newArticlesFeed = await createFeed(date,seenBareArticles,dailyArticleList,[],2)
            console.log("newFeed Articles.length", newArticlesFeed.length, newArticlesFeed)
            if(newArticlesFeed.length < 1 && feedType === "articles"){
                return {
                    status : "no-new-feed",
                }
            }
            feedObj.articles = newArticlesFeed;
        }
        if(feedType === "courses" || feedType === "all"){
            console.log("create new for courses feed");
            let newCourseFeed = await createFeed(date,seenBareCourses,dailyCourseList,[],2)
            console.log("newFeed Course.length", newCourseFeed.length, newCourseFeed)
            if(newCourseFeed.length < 1 && feedType === "courses"){
                return {
                    status : "no-new-feed",
                }
            }
            feedObj.courses = newCourseFeed;
        }
        if(feedObj.posts.concat(feedObj.courses).concat(feedObj.articles).length < 1){
            return {
                status : "no-new-feed"
            }
        }
        let updateFeedDoc ={
            $set : {
                init: ""
            }
        };
        if(feedType === "posts" && feedObj.posts.length > 0){
            updateFeedDoc = {
                $set : {
                    "presentFeed.posts" : feedObj.posts
                }
            }
        }
        else if (feedType === "articles" && feedObj.articles.length > 0){
            updateFeedDoc = {
                $set : {
                    "presentFeed.articles" : feedObj.articles
                }
            }
        }
        else if(feedType === "courses" && feedObj.courses.length > 0){
            updateFeedDoc = {
                $set : {
                    "presentFeed.courses" : feedObj.courses
                }
            }
        }
        else if(feedType === "all" && feedObj.posts.concat(feedObj.courses).concat(feedObj.articles).length > 0){
            updateFeedDoc = {
                $set : {
                    presentFeed : feedObj
                }
            }
        }
        console.log("feedObj after inclusion of all the contents",feedObj)
        let updateUserFeed = await feedDataCollection.updateOne({
            user : MID,
        }, updateFeedDoc);
        if(updateUserFeed.acknowledged){
            console.log("updated user feed success", true,feedObj.posts);
            feedObj.posts = shuffleArray(feedObj.posts);
            feedObj.articles = shuffleArray(feedObj.articles);
            feedObj.courses = shuffleArray(feedObj.courses);
            return {
                status : "success",
                data : feedObj
            }
        }
        else {
            return {
                status : "failed",
                reason : "Unable to add user feed to the database."
            }
        }
    })
}
module.exports = getFeed;