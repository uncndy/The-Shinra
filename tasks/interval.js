// task/interval.js
const muteModel = require("../models/Mute");
const warnModel = require("../models/Warn");

async function setupTasks(client) {
  setInterval(async () => {
    const now = Date.now();
    const expiredMutes = await muteModel.find({ muteEnd: { $lte: now } });

    for (const mute of expiredMutes) {
      try {
        const guild = client.guilds.cache.get(mute.guildId);
        if (!guild) continue;

        const member = await guild.members.fetch(mute.userId).catch(() => null);
        if (!member) continue;

        const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === "muted");
        if (muteRole && member.roles.cache.has(muteRole.id)) {
          await member.roles.remove(muteRole);
          console.log(`${member.user.tag} susturması kaldırıldı.`);

          // Warn tablosunda active: false yap - "Mute" olarak düzeltildi
          await warnModel.updateMany(
            { 
              userId: mute.userId, 
              guildId: mute.guildId, 
              type: "Mute", // "mute" yerine "Mute" olarak değiştirildi
              active: true 
            },
            { active: false }
          );

          // DB'den mute kaydını sil
          await muteModel.deleteOne({ _id: mute._id });
        }
      } catch (err) {
        console.error("Mute kaldırılırken hata:", err);
      }
    }
  }, 10 * 1000);
}

module.exports = setupTasks;