function calculateRetroDaysBack(requestsToday){
    if(requestsToday >= 0 && requestsToday <= 15){
        return 5;
    }
    else if(requestsToday >= 16 && requestsToday <= 25){
        return 13;
    }
    else if(requestsToday >= 26 && requestsToday <= 40){
        return 22;
    }
    else if(requestsToday >= 41 && requestsToday <= 55){
        return 31;
    }
    else {
        return 100;
    }
}
module.exports = calculateRetroDaysBack;