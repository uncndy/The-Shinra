const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Bir kullanıcının banını kaldırır ve kaydını günceller.")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("Banı kaldırılacak kullanıcı")
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

    const user = interaction.options.getUser("kullanıcı");

    try {
      // Banlı kullanıcı kontrolü
      const bannedUsers = await interaction.guild.bans.fetch();
      if (!bannedUsers.has(user.id)) {
        return interaction.reply({
          content: "❌ Bu kullanıcı zaten banlı değil.",
          flags: ["Ephemeral"]
        });
      }

      // Discord'dan ban kaldır
      await interaction.guild.members.unban(user.id);

      // MongoDB'deki active ban kaydını bul ve güncelle
      const banRecord = await Warn.findOneAndUpdate(
        { 
          userId: user.id, 
          guildId: interaction.guild.id, 
          type: "Ban", 
          active: true 
        },
        { active: false },
        { new: false }
      );

      // Embed hazırla
      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının banı kaldırıldı.`)
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Ban Kaydı", value: banRecord ? `\`#${banRecord.warnId}\`` : "MongoDB kaydı bulunamadı", inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Kullanıcıya geri bildir
      await interaction.reply({ 
        content: `✅ **@${user.username}** kullanıcısının banı kaldırıldı.`, 
        flags: ["Ephemeral"] 
      });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
      if (logChannel) {
        await logChannel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error('Unban hatası:', err);
      await interaction.reply({ 
        content: "❌ Kullanıcının banı kaldırılamadı.", 
        flags: ["Ephemeral"] 
      });
    }
  },
};