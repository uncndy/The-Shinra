const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  cooldown: 24 * 60 * 60 * 1000, // 24 saat
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Günde bir kez ödül alarak XP kazan."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      let userData = await User.findOne({ userId, guildId });
      if (!userData) {
        userData = new User({
          userId,
          guildId,
          level: 1,
          xp: 0,
          roles: [],
        });
        await userData.save();
      }

      // Rastgele XP
      const xpEarned = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
      userData.xp += xpEarned;

      // Seviye kontrolü
      const nextLevel = Math.floor(100 * Math.pow(userData.level, 1.5));
      let leveledUp = false;

      if (userData.xp >= nextLevel) {
        userData.level++;
        leveledUp = true;
      }

      await userData.save();

      let response = `${config.emojis.xp} Günlük ödülünü aldın! **+${xpEarned} XP** eklendi.`;
      if (leveledUp) {
        response += `\n${config.emojis.xp} Seviye atladın! Yeni seviyen: **${userData.level}**`;
      }

      await interaction.reply({ content: response, flags: ["Ephemeral"] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: `${config.emojis.cancel} Bir hata oluştu, lütfen tekrar dene.`,
        flags: ["Ephemeral"],
      });
    }
  },
};
