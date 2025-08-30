const { REST, Routes, ChannelType } = require("discord.js");
const Question = require("../models/Question.js");
const setupIntervals = require("../tasks/interval.js");
const config = require('../config');

// Bu fonksiyonu hazır event içinde kullanacağız
module.exports = {
  name: "ready",
  once: true,
  async execute(client) {

    // --- Slash komutları yükle ---
    const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
    try {
      console.log("🔄 Komutlar güncelleniyor.");
      const commandFiles = client.commands.map(cmd => cmd.data.toJSON());
      // Discord’daki mevcut komutları al
      const currentCommands = await rest.get(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID)
      );

      const normalize = (cmd) => ({
        name: cmd.name,
        description: cmd.description,
        options: cmd.options ?? []
      });

      const local = JSON.stringify(commandFiles.map(normalize));
      const remote = JSON.stringify(currentCommands.map(normalize));
      if (local !== remote) {
        const data = await rest.put(
          Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
          { body: commandFiles }
        );
        console.log("✅ Komutlar güncellendi:", data.map(c => c.name));
      } else {
        console.log("⚡ Komutlarda değişiklik yok, yükleme atlandı.");
      }
      console.log(`✅ ${client.user.tag} olarak giriş yapıldı.`);
    } catch (err) {
      console.error("Komut güncelleme hatası:", err);
    }

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
        console.error("Mesaj kontrol hatası:", err);
      }
    }, ONE_HOUR);
  }
};
