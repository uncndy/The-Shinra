const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require('../../config');
const {components, texts} = require('../../components')

module.exports = {
  data: new SlashCommandBuilder()
    .setName("temizle")
    .setDescription("Belirtilen kadar mesajı siler.")
    .addIntegerOption(option =>
      option.setName("sayı")
        .setDescription("Silinecek mesaj sayısı (1-100)")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator) && interaction.user.id !== config.owners.sphinx) {
      return interaction.reply({ 
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [texts.tr.modControlText, components.separator]
      });
    }

    const amount = interaction.options.getInteger("sayı");
    if (amount < 1 || amount > 100) {
      return interaction.reply({ 
        content: `${config.emojis.cancel} 1 ile 100 arasında bir sayı giriniz.`, 
        flags: ["Ephemeral"] 
      });
    }

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.reply({ 
        content: `${config.emojis.success} **${deleted.size}** mesaj başarıyla silindi.`, 
        flags: ["Ephemeral"] 
      });
    } catch (err) {
      // Silent fail for clear errors
      await interaction.reply({ 
        content: `${config.emojis.cancel} Mesajlar silinemedi.`, 
        flags: ["Ephemeral"] 
      });
    }
  },
};