async function addContentTestData (fastify) {
    let retroArr = require("./retroArr");
    let MID = "me@me.me2449MID";
    let date = String(new Date()).split(" ").slice(0,4).join("-");
    let created = Date.now();
    let _14daysArray = retroArr(date.split("-"),13);
    let articleDocument= {
        aid : "",
        title: "This article was posted on " + String(new Date()), 
        author : "",
        author_username : "Article Author Name",
        coverImage : "",
        hashtags: "",
        sections : [
            {
                id : 0,
                title : {
                    contentType : "title",
                    content : "Section Heading/Title Here",
                    placeholder : "Input your article title here"
                },
                contentItems : []
            }
        ]
    };
    let courseDocument = {
        cid : "",
        title: "This course was posted on " + String(new Date()), 
        author : "",
        author_username : "Course Author",
        coverImage : "",
        hashtags: "",
        sections : [
            {
                id : 0,
                title : {
                    contentType : "title",
                    content : "Section Heading/Title Here",
                    placeholder : "Input your article title here"
                },
                contentItems : []
            }
        ]
    };
    let postObj = {
        pid : "", 
        postlink : "",
        postbody : "A big fat lie fed to the public to reveal only what people want to hear and not the truth. Sadly that's the reality of life, words are power",
        hashtags : "",
        imageurl : "",
        type : "post",
        author : "" ,
        date ,
        created ,
        author : "",
        author_username : "Post Author Username",
        likesCount : 0,
        comments : [],
        commentsCount : 0,
        views : 0,
    };
    let articleCollection = fastify.mongo.db.collection("articles_main");
    let courseCollection = fastify.mongo.db.collection("course_main");
    let allpostscollection  = fastify.mongo.db.collection("postCollection");
    let dailyArticleListCollection = fastify.mongo.db.collection("dailyArticleList");
    let dailyCourseListCollection = fastify.mongo.db.collection("dailyCourseList")
    let postperdaylistcollection  = fastify.mongo.db.collection("dailyPostList");
    for(let each of _14daysArray){
        // add articles 50
        let aid;
        let data = articleDocument;
        for (let c = 0; c<=20; c++){
            aid = String(Math.round(Math.random() * 1000000000)) + MID;
            data.aid = aid;
            console.log("article data",data);

            let dayIsInitialized = await dailyArticleListCollection.findOne({date});
            
            if(dayIsInitialized){
                let query = {date};
                let updateDocument = {
                    $push : {  
                        "posts" : { aid : data.aid, MID }
                    },
                    $inc: {
                        "count" : 1
                    }
                }
                let added = await dailyArticleListCollection.updateOne(query,updateDocument)
                if(added.acknowledged){
                    console.log("added to post daily lists");
                }
                else{
                    console.log({
                        status : "failed",
                        reason : "unable to add to database"
                    })
                }
            }
            
            else {
                // in the postperdaycollection. everydocument has an identifier, the date and a post which is an array of pids put inside an object
                let initializeDay = await dailyArticleListCollection.insertOne({date, posts : [{aid : data.aid, MID}], count : 0})
                if(initializeDay.acknowledged){ 
                    console.log("added to post daily lists");
                }
                else{
                    console.log( {
                        status : "failed",
                        reason : "unable to add to database"
                    })
                }
            }
            //insert arrays that need to be inserted here.
            let added = await articleCollection.insertOne(data);
            console.log("added", added.acknowledged);
            if(added.acknowledged){
                console.log( {
                    status : "success",
                })
            } 
            else{
                 console.log({
                    status : "failed",
                    reason : "unable to add the article to the database, please try again."
                })               
            }
        }
    }
    for(let each of _14daysArray){
        // add posts 50
        let pid;
        for (let c = 0; c<=50; c++){
            pid = String(Math.round(Math.random() * 1000000000)) + MID;
            postObj.pid = pid;
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
                    console.log({
                        status : "failed",
                        reason : "unable to add to database"
                    })
                }
            }
            else {
                // in the postperdaycollection. everydocument has an identifier, the date and a post which is an array of pids put inside an object
                let initializeDay = await postperdaylistcollection.insertOne({date, posts : [{pid:postObj.pid, MID}], count: 0})
                if(initializeDay.acknowledged){ 
                    console.log("added to post daily lists");
                }
                else{
                    console.log( {
                        status : "failed",
                        reason : "unable to add to database"
                    })
                }
            }
            // finished adding to the daily lists.
            // add to the general collection.
            let addedToGeneral = await allpostscollection.insertOne(postObj);
            if(addedToGeneral.acknowledged){
                console.log("added to general posts")
            }
            else{
                console.log({
                    status : "failed",
                    reason : "unable to add to database"
                })
            }
        }
    }
    for(let each of _14daysArray){
        // add courses 10
        let data = courseDocument;
        let cid;
        for (let c = 0; c<=10; c++){
            console.log("course data init",data);
            cid = String(Math.round(Math.random() * 1000000000)) + MID;
            data.cid = cid;
                let dayIsInitialized = await dailyCourseListCollection.findOne({date});
                
                if(dayIsInitialized){
                    let query = {date};
                    let updateDocument = {
                        $push : {  
                            "posts" : { cid: data.cid , MID}
                        },
                        $inc: {
                            "count" : 1
                        }
                    }
                    let added = await dailyCourseListCollection.updateOne(query,updateDocument)
                    if(added.acknowledged){
                        console.log("added to post daily lists");
                    }
                    else{
                         console.log({
                            status : "failed",
                            reason : "unable to add to database"
                        })
                    }
                }
                
                else {
                    // in the postperdaycollection. everydocument has an identifier, the date and a post which is an array of pids put inside an object
                    let initializeDay = await dailyCourseListCollection.insertOne({date, posts : [{cid : data.cid, MID}], count : 0})
                    if(initializeDay.acknowledged){ 
                        console.log("added to post daily lists");
                    }
                    else{
                        console.log({
                            status : "failed",
                            reason : "unable to add to database"
                        })
                    }
                }
                
                //insert arrays that need to be inserted here.
                let added = await courseCollection.insertOne(data);
                console.log("course initialized", added.acknowledged);
                let query = {
                    cid
                }
                let ret = await courseCollection.findOne(query);
                if(added.acknowledged){
                    console.log( {
                        status : "success",
                        ret
                    })
                }
                else{
                   console.log( {
                        status : "failed",
                        reason : "unable to add the article to th e database, please try again."
                    })
                }
        }
    }
}

module.exports = addContentTestData;
