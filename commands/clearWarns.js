const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Sadece type=Warning olan uyarıları siler.")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Uyarıları temizlenecek kullanıcı")
        .setRequired(true)),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.", 
        flags: ["Ephemeral"]
      });
    }

    const user = interaction.options.getUser("user");

    // Kendine işlem yapma kontrolü
    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Kendi uyarılarını temizleyemezsin.",
        flags: ["Ephemeral"]
      });
    }

    try {
      // Sadece type = "Warning" olan uyarıları sil
      const result = await Warn.deleteMany({ 
        userId: user.id, 
        guildId: interaction.guild.id, 
        type: "Warning" 
      });

      if (result.deletedCount === 0) {
        return interaction.reply({ 
          content: `> **@${user.username}** için uyarı bulunamadı.`,
          flags: ["Ephemeral"]
        });
      }

      // Başarılı silme işlemi için embed oluştur
      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının tüm uyarıları temizlendi.`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Silinen Uyarı Sayısı", value: `${result.deletedCount}`, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Kullanıcıya bildir
      await interaction.reply({ 
        content: `> **@${user.username}** için tüm (\`${result.deletedCount}\`) uyarılar silindi.`,
        flags: ["Ephemeral"]
      });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error('ClearWarns hatası:', err);
      await interaction.reply({ 
        content: "❌ Uyarılar silinirken bir hata oluştu.", 
        flags: ["Ephemeral"] 
      });
    }
  }
};