const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

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
        status = `${config.emojis.server} Mükemmel`;
      } else if (wsPing < 200) {
        color = 0xFFFF00; // Sarı
        status = `${config.emojis.server} İyi`;
      } else {
        color = 0xFF0000; // Kırmızı
        status = `${config.emojis.server} Yüksek`;
      }

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${config.emojis.target} Pong!`)
        .setDescription(
          `${status}\n\n` +
          `${config.emojis.ping} **Toplam Gecikme:** \`${timePing}ms\`\n` +
          `${config.emojis.ping} **Komut Gecikmesi:** \`${microPing}ms\`\n` +
          `${config.emojis.ping} **WebSocket:** \`${wsPing}ms\``
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      // Silent fail for ping errors
      if (!interaction.deferred) {
        await interaction.reply({
          content: `${config.emojis.cancel} Ping ölçülürken bir hata oluştu.`,
          flags: ["Ephemeral"]
        });
      } else {
        await interaction.editReply({
          content: `${config.emojis.cancel} Ping ölçülürken bir hata oluştu.`
        });
      }
    }
  }
};