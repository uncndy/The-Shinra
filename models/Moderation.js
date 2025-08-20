const mongoose = require("mongoose");

const moderationSchema = new mongoose.Schema({
  userId: String,
  type: { type: String }, // "ban", "kick", "mute"
  moderatorId: String,
  reason: String,
  date: { type: Date, default: Date.now },
  active: { type: Boolean, default: true } // mute veya ban hala aktif mi
});

module.exports = mongoose.model("moderations", moderationSchema);