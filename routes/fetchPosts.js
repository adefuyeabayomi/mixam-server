async function fetchPosts (fastify, options){
    let uCollection = fastify.mongo.db.collection("usersAccountInformation");
    fastify.get("/fetchposts/", async (request, response)=>{
        let pid = request.query.pid;
        let postCollection = fastify.mongo.db.collection("postCollection");
        let query = {
            pid
        }
        let retrieved = await postCollection.findOne(query);
        let authorData = await uCollection.findOne({
            __mid : retrieved.author
        });
        retrieved.author_username = authorData.username;
        retrieved.author_image = authorData.profileImageLink;
        if(retrieved == null){ 
            return {
                status : "failed",
                reason : "post not in database"
            }
        }
        else{ 
            return { 
                status : "success",
                postData : retrieved
            }
        }
    })
}

module.exports = fetchPosts;