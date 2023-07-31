// functional
function RetroArray (theDate,range){
    let dateArr = theDate.split(" ");
    let day = dateArr[0];
    let month = dateArr[1];
    let date = Number(dateArr[2]);
    let year = Number(dateArr[3]);
    let retArr = [theDate];
    let currentDay = dateArr.join(" ");
    for (let count = 0; count <= range ; count++){
        if(date == 1){
            switch (month){
                case "Jan" : {
                    month = "Dec";
                    date = 31;
                    year--;
                    break;
                }
                case "Feb" : {
                    month = "Jan";
                    date = 31;
                    break;
                }
                case "Mar" : {
                    month = "Feb";
                    date = 28;
                    break;
                }
                case "Apr" : {
                    month = "Mar";
                    date = 31;
                    break;
                }
                case "May" : {
                    month = "Apr";
                    date = 30;
                    break;
                }
                case "Jun" : {
                    month = "May";
                    date = 31;
                    break;
                }
                case "Jul" : {
                    month = "Jun";
                    date = 30;
                    break;
                }
                case "Aug" : {
                    month = "Jul";
                    date = 31;
                    break;
                }
                case "Sep" : {
                    month = "Aug";
                    date = 31;
                    break;
                }
                case "Oct" : {
                    month = "Sep";
                    date = 30;
                    break;
                }
                case "Nov" : {
                    month = "Oct";
                    date = 31;
                    break;
                }
                case "Dec" : {
                    month = "Nov";
                    date = 30;
                    break;
                }
            }
        }
        else {
            date--;
        }
        switch (day) {
            case "Mon" : {
                day = "Sun";
                break;
            }
            case "Tue" : {
                day = "Mon";
                break;
            }
            case "Wed" : {
                day = "Tue";
                break;
            }
            case "Thu" : {
                day = "Wed";
                break;
            }
            case "Fri" : { 
                day = "Thu";
                break;
            }
            case "Sat" : {
                day = "Fri";
                break;
            }
            case "Sun" : {
                day = "Sat";
                break;
            }
        }
        let theDate = [day, month , date, year];
        theDate = theDate.join(" ");
        retArr.unshift(theDate)
    }
    return retArr;
}
module.exports = RetroArray;