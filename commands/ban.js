const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Warn = require("../models/Warn"); // Warn modelini kullanıyoruz
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bir kullanıcıyı sunucudan banlar ve kaydeder.")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("Banlanacak kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("sebep")
        .setDescription("Ban sebebi")
        .setRequired(false)
    ),

  async execute(interaction) {
    // 1. Yetki kontrolü - flags kullanımına geçiş
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.",
        flags: ["Ephemeral"]  // ephemeral yerine flags kullanımı
      });
    }

    const user = interaction.options.getUser("kullanıcı");
    const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

    // 2. Kullanıcı kontrolleri ekleyelim
    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ Kendini banlayamazsın.",
        flags: ["Ephemeral"]
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: "❌ Botu banlayamazsın.",
        flags: ["Ephemeral"]
      });
    }

    try {
      // 3. Hedef kullanıcı rol kontrolü
      let targetMember;
      try {
        targetMember = await interaction.guild.members.fetch(user.id);
      } catch (e) {
        targetMember = null; // Üye sunucuda değilse null
      }
      if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: "❌ Bu kullanıcıyı banlayamazsın - rol hiyerarşisi",
          flags: ["Ephemeral"]
        });
      }
      // Discord'da ban at
      await interaction.guild.members.ban(user.id, { reason });

      // Son warnId'yi al ve 1 artır
      const lastWarn = await Warn.findOne({ guildId: interaction.guild.id }).sort({ warnId: -1 });
      const warnId = lastWarn ? lastWarn.warnId + 1 : 1;

      // MongoDB'ye kaydet
      const newBan = new Warn({
        warnId: warnId,
        type: "Ban",
        guildId: interaction.guild.id,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason: reason,
        active: true 
      });
      await newBan.save();

      // Embed hazırla
      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı sunucudan banlandı.`)
        .addFields(
          { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Ban Kaydı", value: `\`#${warnId}\``, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      // Ban atan kişiye geri bildir
      await interaction.reply({ content: `> **@${user.username}** kullanıcı başarıyla banlandı.`, flags: ["Ephemeral"] });

      // Log kanalına gönder
      const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
      if (logChannel) logChannel.send({ embeds: [embed] });

    } catch (err) {
      console.error('Ban hatası:', err);
      if (interaction.replied) {
        await interaction.followUp({ 
          content: "❌ Kullanıcı banlanamadı.", 
          flags: ["Ephemeral"] 
        });
      } else {
        await interaction.reply({ 
          content: "❌ Kullanıcı banlanamadı.", 
          flags: ["Ephemeral"] 
        });
      }
    }
  },
};
