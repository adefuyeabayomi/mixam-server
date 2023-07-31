let validateDevice = require("../utils/validateDevice");

async function fetchArticle(fastify,options){
    let uCollection = fastify.mongo.db.collection("usersAccountInformation");
    fastify.get("/fetcharticle/",async (request,reply)=>{
        let MID = request.query.MID;
        // no need for DID. it is for all to see.
        let aid = request.query.aid;
        let collection = fastify.mongo.db.collection("articles_main");
        let query = { 
            aid
        };
        console.log("query", query);
        let articleData = await collection.findOne(query);
        let authorData = await uCollection.findOne({
            __mid : articleData.author
        });
        articleData.author_username = authorData.username;
        articleData.author_image = authorData.profileImageLink;
        return {
            status : "success", 
            articleData
        };
    })
}
module.exports = fetchArticle;