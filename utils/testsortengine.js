let auth = '{"DID":"7317446909115777000","MID":"ademi131@gmail.com8831MID"}';
auth = JSON.parse(auth);
let axios = require("axios");
let feedurl = "http://localhost/feed/"
axios.get(feedurl,{
    params : {
        MID : auth.MID,
        DID : auth.DID,
        feedType : "all",
        userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36'
    }
}).then((response)=>{
    console.log("response receieved",response.data.data);
})
.catch(error=>{
    console.log(error.message, error.request)
})