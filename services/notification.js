let moment = require("moment");
class Notification {
    constructor (options){
        this.fastify = options.fastify;
        this.collection = options.collection;
    }
}
module.exports = Notification;