let validateDevice = require("../utils/validateDevice");

async function notificationSocketMain (fastify,options){
    fastify.get("/notificationsocket-main/",{websocket : true}, function wsHandler(connection,req){
        let MID
        let DID
        // listen for messages. handle each request, and give back response for active connections in real time
        let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
        console.log("new notification socket connection")
        connection.socket.on("message", (msg)=>{
            console.log("websocket message : ", msg.toString())
        })
        connection.socket.send("hello from server.")
    })
}

module.exports = notificationSocketMain;