const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Bir kullanıcıyı sunucudan atar ve kaydeder.")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("Atılacak kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("sebep")
        .setDescription("Kick sebebi")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.",
        flags: ["Ephemeral"]
      });
    }

    const user = interaction.options.getUser("kullanıcı");
    const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

    // Kullanıcı kontrolleri
    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Kendini atamazsın.",
        flags: ["Ephemeral"]
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: "❌ Botu atamazsın.",
        flags: ["Ephemeral"]
      });
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Rol hiyerarşisi kontrolü
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: "❌ Bu kullanıcıyı atamazsın - rol hiyerarşisi",
          flags: ["Ephemeral"]
        });
      }

      await member.kick(reason);

      // Son warnId'yi al ve 1 artır
      const lastWarn = await Warn.findOne({ guildId: interaction.guild.id }).sort({ warnId: -1 });
      const warnId = lastWarn ? lastWarn.warnId + 1 : 1;

      const newKick = new Warn({
        warnId,
        type: "Kick",
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
        active: false
      });
      await newKick.save();

      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı sunucudan atıldı.`)
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Kick Kaydı", value: `\`#${warnId}\``, inline: true },
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Kick atan kişiye geri bildir
      await interaction.reply({ 
        content: `> **@${user.username}** kullanıcı başarıyla atıldı.`, 
        flags: ["Ephemeral"] 
      });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.kickLog);
      if (logChannel) logChannel.send({ embeds: [embed] });

    } catch (err) {
      console.error('Kick hatası:', err);
      if (interaction.replied) {
        await interaction.followUp({ 
          content: "❌ Kullanıcı atılamadı.", 
          flags: ["Ephemeral"] 
        });
      } else {
        await interaction.reply({ 
          content: "❌ Kullanıcı atılamadı.", 
          flags: ["Ephemeral"] 
        });
      }
    }
  }
};