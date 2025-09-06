/**
 * @fileoverview Sanction model for storing moderation actions
 * @author The Shinra Development Team
 */

const mongoose = require("mongoose");

const sanctionSchema = new mongoose.Schema({
  sanctionId: { type: Number, required: true, unique: true }, // Yaptırımın benzersiz ID'si
  type: { 
    type: String, 
    enum: ["Warning", "Mute", "Kick", "Ban"], 
    required: true 
  },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: "Sebep belirtilmedi" },
  timestamp: { type: Date, default: Date.now },
  duration: { type: Number, default: null }, // Mute için süre (ms)
  active: { type: Boolean, default: true } // Mute veya ban hala aktif mi
});

module.exports = mongoose.model("Sanction", sanctionSchema);
