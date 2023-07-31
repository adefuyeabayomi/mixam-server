const validateDevice = require("../utils/validateDevice");
let generateID = require("../utils/generateID");


async function searchEngine (fastify,options){
    let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");
    let articleCollection = fastify.mongo.db.collection("articles_main");
    let courseCollection = fastify.mongo.db.collection("course_main");
    let postsCollection  = fastify.mongo.db.collection("postCollection");
    // create text index for the blah blah
    userInfocollection.createIndex({username : "text"});
    articleCollection.createIndex({title : "text", hashtags : "text"});
    courseCollection.createIndex({title : "text", hashtags : "text"});
    postsCollection.createIndex({postbody : "text", hashtags : "text"})
    fastify.get("/search/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let searchInput = request.query.searchInput;
        let hash = [];
        searchInput.toLowerCase().split(" ").forEach(x=>{
            hash.push("#"+x)
        })
        hash= hash.filter(x=>{
            return x.length > 3;
        })
        console.log("hash", hash)
        

        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        await userInfocollection.updateOne({__mid : MID},{
            $push : {
                recentSearces : searchInput
            }
        })           
        let searchResult = {
            tags : [],
            people : [],
            articles : [],
            courses : [],
            posts : [],
        }
        // search for people 
        let peopleResult = await userInfocollection.find(
            { $text: { $search: searchInput } },
            { score: { $meta: "textScore" } }
           ).sort( { score: { $meta: "textScore" } } ).toArray();
           console.log(peopleResult)
        let postResult = await postsCollection.find(
            { $text: { $search: searchInput } },
            { score: { $meta: "textScore" } }
           ).sort( { score: { $meta: "textScore" } } ).toArray();

        let articleResult = await articleCollection.find(
            { $text: { $search: searchInput } },
            { score: { $meta: "textScore" } }
           ).sort( { score: { $meta: "textScore" } } ).toArray();

        let courseResult = await courseCollection.find(
            { $text: { $search: searchInput } },
            { score: { $meta: "textScore" } }
           ).sort( { score: { $meta: "textScore" } } ).toArray();
        let tagsResult1 = await postsCollection.find(
            {
                "hashtags.keyword" : {
                    $in : hash
                }
            }
        ).toArray();
        let tagsResult2 = await articleCollection.find(
            {
                "hashtags.keyword" : {
                    $in : hash
                }
            }
        ).toArray();
        let tagsResult3 = await courseCollection.find(
            {
                "hashtags.keyword" : {
                    $in : hash
                }
            }
        ).toArray();
            console.log("search term", searchInput);
           searchResult.people = peopleResult;
           searchResult.posts = postResult;
           searchResult.articles = articleResult;
           searchResult.courses = courseResult;
           searchResult.tags = tagsResult1.concat(tagsResult2).concat(tagsResult3);
        return {
            status : "success",
            searchResult
        }
    })
}
module.exports = searchEngine;