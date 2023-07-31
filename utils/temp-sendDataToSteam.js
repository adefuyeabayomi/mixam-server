let data = {
    type : String,
    data : Object
};
fastify.websocketServer.clients.forEach(x=>{
    if(x.MID == MID){
        x.send(JSON.stringify(data));
        console.log("send data to recipients");
    }
})