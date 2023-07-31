// functional
function _getTime (date){
    let monthArray = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let day = date.split(" ")[2];
    let month = date.split(" ")[1];
    month = monthArray.indexOf(month);
    month++;
    let year = date.split(" ")[3];
    let time = new Date([month,day,year].join(" ")).getTime();
    console.log("date = ", date ," : ", time);
    return time;
}