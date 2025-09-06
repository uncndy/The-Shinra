const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const HealthCheck = require("../../utils/healthCheck");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("Bot sağlık durumunu gösterir"),

  async execute(interaction, client) {
    // Yetki kontrolü
    if (interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }

    const healthCheck = new HealthCheck(client);
    const status = healthCheck.getStatus();

    // Status emoji
    const statusEmojis = {
      healthy: `${config.emojis.success}`,
      degraded: `${config.emojis.warning}`, 
      unhealthy: `${config.emojis.cancel}`
    };

    const embed = new EmbedBuilder()
      .setTitle(`${statusEmojis[status.status]} Bot Sağlık Durumu`)
      .setDescription(`**Genel Durum:** ${status.status.toUpperCase()}`)
      .addFields(
        {
          name: `${config.emojis.server} Discord Bağlantısı`,
          value: `**Durum:** ${status.discord.status === 'connected' ? '✅ Bağlı' : '❌ Bağlı Değil'}\n**Ping:** \`${status.discord.ping}ms\`\n**Sunucular:** \`${status.discord.guilds}\`\n**Kullanıcılar:** \`${status.discord.users}\``,
          inline: true
        },
        {
          name: `${config.emojis.server} Veritabanı`,
          value: `**Durum:** ${status.database.status === 'connected' ? '✅ Bağlı' : '❌ Bağlı Değil'}\n**Ready State:** \`${status.database.readyState}\``,
          inline: true
        },
        {
          name: `${config.emojis.server} Bellek Kullanımı`,
          value: `**RSS:** \`${status.memory.rss}\`\n**Heap Total:** \`${status.memory.heapTotal}\`\n**Heap Used:** \`${status.memory.heapUsed}\`\n**External:** \`${status.memory.external}\``,
          inline: true
        },
        {
          name: `${config.emojis.server} Ortam`,
          value: `\`${status.environment}\``,
          inline: true
        },
        {
            name: `${config.emojis.time} Çalışma Süresi`,
            value: `\`${status.uptime.human}\``,
            inline: true
        },
        {
          name: `${config.emojis.time} Son Kontrol`,
          value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
          inline: true
        }
      )
      .setColor(status.status === 'healthy' ? 0x00FF00 : status.status === 'degraded' ? 0xFFFF00 : 0xFF0000)
      .setFooter({ text: "The Shinra | Health Monitor", iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: ["Ephemeral"] });
  }
};
