let fs = require("fs");
let date = String(new Date()).split(" ").slice(0,4).join(" "); 

async function addPostsToDB (fastify,options){
    let postCollection = fastify.mongo.db.collection("postCollection");
let theData ;
fs.readFile("./utils/postDataSet.json", async (err,data)=>{
    if(err) console.error(err.message);
    else{
        theData = JSON.parse(data);
        console.log(theData.length);
        //
        let added = await postCollection.insertMany(theData);
        if(added.acknowledged = true){
            console.log(added.insertedCount)
        }
        else {
            console.log("unable to add data sets to database")
        }
        let retrieveForToday = await postCollection.find({date});
        console.log("posts added for today", retrieveForToday);
    }
})
}
module.exports = addPostsToDB;