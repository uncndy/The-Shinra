const Question = require("../models/Question.js");
const setupIntervals = require("../tasks/interval.js");
const config = require('../config');

// Bu fonksiyonu hazır event içinde kullanacağız
module.exports = {
  name: "ready",
  once: true,
  async execute(client) {

    // --- Slash komutlarını yükle ---
    // Bu kısım kaldırıldı!
    
    // --- Presence güncelle ---
    const updatePresence = () => {
      const guild = client.guilds.cache.first();
      if (!guild) return;
      client.user.setPresence({
        activities: [{ name: `The Shinra | ${guild.memberCount} üye`, type: 3 }],
        status: "online"
      });
    };
    updatePresence();
    client.on("guildMemberAdd", updatePresence);
    client.on("guildMemberRemove", updatePresence);

    // --- Interval fonksiyonları ---
    setupIntervals(client);

    // --- Revive sistemi (1 saat aralık) ---
    const ONE_HOUR = 60 * 60 * 1000;
    setInterval(async () => {
      const now = Date.now();
      const hour = new Date().getHours();
      if (hour < 9 || hour >= 22) return;

      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) return;

      const channel = guild.channels.cache.get(config.channels.generalChat);
      if (!channel) return;

      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const recent = messages.filter(m => m.createdTimestamp >= now - ONE_HOUR);

        if (recent.size === 0) {
          const reviveRole = guild.roles.cache.find(r => r.name.toLowerCase() === "revive");
          const mention = reviveRole ? `<@&${reviveRole.id}>` : "@everyone";

          const questions = await Question.find({ guildId: guild.id });
          if (!questions.length) return;

          const question = questions[Math.floor(Math.random() * questions.length)].text;
          await channel.send(`${mention} ${question}`);
          console.log("💡 Son 1 saatte mesaj yok, soru soruldu!");
        }
      } catch (err) {
        // Silent fail for message check errors
      }
    }, ONE_HOUR);
    
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı.`);
  }
};
// Not: Slash komutlarının yüklenme kısmı kaldırıldı çünkü artık ayrı bir deploy scripti kullanılıyor.