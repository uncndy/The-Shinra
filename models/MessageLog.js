const mongoose = require("mongoose");

const messageLogSchema = new mongoose.Schema({
  userId: String,
  channelId: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MessageLog", messageLogSchema);
