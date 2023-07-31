const validateDevice = require("../utils/validateDevice");
let generateID = require("../utils/generateID");

async function chatFunctionalities (fastify,options){
    let userInfocollection = fastify.mongo.db.collection("usersAccountInformation");
    let chatCollection = fastify.mongo.db.collection("chats");
    fastify.get("/fetch-my-chats/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;

        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let mids = []
        if(userData.chatHistory){
            for(let each of userData.chatHistory){
                mids.push(each.user)
            }
        }
        console.log("MIDS", mids)
        let cwUData = await userInfocollection.find({
            __mid : {
                $in : mids
            }
        }).toArray();
        for(let each of userData.chatHistory){
            cwUData.forEach(x=>{
                let {username,profileImageLink,__mid} = x;
                if(__mid == each.user){
                    each.username = username
                    each.imgLink  = profileImageLink
                }
            })
        }
        console.log("chat History", userData.chatHistory)
        return {
            status : "success",
            chatHistory : userData.chatHistory ? userData.chatHistory : []
        }
    })
    fastify.get("/fetch-chat-details/", async (request,response)=>{
        let DID = request.query.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = request.query.MID;
        let user = request.query.user;
        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let participantid1 = `${user}_${MID}`;
        let participantid2 = `${MID}_${user}`;
        let partipantSearchText = participantid1 + " " + participantid2;
        let chatDetails = await chatCollection.find(
            { $text: { $search: partipantSearchText } }
            ).toArray();
            console.log(chatDetails);
            return {
                status : "success",
                chatDetails : chatDetails[0].chats
            }

           
        // fetch chat details

        // return no chat details.
    })
    fastify.get("/open-chat/", async (request,response)=>{
        let DID = request.query.DID;
        let MID = request.query.MID;
        let participantid = request.query.participantid;
        let user = request.query.user;
        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }

        let updateDoc = {
            $set : {
                "chatHistory.$[theChat].unreadMsgCount" : 0
            }
        }
        let options = {
            arrayFilters : [
                {
                    "theChat.participantid" : participantid
                }
            ]
        }

        let chatDetails = await chatCollection.findOne({
            participants : participantid
        });

        let updateMe = await userInfocollection.updateOne({
            __mid : MID
        },updateDoc,options)
        let updateUser  = await userInfocollection.updateOne({
            __mid : user
        },updateDoc,options);
        let toUserData = await userInfocollection.findOne({
            __mid : user
        })
        userData = await userInfocollection.findOne({
            __mid : MID
        })
        let chatHistoryUser;
        let chatHistoryMe;

        toUserData.chatHistory.forEach(x=>{
            console.log(x.participantid , chatDetails.participants, "id are equal",x.participantid ==chatDetails.participants)
            if(x.participantid == chatDetails.participants){
                chatHistoryUser = x;
                chatHistoryUser.username= userData.username;
                chatHistoryUser.imgLink = userData.profileImageLink;
            }
        })
        userData.chatHistory.forEach(x=>{
            console.log(x.participantid , chatDetails.participants, "id are equal",x.participantid ==chatDetails.participants)
            if(x.participantid == chatDetails.participants){
                chatHistoryMe = x;
                chatHistoryMe.username= toUserData.username;
                chatHistoryMe.imgLink = toUserData.profileImageLink;
            }
        })
        console.log("history ", toUserData.chatHistory)
        let dataTt = {
            type : "history-update",
            data : {chatHistory : chatHistoryUser}
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == user){
                x.send(JSON.stringify(dataTt));
                console.log("send data to recipients")
            }
        })
        let dataM = {
            type : "history-update",
            data : {chatHistory : chatHistoryMe}
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == MID){
                x.send(JSON.stringify(dataM));
                console.log("send data to recipients")
            }
        })

    

        return {
            status : "success"
        }

    })
    fastify.post("/send-chat-message/", async (request,response)=>{
        console.log("request body", request.body)
        let requestBody= request.body
        let DID = requestBody.DID;
        let date = String(new Date()).split(" ").slice(0,4).join(" ");
        let MID = requestBody.MID;
        let user = requestBody.user;
        let message = requestBody.message;
        let newChat = requestBody.newchat == "true";
        let userData = await userInfocollection.findOne({
            __mid : MID
        })
        if(!validateDevice(userData.devices,DID)){
            return {
                status : "failed",
                reason : "You are not authorized to make this transaction."
            }
        }
        let participantid1 = `${user}_${MID}`;
        let participantid2 = `${MID}_${user}`;
        let partipantSearchText = participantid1 + " " + participantid2;
        let chatDetails;
        let chatHistoryObjMe;
        let chatHistoryObjUser;
        if(newChat){
            // add new chat 
            let toUserData = await userInfocollection.findOne({
                __mid : user
            })
            let chatDocument = {
                participants : participantid1,
                chats : [],
                lastMsgTime : Date.now(),
            }
            await chatCollection.insertOne(chatDocument);
            // updateBothUser's Chat History
            chatHistoryObjMe = {
                user : user,
                username : toUserData.username,
                imgLink : toUserData.profileImageLink,
                lastTimeActive : Date.now(),
                participantid : participantid1,
                lastMsg : message,
                lastMsgSentBy : MID,
                unreadMsgCount : 1
            }
            chatHistoryObjUser= {
                user : MID,
                username : userData.username,
                imgLink : userData.profileImageLink,
                lastTimeActive : Date.now(),
                participantid : participantid1,
                lastMsg : message,
                lastMsgSentBy : MID,
                unreadMsgCount : 1
            }
            console.log("chat his user", chatHistoryObjUser, "chat his me", chatHistoryObjMe);
            let updateDocumentMe = {
                $push : {
                    chatHistory : chatHistoryObjMe
                }
            }
            let updateDocumentUser = {
                $push : {
                    chatHistory : chatHistoryObjUser
                }
            }
            let updatedme = await userInfocollection.updateOne({
                __mid : MID
            },updateDocumentMe)
            let updateuser = await userInfocollection.updateOne({
                __mid : user
            },updateDocumentUser)
        }
        let newMessage = {
            message, 
            sentBy : MID,
            sent_time : Date.now(),
            seen : false
        }
        chatDetails = await chatCollection.find(
            { $text: { $search: partipantSearchText } }
            ).toArray();

        let updateChat = await chatCollection.updateOne({
            participants : chatDetails[0].participants
        }, {
            $push :
            {
                chats : newMessage
            }
        })
        if(!newChat){
        let updateDoc = {
            $set : {
                "chatHistory.$[theHistory].lastTimeActive" : Date.now(),
                "chatHistory.$[theHistory].lastMsg" : message,
                "chatHistory.$[theHistory].lastMsgSentBy" : MID,
            },
            $inc : {
                "chatHistory.$[theHistory].unreadMsgCount" : 1
            }
        }
        let options = {
            arrayFilters : [
                {
                    "theHistory.participantid" : chatDetails[0].participants
                }
            ]
        }
        let updateMe = await userInfocollection.updateOne({
            __mid : MID
        }, updateDoc,options)

        let updateUser = await userInfocollection.updateOne({
            __mid : user
        }, updateDoc,options)
        toUserData = await userInfocollection.findOne({
            __mid : user
        })
        userData = await userInfocollection.findOne({
            __mid : MID
        })
        let chatHistoryUser;
        let chatHistoryMe;

        toUserData.chatHistory.forEach(x=>{
            console.log(x.participantid , chatDetails[0].participants, "id are equal",x.participantid ==chatDetails.participants)
            if(x.participantid == chatDetails[0].participants){
                chatHistoryUser = x;
                chatHistoryUser.username = userData.username;
                chatHistoryUser.profileImageLink = userData.profileImageLink;
            }
        })
        userData.chatHistory.forEach(x=>{
            console.log(x.participantid , chatDetails[0].participants, "id are equal",x.participantid ==chatDetails.participants)
            if(x.participantid == chatDetails[0].participants){
                chatHistoryMe = x;
                chatHistoryMe.username = toUserData.username;
                chatHistoryMe.profileImageLink = toUserData.profileImageLink;
            }
        })
        console.log("history ", toUserData.chatHistory)
        let dataTt = {
            type : "history-update",
            data : {chatHistory : chatHistoryUser}
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == user){
                x.send(JSON.stringify(dataTt));
                console.log("send data to recipients")
            }
        })
        let dataM = {
            type : "history-update",
            data : {chatHistory : chatHistoryMe}
        };
        fastify.websocketServer.clients.forEach(x=>{
            if(x.MID == MID){
                x.send(JSON.stringify(dataM));
                console.log("send data to recipients")
            }
        })


        }
        newMessage.participants = chatDetails[0].participants
        if(newChat){
            let dataTt = {
                type : "new-chat",
                data : {participants : chatDetails[0].participants, newMessage, chatHistoryObjUser}
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == user){
                    x.send(JSON.stringify(dataTt));
                    console.log("send data to recipients")
                }
            })
        }

        else{
            let dataT = {
                type : "new-chat-message",
                data : newMessage
            };
            fastify.websocketServer.clients.forEach(x=>{
                if(x.MID == user){
                    x.send(JSON.stringify(dataT));
                    console.log("send data to recipients")
                }
            })     
        }

        if(updateChat.acknowledged){
            return {
                status : "success",
                newMessage,
                historyData : newChat ? chatHistoryObjMe : ""
            }
        }
        else {
            return {
                status : "failed",
            }
        }
    })
} 
module.exports = chatFunctionalities;