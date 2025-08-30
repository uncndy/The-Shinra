const mongoose = require("mongoose");

const levelSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  rolesGiven: [String]
});

module.exports = mongoose.model("Level", levelSchema);
