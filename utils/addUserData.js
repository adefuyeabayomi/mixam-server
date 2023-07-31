const fs = require("fs");
async function addUsers (fastify,options){
    let col = fastify.mongo.db.collection("usersAccountInformation");
    fs.readFile("./utils/user-data-processed.json",async (err,data)=>{
        if(err) console.log(err)
        else{
            data = JSON.parse(data.toString());
            let addData = await col.insertMany(data);
            console.log(addData);
        }
    }) 
}
module.exports = addUsers;