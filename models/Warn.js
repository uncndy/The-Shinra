const mongoose = require("mongoose");

const warnSchema = new mongoose.Schema({
  warnId: { type: Number, required: true, unique: true },
  type: { type: String }, // 'Ban' | 'Mute' | 'Kick' | 'Warning'
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  date: { type: Date, default: Date.now },
  active: { type: Boolean, default: false } // Ban veya mute hala aktif mi
});

module.exports = mongoose.model("Warns", warnSchema);