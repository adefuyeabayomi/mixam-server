let validateDevice = require("../utils/validateDevice.js");
async function getAccountInfo (fastify,options){
    fastify.get("/getaccountinfo/", async (request,reply) => {
        let MID = request.query.MID;
        let DID = request.query.DID;
        let collection = fastify.mongo.db.collection("usersAccountInformation");
        let accountInfo = await collection.findOne({__mid:MID});
        let profile = request.query.profile == "true";
        let user= request.query.user == "true";
        console.log("fetch-account-queries", request.query)
        if(accountInfo == null){
            console.log("user does not exist in the database");
            return {
                status : "failed",
                reason : "User does not exist in the database."
            }
        }
        else {
            if(!validateDevice(accountInfo.devices,DID) && !profile){
                return {
                    status : "request_denied",
                    reason : "unauthorised device. Login to authorize this device"
                }
            }
            accountInfo.deviceID = null;
            let deviceInfo;
            accountInfo.devices.forEach(x=>{
                x.id == DID ? deviceInfo = x : false
            })
            let sortedInfo;
            if(user){
                let followers_following = [];
                accountInfo.following.forEach(x=>{
                    if(x){
                        followers_following.push(x.user)
                    }
                })
                accountInfo.followers.forEach(x=>{
                    if(x){
                        followers_following.push(x.user)
                    }
                })
                let findInfo = await collection.find(
                    {
                        __mid : {
                            $in : followers_following
                        }
                    }
                ).toArray();
                sortedInfo = [];
                for(let each of findInfo){
                    let {username, __mid,profileImageLink} = each;
                    sortedInfo.push({username,__mid,profileImageLink})
                }
            }
            return {
                status : "success",
                __userAccountData : accountInfo,
                deviceInfo : profile ?false :  deviceInfo,
                sortedInfo
            }
        }
    })
}

module.exports = getAccountInfo;