const mongoose = require("mongoose");

const muteSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  muteEnd: Number // timestamp
});

module.exports = mongoose.model("mutes", muteSchema);