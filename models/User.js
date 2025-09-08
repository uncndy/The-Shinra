/**
 * @fileoverview User model for storing user data and statistics
 * @author The Shinra Development Team
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  guildId: { type: String, required: true },
  joinDate: { type: Date, default: Date.now },
  previousNicknames: [{
    nickname: String,
    timestamp: { type: Date, default: Date.now }
  }],
  currentMute: {
    sanctionId: { type: Number, default: null },
    muteUntil: { type: Date, default: null }
  },
  currentBan: {
    sanctionId: { type: Number, default: null },
    isBanned: { type: Boolean, default: false }
  },
  roles: { type: [String], default: [] },
  level: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
});

module.exports = mongoose.model("User", userSchema);