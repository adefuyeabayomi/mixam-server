async function startRoute (fastify,options){
    fastify.get("/",async (request, reply)=>{
        return {
            status : "pong",
            active : "server awake, send in your requests"
        }
    })
}
module.exports = startRoute;