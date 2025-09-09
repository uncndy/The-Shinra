const mongoose = require("mongoose");

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true, unique: true },
  joinedAt: {type: Date, default: Date.now},
  lang: { type: String, default: 'en' }
});

module.exports = mongoose.model("Guilds", GuildSchema);
