const dotenv = require("dotenv").config();
const fastify = require("fastify")({logger: true});
const fastifyFileUpload = require("fastify-file-upload");
const fastifyStatic = require("fastify-static");
const fastifyCors = require("fastify-cors");
const cloudinary = require("cloudinary").v2;
const fastifyWebSocket = require("fastify-websocket");
const net = require("net");
const path = require("path");
const dbconnnector = require("./db/db-connector");  
let mailer = require("./services/emailing/mailer");

// import routes
const homeRoute = require("./routes/home");
const authRoute = require("./routes/auth");
const welcomeDataRoute = require("./routes/welcomedata");
const fetchuserdata = require("./routes/fetchuseraccountinfo");
const publishpost = require("./routes/init-pp");
const editArticle = require("./routes/init-pa");
const editCourse = require("./routes/init-pc");
const fetchArticle = require("./routes/fetchArticle");
const fetchCourse = require("./routes/fetchCourse");
const fetchPost = require("./routes/fetchPosts");
const sortEngine = require("./routes/sort-engine-v2");
const appRealTimeData = require("./routes/realtimedata");
const contentItemFunctionalities = require("./routes/content-item-functionalities");
const mainFunctionalities = require("./routes/mains");
const recoverPassword = require("./routes/passwordrecovery");
const myAccountFunctionalities = require("./routes/myAccountFunc");
const searchEngine = require("./routes/search_engine");
const chatFunctionalities = require("./routes/chatFunctionalities");
// configure cloudinary
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });

// register the necessary fastify plugins
// register fastify websocket
fastify.register(fastifyWebSocket,{
    options : {
        maxPayload : 1048576
    }
})
// register fastify 
fastify.register(fastifyFileUpload);
// register fastify db plugin
fastify.register(dbconnnector);
// register fastify cors 
fastify.register (fastifyCors,{
    origin : true,
    methods : ["GET","POST"],
    credentials : true,
    maxAge : 36000,
});
// register fastify-static.
fastify.register(fastifyStatic,{
    root : path.join(__dirname,'app-ui/dist')
});

//const addUsers = require("./utils/addUserData")
//const sampleOp = require("./routes/sampleOp");
//const addSamplePosts = require("./utils/addPostData");
//const addSampleArticles = require("./utils/addArticleData");
//const addSampleCourses = require("./utils/addCourseData");
//register routes
(function () {
    fastify.register(homeRoute);
    fastify.register(authRoute,{mailer});
    fastify.register(publishpost,{cloudinary});
    fastify.register(fetchuserdata);
    fastify.register(fetchArticle);
    fastify.register(fetchCourse);
    fastify.register(fetchPost);
    fastify.register(editArticle,{cloudinary});
    fastify.register(editCourse,{cloudinary});
    fastify.register(sortEngine);
    fastify.register(mainFunctionalities,{mailer, cloudinary});
    fastify.register(recoverPassword, {mailer});
    fastify.register(appRealTimeData);
    fastify.register(contentItemFunctionalities);
    fastify.register(welcomeDataRoute,{cloudinary, mailer});
    fastify.register(myAccountFunctionalities)
    fastify.register(searchEngine)
    fastify.register(chatFunctionalities)
})()

// configure the websocket server down below;
//fastify.register(sampleOp);
//fastify.register(addUsers);
//fastify.register(addSampleArticles);
//fastify.register(addSamplePosts);
//fastify.register(addSampleCourses);

// start server.
async function start(){
    try{
        await fastify.listen(process.env.PORT,process.env.HOST,(err,addr)=>{
            if(err){
                console.error("AN ERROR OCCURED WHILE STARTING THE SERVER", err);
                throw err;
            }
            else {
                console.log(`server running on ${addr}`)
                fastify.websocketServer.on("connection", (socket)=>{
                    console.log("connection to fastify web socket server")
                })
                fastify.websocketServer.on("error", (error)=>{
                    console.log("An error occured in the websocket server : ", error.message);
                });
                fastify.websocketServer.on("close", ()=>{
                    console.log("web socket serverserver closing now")
                });
            }
        })
    }
    catch (error){
        process.exit(1);
    }
}
start();