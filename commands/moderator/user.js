const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const config = require("../../config");
const User = require("../../models/User");
const Sanction = require("../../models/Sanction");
const {components, texts} = require('../../components')

module.exports = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("Kullanıcının veritabanındaki bilgilerini gösterir")
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Bilgilerini görmek istediğin kullanıcı")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.roles.cache.has(config.roles.juniorStaff) && interaction.user.id === config.owners.ownerUserID) {
        return interaction.reply({
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          components: [texts.tr.modOrStaffOrJrStaffControlText, components.separator]
        });
      }
      // Kullanıcı seçimi
      const targetUser = interaction.options.getUser("kullanici") || interaction.user;

      // Veritabanından kullanıcı verilerini getir
      const userData = await User.findOne({
        userId: targetUser.id,
        guildId: interaction.guild.id
      });

      if (!userData) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bu kullanıcının veritabanında kaydı bulunamadı.`,
          flags: ["Ephemeral"]
        });
      }

      // Rolleri al
      const member = interaction.guild.members.cache.get(targetUser.id);
      const currentRoles = member ? member.roles.cache.map(role => role.name).filter(name => name !== "@everyone") : [];

      // Son 5 yaptırımı getir
      const sanctions = await Sanction.find({
        userId: targetUser.id,
        guildId: interaction.guild.id
      })
      .sort({ timestamp: -1 })
      .limit(5);

      // Embed oluştur
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${targetUser.tag} - Kullanıcı Bilgileri`,
          iconURL: targetUser.displayAvatarURL()
        })
        .setDescription(`${config.emojis.member} ${targetUser.tag} (\`${targetUser.id}\`) kullanıcısının bilgileri:\n**${config.emojis.join} Sunucuya Katılma Tarihi:** <t:${Math.floor(userData.joinDate.getTime() / 1000)}:F>\n**${config.emojis.join} Discord'a Katılma Tarihi:** <t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:F>`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: `${config.emojis.info} Durum`,
            value: `**Mute:** \`${userData.currentMute?.muteUntil ? `Aktif (${new Date(userData.currentMute.muteUntil).toLocaleString("tr-TR")})` : "Yok"}\`\n**Ban:** \`${userData.currentBan?.isBanned ? "Aktif" : "Yok"}\``,
            inline: true
          },
          {
            name: `${config.emojis.edit} Geçmiş Nickler`,
            value: userData.previousNicknames && userData.previousNicknames.length > 0 
              ? userData.previousNicknames.slice(-5).map(nick => `\`${nick.nickname}\``).join(", ")
              : "Yok",
            inline: true
          }
        );
      embed.setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
           .setTimestamp();

      // Veritabanındaki rolleri de göster
      if (userData.roles && userData.roles.length > 0) {
        const dbRoles = userData.roles
          .map(roleId => interaction.guild.roles.cache.get(roleId))
          .filter(role => role)
          .map(role => role.name);

        if (dbRoles.length > 0) {
          embed.addFields({
            name: `${config.emojis.role} Roller`,
            value: dbRoles.slice(0, 10).map(role => `\`${role}\``).join(", ") + (dbRoles.length > 10 ? `\n*+${dbRoles.length - 10} rol daha*` : ""),
            inline: true
          });
        }
      }

      // Yaptırımları ekle
      if (sanctions.length > 0) {
        const sanctionsText = sanctions.map((sanction, index) => {
          const moderator = interaction.guild.members.cache.get(sanction.moderatorId);
          const moderatorName = moderator ? moderator.user.tag : "Bilinmeyen";
          const duration = sanction.duration ? ` (\`${Math.floor(sanction.duration / 1000 / 60)} dk\`)` : "";
          const status = sanction.active ? `${config.emojis.success}` : `${config.emojis.cancel}`;
          
          return `${config.emojis.info} ${status} **${sanction.type}**${duration} - <t:${Math.floor(sanction.timestamp.getTime() / 1000)}:R>\n> **Moderatör:** ${moderatorName}\n> **Sebep:** ${sanction.reason}`;
        }).join('\n\n');

        embed.addFields({
          name: `${config.emojis.warning} Son Yaptırımlar`,
          value: sanctionsText.length > 1024 ? sanctionsText.substring(0, 1020) + "..." : sanctionsText,
          inline: false
        });
      } else {
        embed.addFields({
          name: `${config.emojis.warning} Son Yaptırımlar`,
          value: "Yaptırım kaydı bulunamadı",
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      // Silent fail for user command errors
      await interaction.reply({
        content: `${config.emojis.cancel} Kullanıcı bilgileri alınırken bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
