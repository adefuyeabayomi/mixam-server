let validateDevice = require("../utils/validateDevice");

async function fetchCourse (fastify, options){
    let uCollection = fastify.mongo.db.collection("usersAccountInformation");
    fastify.get("/fetchcourses/", async (request, response)=>{
        let cid = request.query.cid;
        let courseCollection = fastify.mongo.db.collection("course_main");
        let query = {
            cid
        }
        let retrieved = await courseCollection.findOne(query);
        let authorData = await uCollection.findOne({
            __mid : retrieved.author
        });
        retrieved.author_username = authorData.username;
        retrieved.author_image = authorData.profileImageLink;
        if(retrieved == null){ 
            return {
                status : "failed",
                reason : "course not in database"
            }
        }
        else{ 
            return {
                status : "success",  
                courseData : retrieved
            }
        }
    })
    fastify.get("/fetchClassRoomState/", async (request,response)=>{
        let userCollection = fastify.mongo.db.collection("usersAccountInformation");
        let MID = request.query.MID;
        let DID = request.query.DID;
        let cid = request.query.cid;
        let query = {
            __mid : MID
        }
        let userData = await userCollection.findOne(query)
        if(!validateDevice(userData.devices, DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let myCourses = userData.myCourses;
        let theCourse;
        myCourses.forEach(x=>{
            x.cid == cid ? theCourse = x : false;
        })
        return {
            status : "success",
            theCourse
        }
    })
}

module.exports = fetchCourse;