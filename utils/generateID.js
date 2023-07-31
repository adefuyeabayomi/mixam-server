const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

function generateID (length  = 24){
    let result = "";
    const characterLength = characters.length;
    for(let i = 0; i < length; i++){
        result += characters.charAt(Math.floor(Math.random() * characterLength));
    }
    return result;
}

module.exports = generateID;



