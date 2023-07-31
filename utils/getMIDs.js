let fs = require("fs");
fs.readFile("user-data-processed.json", (err,data)=>{
    data = JSON.parse(data.toString());
    let myArr = [];
    data.forEach(x=>{
        myArr.push(x.__mid);
    })
    fs.writeFile("mids.json", JSON.stringify(myArr), ()=>{
        console.log("done writing file");
        console.log(myArr)
    });
})