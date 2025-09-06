const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("performance")
    .setDescription("Bot performans metriklerini gösterir")
    .addSubcommand(subcommand =>
      subcommand
        .setName("show")
        .setDescription("Mevcut performans metriklerini gösterir")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("reset")
        .setDescription("Performans metriklerini sıfırlar")
    ),

  async execute(interaction, client) {
    // Yetki kontrolü
    if (interaction.user.id !== config.roles.ownerUserID) { // Bot sahibinin ID'si
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu sadece bot sahibi kullanabilir.`,
        flags: ["Ephemeral"]
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "show") {
      const metrics = client.performanceMonitor.getMetrics();

      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.stats} Bot Performans Metrikleri`)
        .setDescription("Botun performans istatistikleri")
        .addFields(
          {
            name: `${config.emojis.time} Çalışma Süresi`,
            value: `\`${metrics.uptime.human}\``,
            inline: true
          },
          {
            name: `${config.emojis.stats} Komut İstatistikleri`,
            value: `**Toplam:** \`${metrics.commandsExecuted}\`\n**Saatlik:** \`${metrics.rates.commandsPerHour}\``,
            inline: true
          },
          {
            name: `${config.emojis.stats} Mesaj İstatistikleri`,
            value: `**Toplam:** \`${metrics.messagesProcessed}\`\n**Saatlik:** \`${metrics.rates.messagesPerHour}\``,
            inline: true
          },
          {
            name: `${config.emojis.stats} API Çağrıları`,
            value: `**FindCord:** \`${metrics.apiCalls.findcord}\`\n**Discord:** \`${metrics.apiCalls.discord}\``,
            inline: true
          },
          {
            name: `${config.emojis.warning} Hata İstatistikleri`,
            value: `**Toplam:** \`${metrics.errorsOccurred}\`\n**Saatlik:** \`${metrics.rates.errorsPerHour}\``,
            inline: true
          },
          {
            name: `${config.emojis.time} Yanıt Süresi`,
            value: `**Ortalama:** \`${metrics.responseTime.average}ms\`\n**Min:** \`${metrics.responseTime.min}ms\`\n**Max:** \`${metrics.responseTime.max}ms\``,
            inline: true
          }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: ["Ephemeral"] });

    } else if (subcommand === "reset") {
      client.performanceMonitor.reset();
      
      await interaction.reply({
        content: `${config.emojis.success} Performans metrikleri sıfırlandı.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
