const User = require("../models/User");
const config = require('../config');
const MessageLog = require("../models/MessageLog");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    try {
      // Mesaj kaydet (guildId eklendi)
      await MessageLog.create({
        userId: message.author.id,
        channelId: message.channel.id,
        guildId: message.guild.id,
        timestamp: new Date()
      });
    } catch (err) {
      // Silent fail for message log errors
    }
    const userId = message.author.id;
    const channel = message.guild.channels.cache.get(config.logChannels.memberLog);

    try {
      let userData = await User.findOne({ userId, guildId: message.guild.id });
      if (!userData) {
        userData = new User({ userId, guildId: message.guild.id, level: 1, xp: 0, roles: [] });
        await userData.save();
      }

      userData.xp += 10;

      // Seviye atlama döngüsü: fazla XP'yi yeni seviyeye aktarır
      while (true) {
        const nextLevel = Math.floor(100 * Math.pow(userData.level, 0.5));
        if (userData.xp >= nextLevel) {
          userData.level++;
          userData.xp -= nextLevel;

          if (channel) {
            channel.send(`${config.emojis.xp} Tebrikler ${message.author}, seviye atladın! Şu anki seviyen: ${userData.level}`);
          }

          if (userData.level >= 10 && !userData.roles.includes(config.roles.star)) {
            const role = message.guild.roles.cache.get(config.roles.star);
            if (role) {
              await message.member.roles.add(role).catch(() => {});
              userData.roles.push(config.roles.star);
            }
          }
          if (userData.level >= 20 && !userData.roles.includes(config.roles.partner)) {
            const role = message.guild.roles.cache.get(config.roles.partner);
            if (role) {
              await message.member.roles.add(role).catch(() => {});
              userData.roles.push(config.roles.partner);
            }
          }
        } else {
          break;
        }
      }

      await userData.save();
    } catch (err) {
      // Silent fail for XP system errors
    }
  }
};
