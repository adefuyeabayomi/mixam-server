let fs = require("fs");
let date = String(new Date()).split(" ").slice(0,4).join(" "); 

async function addCoursesToDB (fastify,options){
    let courseCollection = fastify.mongo.db.collection("course_main");
let theData ;
fs.readFile("./utils/courseDataSet.json",async (err,data)=>{
    if(err) console.error(err.message);
    else{
        theData = JSON.parse(data);
        console.log(theData[0]);
        let added = await courseCollection.insertMany(theData);
        if(added.acknowledged = true){
            console.log(added.acknowledged)
        }
        else {
            console.log("unable to add data sets to database")
        }
        let retrieveForToday = await courseCollection.find({date});
        console.log("posts added for today", retrieveForToday);
    }
})
}
module.exports = addCoursesToDB;