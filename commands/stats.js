const { SlashCommandBuilder } = require("discord.js");
const MessageLog = require("../models/MessageLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Mesaj istatistiklerini göster")
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("İstatistiğini görmek istediğin kullanıcı")
        .setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("kullanici") || interaction.user;

    try {
      const messages = await MessageLog.find({ userId: user.id });

      if (!messages.length) {
        return interaction.reply({ content: "Bu kullanıcıya ait mesaj kaydı yok.", ephemeral: true });
      }

      const totalMessages = messages.length;
      const lastMessage = messages[messages.length - 1].timestamp;

      // En çok mesaj atılan kanal
      const channelCounts = {};
      for (const msg of messages) {
        channelCounts[msg.channelId] = (channelCounts[msg.channelId] || 0) + 1;
      }

      const topChannelId = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0][0];
      const topChannel = interaction.guild.channels.cache.get(topChannelId);

      await interaction.reply({
        content: `📊 **${user.username}** istatistikleri:
- Toplam mesaj: **${totalMessages}**
- Son mesaj: <t:${Math.floor(lastMessage.getTime() / 1000)}:R>
- En çok mesaj attığı kanal: ${topChannel ? topChannel : "Bilinmiyor"}`,
        ephemeral: false
      });
    } catch (err) {
      console.error("Stats komutu hatası:", err);
      interaction.reply({ content: "Bir hata oluştu.", ephemeral: true });
    }
  }
};
