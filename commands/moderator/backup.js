const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const BackupManager = require("../../utils/backup");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Veritabanı yedekleme sistemi")
    .addSubcommand(subcommand =>
      subcommand
        .setName("create")
        .setDescription("Yeni bir veritabanı yedeği oluşturur")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("Mevcut yedekleri listeler")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("clean")
        .setDescription("Eski yedekleri temizler")
        .addIntegerOption(option =>
          option
            .setName("keep")
            .setDescription("Kaç tane yedek tutulacak")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
    ),

  async execute(interaction, client) {
    // Yetki kontrolü - Sadece bot sahibi
    if (interaction.user.id !== config.roles.ownerUserID) { // Bot sahibinin ID'si
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu sadece bot sahibi kullanabilir.`,
        flags: ["Ephemeral"]
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const backupManager = new BackupManager();

    await interaction.deferReply({ flags: ["Ephemeral"] });

    try {
      if (subcommand === "create") {
        const backupFile = await backupManager.createBackup();
        
        const embed = new EmbedBuilder()
        .setAuthor({ name: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setDescription(`${config.emojis.success} Veritabanı yedeği başarıyla oluşturuldu.`)
          .addFields({
            name: `${config.emojis.edit} Dosya`,
            value: `\`${backupFile.split('/').pop()}\``,
            inline: true
          })
          .setFooter({ text: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === "list") {
        const backups = await backupManager.listBackups();
        
        if (backups.length === 0) {
          return interaction.editReply({
            content: `${config.emojis.cancel} Hiç yedek dosyası bulunamadı.`,
            flags: ["Ephemeral"]
          });
        }

        const backupList = backups.slice(0, 10).map((backup, index) => {
          const date = new Date(backup.timestamp);
          const timestamp = isNaN(date.getTime()) ? Math.floor(Date.now() / 1000) : Math.floor(date.getTime() / 1000);
          return `**${index + 1}.** ${backup.name}\n<t:${timestamp}:F>`;
        }).join('\n');

        const embed = new EmbedBuilder()
          .setAuthor({ name: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setDescription(backupList)
          .addFields({
            name: `${config.emojis.stats} İstatistik`,
            value: `**Toplam Yedek:** \`${backups.length}\``,
            inline: true
          })
          .setFooter({ text: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === "clean") {
        const keepCount = interaction.options.getInteger("keep") || 5;
        
        const backupsBefore = await backupManager.listBackups();
        await backupManager.cleanOldBackups(keepCount);
        const backupsAfter = await backupManager.listBackups();
        
        const deletedCount = backupsBefore.length - backupsAfter.length;

        const embed = new EmbedBuilder()
          .setAuthor({ name: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setDescription(`${config.emojis.success} Eski yedek dosyaları temizlendi.`)
          .addFields(
            {
              name: `${config.emojis.stats} Önceki Durum`,
              value: `\`${backupsBefore.length}\` yedek`,
              inline: true
            },
            {
              name: `${config.emojis.stats} Sonraki Durum`,
              value: `\`${backupsAfter.length}\` yedek`,
              inline: true
            },
            {
              name: `${config.emojis.trash} Silinen`,
              value: `\`${deletedCount}\` yedek`,
              inline: true
            }
          )
          .setFooter({ text: "The Shinra | Backup System", iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      await interaction.editReply({
        content: `${config.emojis.cancel} Yedekleme işlemi sırasında hata oluştu: ${error.message}`,
        flags: ["Ephemeral"]
      });
    }
  }
};
