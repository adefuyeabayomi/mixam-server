let generateID = require("../utils/generateID");

async function recoverPassword(fastify,options){
    fastify.get("/forgotpassword/",async (request,reply)=>{
        let email = request.query.email;
        let newPassword = generateID(8) + Math.round(Math.random() * 10);
        let query = {
            email
        }        // declare collections here 
        let collection = fastify.mongo.db.collection("usersAccountInformation");
        let userData = await collection.findOne(query);
        let username = userData.username;

        let updateDocument = {
            $set : {
                password : newPassword,
            }
        }
        let updated = await collection.updateOne(query,updateDocument);
        if(updated.acknowledged){
            // send mail here
            const mailOptions = {
                from : "Mixam Business<abayomiadefuye1@gmail.com>",
                to : email,
                subject : "Password Recovery",
            }
            const formatOptions = {
                username,
                new_password : newPassword,
            }
            const formatName = "forgot_password";
            options.mailer(formatName,formatOptions,mailOptions);
            return {
                status : "success",
            }
        }
        else {
            return {
                status : "failed",
            }
        }
    })
}

module.exports = recoverPassword;