const { updateDocuments } = require("mongodb/lib/operations/common_functions");
let validateDevice = require("../utils/validateDevice");

async function myAccountFunctionalities (fastify, options){
    let utils = fastify.mongo.db.collection("mixam-utils");
    let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
    let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");
    
    fastify.get("/submit-feedback/", async(request,response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let feedBackType = request.query.feedbackType;
        let message = request.query.message;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");

        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let feedbackDay = await utils.findOne({
            [date] : {
                $exists : true
            },
        })
        if(feedbackDay == null){
            await utils.updateOne(
                {
                name : "feedbacks"
            }
            ,
            {
                $set : {
                    [date] : []
                }
            })
        }
        console.log("feedback Day Exist", request.query);
        let feedBackDoc = {
            created : Date.now(),
            date,
            message,
            feedBackType,
            user : MID
        }
        let updateDoc = {
            $push : {
                [date] : feedBackDoc
            }
        }
        let updated = await utils.updateOne({
            name : "feedbacks"
        }, updateDoc)
        if(updated.acknowledged){
            return {
                status : "success"
            }
        }
        else{
            return {
                status : failed
            }
        }
        return true;
    })
    fastify.get("/update-login-details/", async (request, response)=>{
        let MID = request.query.MID;
        let DID = request.query.DID;
        let action = request.query.action;
        let query = {
            __mid : MID
        };
        let userData = await userInfocollection.findOne(query)
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        if(action == "change-password"){
            let updateDocument = {
                $set : {
                    password : request.query.password
                }
            }
            let updated = await userInfocollection.updateOne(query,updateDocument);
            if(updated.acknowledged){
                return {
                    status : "success"
                }
            }
            else{
                return {
                    status : failed
                }
            }
        }
        else if (action == "change-login-type"){
            let updateDocument = {
                $set : {
                    loginType : request.query.loginType
                }
            }
            let updated = await userInfocollection.updateOne(query,updateDocument);
            if(updated.acknowledged){
                return {
                    status : "success"
                }
            }
            else{
                return {
                    status : failed
                }
            }
        }
        else if (action == "email-change-verify"){
            return {
                status : "success"
            }
        }
        else if(action == "change-email"){
            let updateDocument = {
                $set : {
                    email : request.query.email
                }
            }
            let updated = await userInfocollection.updateOne(query,updateDocument);
            if(updated.acknowledged){
                return {
                    status : "success"
                }
            }
            else{
                return {
                    status : failed
                }
            }
        }
        
        // request to change login method -- done with immediate effect
        // request to change password -- done with immediate effect
        // request to change email -> send the email link to the user's mailbox
    })
}

module.exports = myAccountFunctionalities;

