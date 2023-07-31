// mixam user info collection "usersAccountInformation";
let userInfoCollection = fastify.mongo.db.collection("usersAccountInformation");
// daily log for published posts.
let allpostscollection  = fastify.mongo.db.collection("postCollection");

let postperdaylistcollection  = fastify.mongo.db.collection("dailyPostList");

let PostDataCollection = fastify.mongo.db.collection("userPostDataCollection");

// init the user in the database. grabbing their MIDs in one array