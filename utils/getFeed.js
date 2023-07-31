let axios = require("axios");
let url = "http://localhost/feed/";

axios.get(url,{
    params : {
        MID : "me@me2449MID",
        DID : "",
        feedType : "posts"
    }
}).then((response)=>{
    console.log("RESPONSE DATA BELOWS")
    console.log(response.data);
}).catch((error)=>{
    console.log("ERROR INFORMATION BELOW");
    console.log(error);
})