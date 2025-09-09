const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const MessageLog = require("../../models/MessageLog");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("istatistikler")
    .setDescription("Kullanıcı mesaj istatistiklerini gösterir")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("İstatistiğini görmek istediğin kullanıcı")
        .setRequired(false)
    ),

  async execute(interaction) {
    let user = interaction.options.getUser("kullanıcı");
    if (!user) user = interaction.user;

    // Kullanıcı verilerini al
    const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
    
    // Tüm mesajları al
    const messages = await MessageLog.find({ userId: user.id, guildId: interaction.guild.id });

    if (!messages.length && !userData) {
      return interaction.reply({ content: "Bu kullanıcının hiç mesaj kaydı yok.", flags: ["Ephemeral"] });
    }

    const now = new Date();

    // Toplam mesaj
    const totalMessages = messages.length;

    // Son mesaj
    const lastMessage = messages[messages.length - 1];
    const lastMessageTime = lastMessage ? `<t:${Math.floor(lastMessage.timestamp.getTime() / 1000)}:R>` : "Hiç mesaj yok";

    // Filtreler
    const last24h = messages.filter(m => now - m.timestamp <= 24 * 60 * 60 * 1000).length;
    const last7d = messages.filter(m => now - m.timestamp <= 7 * 24 * 60 * 60 * 1000).length;
    const last30d = messages.filter(m => now - m.timestamp <= 30 * 24 * 60 * 60 * 1000).length;

    // En çok mesaj atılan 5 kanal
    const channelCounts = {};
    for (const msg of messages) {
      channelCounts[msg.channelId] = (channelCounts[msg.channelId] || 0) + 1;
    }

    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // --- Embedler ---
    const statsEmbed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} - İstatistikleri`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL())
      .setDescription(`**${user.username}** (\`${user.id}\`) kullanıcısına ait istatistikler:`)
      .addFields(
        { 
          name: `${config.emojis.stats} Genel İstatistikler`, value: `• **Son 24 Saat:** \`${last24h} mesaj\`\n• **Son 7 Gün:** \`${last7d} mesaj\`\n• **Son 30 Gün:** \`${last30d} mesaj\`\n• **Toplam Mesaj:** \`${totalMessages} mesaj\`\n• **Son Mesaj:** ${lastMessageTime}`, inline: false },
        {
          name: `${config.emojis.stats} Kanal İstatistikleri`, value: topChannels.map(([channelId, count], i) => {
            const channel = interaction.guild.channels.cache.get(channelId);
            return `**${i + 1}.** ${channel ? channel : `#${channelId}`} — \`${count} mesaj\``;
          }).join("\n") || "Kanal bulunamadı.",
          inline: false
        },
        { 
          name: "", value: `${config.emojis.info} Mesaj sayısı, botun veritabanında kaydedilen mesaj sayısını yansıtmaktadır. Bot, hiçbir mesaj içeriğini kaydetmez.`,
          inline: false 
        }
      )
      .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [statsEmbed] });
  }
};