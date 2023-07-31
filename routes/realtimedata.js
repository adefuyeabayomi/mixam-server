let validateDevice = require("../utils/validateDevice");


async function realTimeData (fastify,fastifyOptions){
    // route for notifications socket connections.
    fastify.get("/realtime-data/",{websocket : true},async function wsHandler(connection,request){
        let requestQueries = request.query;
        console.log("request Queries",requestQueries)
        let MID = requestQueries.MID;
        //let DID = requestQueries.DID;
        //let userAgent = requestQueries.userAgent;
        connection.socket.MID = MID;
        console.log("socket identifier MID",connection.socket.MID);
        count = 1;
        fastify.websocketServer.clients.forEach(x=>{
            console.log(`client ${count} : `, x.MID);
            count ++;
            x.send(JSON.stringify({type : "ping", message : "connection established"}))
        })
        connection.socket.on("message", (msg)=>{
            console.log("websocket message : ", msg.toString());
        });
    })
    // get notifications route.

    fastify.get("/fetch-notifications/",async (request,response)=>{
        let DID = request.query.DID
        let MID = request.query.MID
        let query = {
            __mid : MID
        }
        let notificationCollection = fastify.mongo.db.collection("notificationsCollection");
//        let userInfocollection  = fastify.mongo.db.collection("usersAccountInformation");
        let userNotifications = await notificationCollection.findOne(query);
        return {
            status : "success",
            userNotifications
        }
    })
}

module.exports = realTimeData;
