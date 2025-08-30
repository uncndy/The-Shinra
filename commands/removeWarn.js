const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removewarn")
    .setDescription("Belirtilen uyarıyı siler.")
    .addIntegerOption(option =>
      option.setName("id")
        .setDescription("Silinecek warn ID")
        .setRequired(true)),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.", 
        flags: ["Ephemeral"] 
      });
    }

    const warnId = interaction.options.getInteger("id");

    try {
      // Uyarıyı bul
      const warn = await Warn.findOneAndDelete({ 
        warnId, 
        guildId: interaction.guild.id, 
        type: "Warning" 
      });

      if (!warn) {
        return interaction.reply({ 
          content: `❌ \`#${warnId}\` ID'li uyarı bulunamadı veya type 'Warning' değil.`,
          flags: ["Ephemeral"]
        });
      }

      // Kullanıcı bilgisini al
      const user = await interaction.client.users.fetch(warn.userId);

      // Embed oluştur
      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının \`#${warnId}\` ID'li uyarısı silindi.`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Silinen Uyarı ID", value: `\`#${warnId}\``, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Kullanıcıya bildir
      await interaction.reply({ 
        content: `✅ \`#${warnId}\` ID'li uyarı başarıyla silindi!`,
        flags: ["Ephemeral"]
      });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error('RemoveWarn hatası:', err);
      await interaction.reply({ 
        content: "❌ Uyarı silinirken bir hata oluştu.", 
        flags: ["Ephemeral"] 
      });
    }
  }
};