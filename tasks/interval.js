// task/interval.js
const sanctionModel = require("../models/Sanction");
const User = require("../models/User");

async function setupTasks(client) {
  setInterval(async () => {
    const now = new Date();

    // Süresi dolan mute'leri User modelinden bul
    const expiredMutes = await User.find({
      "currentMute.muteUntil": { $lte: now },
      "currentMute.sanctionId": { $ne: null }
    });

    for (const userData of expiredMutes) {
      try {
        const guild = client.guilds.cache.get(userData.guildId);
        if (!guild) continue;

        const member = await guild.members.fetch(userData.userId).catch(() => null);
        if (!member) continue;

        const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (muteRole && member.roles.cache.has(muteRole.id)) {
          await member.roles.remove(muteRole);
          console.log(`${member.user.tag} susturması kaldırıldı.`);

          // Sanction tablosunda active: false yap
          await sanctionModel.updateMany(
            {
              userId: userData.userId,
              guildId: userData.guildId,
              type: "Mute",
              active: true
            },
            { active: false }
          );

          // User modelini güncelle
          userData.currentMute = {
            sanctionId: null,
            muteUntil: null
          };
          await userData.save();
        }
      } catch (err) {
        // Silent fail for mute removal errors
      }
    }
  }, 10 * 1000);
}

module.exports = setupTasks;