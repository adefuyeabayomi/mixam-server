const validateDevice = require("../utils/validateDevice")
let date = String(new Date()).split(" ").slice(0,4).join(" ");

async function unfollowUser(fastify,options){
    fastify.get("/unfollowuser/", async (reqest,response)=>{
        let DID = request.query.DID;
        let MID = request.query.MID;
        let toUnfollow = request.query.toUnfollow;
        let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");

        let toUnfollowQuery = {
            __mid : toUnfollow
        }
        let userQuery = {
            __mid : MID
        }

        let userData = await userInfocollection.findOne({userQuery})

        let toUnfollowData = await userInfocollection.findOne(toUnfollowQuery)

        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        // remove the follower from user' following 
        let userUpdateDocument = {
            $unset : {
                "following.$[userIdentifier]" : ""
            }
        }
        let options = {
            arrayFilters : [
                {
                    "userIdentifier.user" : MID
                }
            ]
        }
        let removeFollowing = await userInfocollection.updateOne(userQuery,userUpdateDocument,options)
        // remove following from toUnfollow's followers
        
        if(removeFollowing.acknowledged){
            console.log("removed follower successfully");
        }
        else{
            console.log("added user successfully");
        }
        let toUnfollowUpdateDocument = {
            $unset : {
                "followers.$[userIdentifier]" : toUnfollow
            }
        }

        let removeFollower = await userInfocollection.updateOne(toUnfollowQuery,toUnfollowUpdateDocument,options)
        if(removeFollower.acknowledged){

        }
        else{

        }
    
    
    })
}
module.exports = unfollowUser;