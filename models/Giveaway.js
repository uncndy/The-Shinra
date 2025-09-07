const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  channelId: {
    type: String,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  prize: {
    type: String,
    required: true
  },
  winnerCount: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  endTime: {
    type: Date,
    required: true
  },
  participants: [{
    type: String,
    required: true
  }],
  creator: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Giveaway', giveawaySchema);
