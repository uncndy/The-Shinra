const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Belirtilen kadar mesajı siler.")
    .addIntegerOption(option =>
      option.setName("sayı")
        .setDescription("Silinecek mesaj sayısı (1-100)")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.", 
        flags: ["Ephemeral"] 
      });
    }

    const amount = interaction.options.getInteger("sayı");
    if (amount < 1 || amount > 100) {
      return interaction.reply({ 
        content: "❌ 1 ile 100 arasında bir sayı giriniz.", 
        flags: ["Ephemeral"] 
      });
    }

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.reply({ 
        content: `✅ ${deleted.size} mesaj başarıyla silindi.`, 
        flags: ["Ephemeral"] 
      });
    } catch (err) {
      console.error('Clear hatası:', err);
      await interaction.reply({ 
        content: "❌ Mesajlar silinemedi.", 
        flags: ["Ephemeral"] 
      });
    }
  },
};