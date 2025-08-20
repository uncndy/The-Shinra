const { SlashCommandBuilder } = require("discord.js");
const Level = require("../models/Level");

module.exports = {
  cooldown: 24 * 60 * 60 * 1000, // 24 saat
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Günde bir kez ödül alarak XP kazan."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    try {
      let userLevel = await Level.findOne({ userId });
      if (!userLevel) {
        userLevel = new Level({
          userId,
          level: 1,
          xp: 0,
          rolesGiven: []
        });
        await userLevel.save();
      }

      // Rastgele XP
      const xpEarned = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
      userLevel.xp += xpEarned;

      // Seviye kontrolü
      const nextLevel = Math.floor(100 * Math.pow(userLevel.level, 1.5));
      let leveledUp = false;

      if (userLevel.xp >= nextLevel) {
        userLevel.level++;
        leveledUp = true;
      }

      await userLevel.save();

      await interaction.reply({content: `🎁 Günlük ödülünü aldın! **+${xpEarned} XP** eklendi.`, flags: ["Ephemeral"] });

    } catch (err) {
      console.error("Claim komutu hatası:", err);
      await interaction.reply({
        content: "❌ Bir hata oluştu, lütfen tekrar dene.",
        ephemeral: true
      });
    }
  }
};