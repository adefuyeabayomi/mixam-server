let validateDevice = require("../utils/validateDevice");

async function handlerTempGet (fastify,options){
    fastify.get("/route/", async (request , reply ) => {
        let DID = request.query.DID;
        let MID = request.query.MID;
        let collection = fastify.mongo.db.collection("collectionName");
        let deviceArray;
        if(validateDevice(deviceArray,DID)){
            // perform action here...
        }
        else{
            console.log("unauthorized device", "operation name");
            return {
                status : "request_denied",
                reason : "unauthorized device"
            }
        }
    })
}
