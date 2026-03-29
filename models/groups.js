const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: {
    type: String,
    required: true,
  },
  members: [
    {
      type: String,
    },
  ],
  createdBy: {
    type: String,
  },
});

module.exports = mongoose.model("Group", groupSchema);