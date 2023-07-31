let fs = require("fs");
let date = String(new Date()).split(" ").slice(0,4).join(" "); 

async function addArticlesToDB (fastify,options){
    let articleCollection = fastify.mongo.db.collection("articles_main");
let theData ;
fs.readFile("./utils/articleDataSet.json",async (err,data)=>{
    if(err) console.error(err.message);
    else{
        theData = JSON.parse(data);
        console.log(theData.length)
        let added = await articleCollection.insertMany(theData);
        if(added.acknowledged = true){
            console.log(added.insertedCount)
        }
        else {
            console.log("unable to add data sets to database")
        }
        let retrieveForToday = await articleCollection.find({date}).toArray();
        console.log("articles added for today", retrieveForToday);
    }
})

}
module.exports = addArticlesToDB;