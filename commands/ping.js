const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun gecikmesini gösterir."),
  
  async execute(interaction) {
    try {
      const start = Date.now();
      await interaction.deferReply();
      const microPing = Date.now() - start;

      const wsPing = interaction.client.ws.ping;
      const timePing = Date.now() - start;

      // Ping durumuna göre renk ve emoji belirleme
      let color, status;
      if (wsPing < 100) {
        color = 0x00FF00; // Yeşil
        status = "🟢 Mükemmel";
      } else if (wsPing < 200) {
        color = 0xFFFF00; // Sarı
        status = "🟡 İyi";
      } else {
        color = 0xFF0000; // Kırmızı
        status = "🔴 Yüksek";
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle("🏓 Pong!")
        .setDescription(
          `${status}\n\n` +
          `:hourglass: **Toplam Gecikme:** \`${timePing}ms\`\n` +
          `:sparkles: **Komut Gecikmesi:** \`${microPing}ms\`\n` +
          `:stopwatch: **WebSocket:** \`${wsPing}ms\``
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('Ping hatası:', err);
      if (!interaction.deferred) {
        await interaction.reply({ 
          content: "❌ Ping ölçülürken bir hata oluştu.", 
          flags: ["Ephemeral"] 
        });
      } else {
        await interaction.editReply({ 
          content: "❌ Ping ölçülürken bir hata oluştu." 
        });
      }
    }
  }
};