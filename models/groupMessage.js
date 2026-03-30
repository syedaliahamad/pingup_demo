const mongoose=require("mongoose");

const Gmessages = new mongoose.Schema({
    from:String,
    Gname:String,
    Gid : String,    
    message:String,
    time:{type:Date,default:Date.now}
});

module.exports = mongoose.model("Gmessage",Gmessages);