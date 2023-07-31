class CreateNotification {
    constructor (type = undefined,text = undefined,action=undefined, addressedTo=undefined) {
        this.type = type;
        this.text = text;
        this.action = action;
        this.seen = false;
        this.info = {};
        this._nid = undefined;
        this.addressedTo = addressedTo;
    }
    addText (text) {
        this.text = text
    }
    addAction (action) {
        this.action = action
    }
    addInfo (field,value) {
        this.info[field] = value;
    }
    addNID (value){
        this._nid = value;
    }
    getNotification () {
        return {
            created : Date.now(),
            type : this.type,
            text : this.text,
            action : this.action,
            seen : this.seen,
            info : this.info,
            notificationID : this._nid,
            addressedTo : this.addressedTo,
            read : false,
        }
    }
}

module.exports = CreateNotification;
// listing notification types
// content item milestone notification
// post-liked, comment-liked, reply-liked
// post-shared, post-viewed
// comment-reply reply-reply, reply-mention
// post-like-milestone, post-view-milestone, 
// follow-success, new-follower, follower-milestone
// content-item-published-success, from-mixam
// content-suggestions based on user activity/availability
// course / learning milestones.
// init - 20 notifications to work on.
// content item likes, comment likes, reply likes
// comment - reply mentions notifications. 
// content item milestone notifications
// follow notifications
// from mixam notification