const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const MessageLog = require("../models/MessageLog"); // senin model yolu

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Kullanıcı mesaj istatistiklerini gösterir")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("İstatistiğini görmek istediğin kullanıcı")
        .setRequired(false)
    ),

  async execute(interaction) {
    let user = interaction.options.getUser("kullanıcı");
    if (!user) user = interaction.user;

    // Tüm mesajları al
    const messages = await MessageLog.find({ userId: user.id, guildId: interaction.guild.id });

    if (!messages.length) {
      return interaction.reply({ content: "Bu kullanıcının hiç mesaj kaydı yok.", flags: ["Ephemeral"] });
    }

    const now = new Date();

    // Toplam mesaj
    const totalMessages = messages.length;

    // Son mesaj
    const lastMessage = messages[messages.length - 1];
    const lastMessageTime = `<t:${Math.floor(lastMessage.timestamp.getTime() / 1000)}:R>`;

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
      .setDescription(`<@${user.id}> kullanıcısına ait istatistikler:\n\n**Son Mesaj:** ${lastMessageTime}\n**Toplam Mesaj:** \`${totalMessages} mesaj\`\n**Son 24 Saat:** \`${last24h} mesaj\`\n**Son 7 Gün:** \`${last7d} mesaj\`\n**Son 30 Gün:** \`${last30d} mesaj\``)
      .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    const channelsEmbed = new EmbedBuilder()
      .setAuthor({ name: `${user.username} - İstatistikleri`, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL())
      .setDescription(`<@${user.id}> kullanıcısına ait istatistikler:\n\n`
        + topChannels.map(([channelId, count], i) => {
          const channel = interaction.guild.channels.cache.get(channelId);
          return `**${i + 1}.** ${channel ? channel : `#${channelId}`} — \`${count} mesaj\``;
        }).join("\n") || "Kanal bulunamadı."
      )
      .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    // --- Butonlar ---
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("stats_page1")
        .setLabel("📊 Genel")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stats_page2")
        .setLabel("📑 Kanallar")
        .setStyle(ButtonStyle.Secondary),
    );

    // Mesajı gönder
    await interaction.reply({ embeds: [statsEmbed], components: [row] });

    // Gerçek Message nesnesini al
    const message = await interaction.fetchReply();

    // Collector
    const collector = message.createMessageComponentCollector({ time: 60_000 });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: "Bu buton sana ait değil.", flags: ["Ephemeral"] });
      }

      if (i.customId === "stats_page1") {
        await i.update({ embeds: [statsEmbed], components: [row] });
      } else if (i.customId === "stats_page2") {
        await i.update({ embeds: [channelsEmbed], components: [row] });
      }
    });

    collector.on("end", async () => {
      await message.edit({ components: [] }).catch(() => {});
    });
  }
};
