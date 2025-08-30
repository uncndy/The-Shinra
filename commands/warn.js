const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Bir kullanıcıya uyarı ver.")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Uyarılacak kullanıcı")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Uyarı nedeni")
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
    const reason = interaction.options.getString("reason");

    // Kendine işlem yapma kontrolü
    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Kendine uyarı veremezsin.",
        flags: ["Ephemeral"]
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: "❌ Bota uyarı veremezsin.",
        flags: ["Ephemeral"]
      });
    }

    try {
      // Rol hiyerarşisi kontrolü
      const member = await interaction.guild.members.fetch(user.id);
      if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: "❌ Bu kullanıcıya uyarı veremezsin - rol hiyerarşisi",
          flags: ["Ephemeral"]
        });
      }

      // Son warnId'yi al ve 1 artır
      const lastWarn = await Warn.findOne({ guildId: interaction.guild.id }).sort({ warnId: -1 });
      const warnId = lastWarn ? lastWarn.warnId + 1 : 1;

      const newWarn = new Warn({
        warnId: warnId,
        type: "Warning",
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason: reason,
        active: true
      });

      await newWarn.save();

      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısına uyarı verildi.`)
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Uyarı ID", value: `\`#${warnId}\``, inline: true },
          { name: "Sebep", value: reason, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Kullanıcıya geri bildirim
      await interaction.reply({ 
        content: `✅ **@${user.username}** kullanıcısı \`#${warnId}\` ID ile uyarıldı!`,
        flags: ["Ephemeral"]
      });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error("Warn hatası:", err);
      if (interaction.replied) {
        await interaction.followUp({ 
          content: "❌ Uyarı eklenirken bir hata oluştu.", 
          flags: ["Ephemeral"] 
        });
      } else {
        await interaction.reply({ 
          content: "❌ Uyarı eklenirken bir hata oluştu.", 
          flags: ["Ephemeral"] 
        });
      }
    }
  }
};