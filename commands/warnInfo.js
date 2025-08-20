const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warninfo")
    .setDescription("Belirli bir warn ID'sini gösterir")
    .addIntegerOption(option =>
      option.setName("id")
        .setDescription("Görüntülenecek warn ID")
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
      const warn = await Warn.findOne({
        guildId: interaction.guild.id,
        warnId: warnId
      });

      if (!warn) {
        return interaction.reply({ 
          content: `❌ \`#${warnId}\` ID'li kayıt bulunamadı.`, 
          flags: ["Ephemeral"] 
        });
      }

      // Kullanıcı avatarını al
      let user;
      try {
        user = await interaction.client.users.fetch(warn.userId);
      } catch (err) {
        console.error('Kullanıcı bulunamadı:', err);
      }

      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `${warn.type} Bilgisi - #${warn.warnId}`, 
          iconURL: user?.displayAvatarURL() 
        })
        .setDescription(`**${user ? user.tag : warn.userId}** (\`${warn.userId}\`) kullanıcısına verilen ${warn.type.toLowerCase()} kaydı:`)
        .setThumbnail(user?.displayAvatarURL())
        .addFields(
          { name: "Durum", value: warn.active ? "🟢 Aktif" : "🔴 Pasif", inline: true },
          { name: "Yetkili", value: `<@${warn.moderatorId}>`, inline: true },
          { name: "Tarih", value: `<t:${Math.floor(warn.date.getTime()/1000)}:F>`, inline: true },
          { name: "Sebep", value: warn.reason || "Sebep belirtilmemiş", inline: false }
        )
        .setFooter({ 
          text: "The Shinra | Ateşin Efsanesi", 
          iconURL: interaction.guild.iconURL() 
        })
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed],
        flags: ["Ephemeral"]
      });

    } catch (err) {
      console.error("WarnInfo hatası:", err);
      await interaction.reply({ 
        content: "❌ Kayıt görüntülenirken bir hata oluştu.", 
        flags: ["Ephemeral"] 
      });
    }
  }
};