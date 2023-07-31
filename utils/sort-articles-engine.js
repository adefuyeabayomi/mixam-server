// import the neccessary functionalities
let validateDevice = require("../utils/validateDevice");
let retroArr = require("../utils/retroArr");
let _getTime = require("../utils/getTime");

// fastify plugin
async function sortArticleFeed (fastify,options){
    fastify.get("/articles/", async (request,response) => {
        console.log("processing feed request")
    // declare all the static variables here
        let MID = request.query.MID;
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join("-");
        let currentUTS = Date.now();
    // define relevant collections here.
        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let dailyArticleListCollection = fastify.mongo.db.collection("dailyArticleList");
        let ArticleDataCollection = fastify.mongo.db.collection("Article_Data_Collection");
        let articleCollection = fastify.mongo.db.collection("articles_main");
    // general queries
        let feedDataQuery = {
            user : MID
        }
    // retro Arrays
        let oneWeekRetroArr = retroArr(date,5);
        let oneMonthRetroArr = retroArr(oneWeekArr[0], 30);
    // working content date and object definition
        let workingContentDate = "random";
        let workingContentObject = {};
    // bactch Array definition
    let batchArray = ["batch1","batch2","batch3","batch4"];
    // define the feed
        let feedObject = {
            following : [], // 5
            articles : [], //5
            random :  {
                init : false,
                articles : [],
            },
        }
        // fetch user account info and validate the user device
        let userData = await userInfocollection.findOne({_mid : MID});
        console.log("userData", userData);
        // reject request if from an unknown source
        if(!validateDevice(userData.deviceID,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }
        }
    // fetch the userFeedData
        let _userFeedData = await ArticleDataCollection.findOne(feedDataQuery);
    // initialize the query if it is not initialized
        console.log("Feed Data INIT : ", _userFeedData !== null ? true : false)
        if(!_userFeedData){
            console.log("initializing the user feed data for future references.");
            let feedDataObject = {
                user : MID,
                lastRequestTime : { timeStamp : currentUTS, date },
                days : [
                    {
                        id : 1,
                        date,
                        seen : {
                            random : {
                                articles : [],
                            }
                        },
                        seenMost : false,
                    }
                ]
            }
            let initFeedData = await ArticleDataCollection.insertOne(feedDataObject);
            if(initFeedData.acknowledged){
                console.log("Success : Initialized the user successfully")
            }
            else {
                console.log("Failed : Unable to initialize the user in the database.")
            }
        }
        // determine the working date and object
    let freshReq = _userFeedData !== null ? true : false;
    let daysArray = _userFeedData.days;
    if(!freshReq){
        for (let count = oneWeekRetroArr.length-1; count >= 0; count--){
            let eachDay = oneWeekRetroArr[count];
            // to determine if the day is the working day, check the seenMost for that day.
            let dayIsPresent = false;
            let _dayData
            // check if the date represented by the eachDay Variable is present in the array
            daysArray.forEach(x=>{
                if(dayIsPresent){
                    return;
                }
                x.date == eachDay ? dayIsPresent = true : false;
                x.date == eachDay ? _dayData = x : false;
            })
            // if the day is present for this date, check the seenMost, if it is true, moveOn continue, if it is false set the workingDate and Object and break,
            if(dayIsPresent){
                // day is present.
                console.log("dayData", _dayData);
                if(_dayData.seenMost){
                    // move on, the user has seen most content for the day.
                    continue;
                }
                else {
                    // the user has not seen most post for this days, so set it as the working day so that the user can get more content from today
                    workingContentDate = each;
                    workingContentObject = _dayData;
                    break;
                }
            }
            else {
                // the day is not present, initialize the day in the database.
                let updateObject = {
                        id : 1,
                        date : eachDay,
                        seen : {
                            random : {
                                articles : [],
                            }
                        },
                        seenMost : false
                };
                let updateDocument= {
                    $unset : {
                        "days.$[day]" : null,
                    },
                    $inc : {
                        "days.$[].id" : 1
                    },
                    $push : {
                        "days" : updateObject
                    }
                }
                let options = {
                    arrayFilters : [
                        {"day.id" : 7}
                    ]
                }
                let updateCurrentDay = await feedDataCollection.updateOne(feedDataQuery,updateDocument,options);
                if(updateCurrentDay.acknowledged){
                    console.log("Success : updated current Day array in the userfeed data collection")
                }
                else {
                    console.log("Failed : unable to update current Day array in the userfeed data collection")
                }
                // set workingday to this day and dayObject == working Object.
                workingContentDate = eachDay;
                workingContentObject = updateObject;
                break;
                // break out of the loop here
            }
        }
    }
    else { // this is a fresh request 
        workingContentDate = date;
        workingContentObject = {
            id : 1,
            date ,
            seen : {
                random : {
                    articles : [],
                }
            }
        }
    }
    // now the working date and object is initialized, next step is to what??
    if(workingContentDate == "random"){
        // init the working content object
        daysArray.forEach(x=>{
            x.date == date ? workingContentObject = x.seen.random : false;
        })
        let totalArticlesSeen = [];
        let _ototalArticlesSeen ;
        let firstDay_r_TS, lastDay_r_TS,firstDay_o_TS,lastDay_o_TS;
        firstDay_r_TS = _getTime(oneWeekRetroArr[oneWeekRetroArr.length-1]);
        lastDay_r_TS = _getTime(oneWeekRetroArr[0]);
        firstDay_o_TS = _getTime(oneMonthRetroArr[oneMonthRetroArr.length-2]);
        lastDay_o_TS = _getTime(oneMonthRetroArr[0]);
        daysArray.forEach(x=>{
            for(let each of batchArray){
                x.seen[each].articles !== undefined ? totalArticlesSeen.concat(x.seen[each].articles) : false;
            }
            if(x.date == date){
                _ototalArticlesSeen = x.seen.random.articles;
            }
        });
        console.log("totalArticlesSeen, totalCoursesSeen, totalPostsSeen count", totalArticlesSeen.length, totalCoursesSeen.length, totalPostsSeen.length);
        let fetchRecentQuery = {
            created : {
                $lt : firstDay_r_TS,
                $gt : lastDay_r_TS
            }
        }
        let fetchRandomQuery = {
            created : {
                $lt : firstDay_o_TS,
                $gt : lastDay_o_TS
            }
        }
        let projection = {
            aid : 1,
        }
        let rArticles = []; 
        let oArticles = []; 
        // fetch recent posts// fetch oldRandomPosts.
        let articleList = await articleCollection.find(fetchRecentQuery).project(projection)
        let oarticleList = await articleCollection.find(fetchRandomQuery).project(projection)
        // fill in the recent posts
        articleList.forEach(x=>{
            if(totalArticlesSeen.includes(x) !== -1){
              return;
            }  
            if(rArticles.length <=5){
              rArticles.push(x);
            }
        })
        oarticleList.forEach(x=>{
            if(_ototalArticlesSeen.includes(x) !== -1){
                return;
            }
            if(oArticles.length <= 5){
                oArticles.push(x);
            }
        })
        feedObject.articles = rArticles;
        feedObject.random.articles =  oArticles;
        // update the database for recent
        let _rupdateDocument = {
            $set : {
                "days.$[day].seen.batch1" : {
                    articles : totalArticlesSeen.concat(rArticles),
                },
                "days.$[day].seen.random" : {
                    articles : _ototalArticlesSeen.concat(oArticles),
                }
            }
        }
        let options = {
            arrayFilters : [
                {"day.date" : date}
            ]
        }
        let updated = await feedDataCollection.updateOne(feedDataQuery,_rupdateDocument,options)
        // update the database for random
        if(updated.acknowledged){
            console.log("Success : updated the database for the random post returned")
        }
        else {
            console.log("Failed : unable update the database for the random post returned")
        }
    }
    else { // here fetch content for normal day.
        console.log("workingContentDate", workingContentDate)
        let workingDayQuery = {
            date : workingContentDate,
        }
        let workingDayArticles = await dailyArticleListCollection.findOne(workingDayQuery);
        // params to be used in filtering the day's content
        let returnArticleArr = [];
        let dayDataObject;
        let totalSeenArticlesForTheDay=[];
        let toFillBatch;
        _userFeedData.forEach(x=>{
            x.date == workingContentDate ? dayDataObject = x : false;
        })
        for(let each of batchArray){
            if(dayDataObject.seen[each] == undefined){
                toFillBatch = each;
                break;
            }
            else {
                totalSeenPostForTheDay.concat(dayDataObject.seen[each].posts);
                totalSeenArticlesForTheDay.concat(dayDataObject.seen[each].articles);
                totalSeenCoursesForTheDay.concat(dayDataObject.seen[each].courses)
            }
        }
        console.log("working content object",workingContentObject)
        if(workingDayArticles.count > 0){
                workingDayArticles.posts.forEach(x=>{
                    if(returnArticleArr.length >= 10){
                        return;
                    }
                    totalSeenArticlesForTheDay.includes(x.pid) == -1 ? returnPostArr.push(x.pid) : false; 
                })
            feedObject.articles = returnArticleArr;
        }
        // seen init is totally unnecessary
        // initialize the first batchHere
        let query = {
            user : MID,
            "days.date" : workingContentDate
        };
        let dayUpdateDocument = {
            $set : {
                "days.$.seen" : {}
            }
        }
        updateDocument.$set["days.$.seen"][toFillBatch] = {
            articles : returnArticleArr,
        }
        let updateDay = await feedDataCollection.updateOne(query, dayUpdateDocument)
        if(updateDay.acknowledged){
            console.log("Success : Updated the feedDataCollection with content that were returned")
        }
        else {
            console.log("Failed : unable to update the feed Data Collection")
        }
    }
    return {
        status : "success",
        feedData : feedObject
    }
    //main-scope
    })
}
module.exports = sortArticleFeed;