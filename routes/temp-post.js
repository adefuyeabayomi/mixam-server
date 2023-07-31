let fs = require("fs");
const path = require("path");
let validateDevice = require("../utils/validateDevice");

async function tempPost(fastify , options){
    fastify.post("/route/", async function (request , reply) {
        console.log(request.body);
        let requestBody = JSON.parse(request.body.params);
        let MID = requestBody.MID;
        let DID = requestBody.DID;
        console.log("MID" , MID, "DID", DID);
        let collection  = fastify.mongo.db.collection("collectionName");
        let userData = await collection.findOne({__mid:MID});
        if(!validateDevice(userData.deviceID,DID)){
            return {
                status : "request_denied",
                reason : "unauthorized request"
            }            
        }
        console.log("authorized Devices", userData.deviceID);
        let files = request.raw.files;
        let filePath = path.join(__dirname,'../.temp/');
        let fileName = files.profilephotoupload.name
        let filedir = filepath+fileName;
        fs.writeFile(filePath+fileName,data,()=>{
            console.log("done saving to temp dir");
        })
        console.log(files)
        console.log(".temp/"+fileName);
        await options.cloudinary.uploader.upload(".temp/"+fileName,{tags:"basic_sample"}, (err,result)=>{
            if(err){
                console.error(err.message);
            }
            else{
                console.log(result.url);
                let added = await collection.updateOne({__mid:MID},{ $set : {profileImageLink : result.url}});
                console.log("photo upload successful  to both cloudinary and database", added.acknowledged,{profileImageLink : result.url});
                fs.unlink(filedir,()=>{
                   console.log("deleted successfully")
                })
            }
        })
    })
}