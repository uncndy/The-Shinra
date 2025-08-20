const Level = require("../models/Level");
const config = require('../config');

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;


    try {
      // Mesaj kaydet
      await MessageLog.create({
        userId: message.author.id,
        channelId: message.channel.id,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Mesaj kaydı hatası:", err);
    }

    const userId = message.author.id;
    const channel = message.guild.channels.cache.get(config.channels.memberLog);

    try {
      let userLevel = await Level.findOne({ userId });
      if (!userLevel) {
        userLevel = new Level({ userId, level: 1, xp: 0, rolesGiven: [] });
        await userLevel.save();
      }

      userLevel.xp += 10;

      // Seviye atlama döngüsü: fazla XP'yi yeni seviyeye aktarır
      let leveledUp = false;
      let levelUps = 0;
      while (true) {
        const nextLevel = Math.floor(100 * Math.pow(userLevel.level, 0.5));
        if (userLevel.xp >= nextLevel) {
          userLevel.level++;
          userLevel.xp -= nextLevel;
          leveledUp = true;
          levelUps++;

          if (channel) {
            channel.send(`🎉 Tebrikler ${message.author}, seviye atladın! Şu anki seviyen: ${userLevel.level}`);
          }

          if (userLevel.level >= 10 && !userLevel.rolesGiven.includes(config.roles.star)) {
            const role = message.guild.roles.cache.get(config.roles.star);
            if (role) {
              await message.member.roles.add(role).catch(console.error);
              userLevel.rolesGiven.push(config.roles.star);
            }
          }
        } else {
          break;
        }
      }

      await userLevel.save();
    } catch (err) {
      console.error("XP sistemi hatası:", err);
    }
  }
};