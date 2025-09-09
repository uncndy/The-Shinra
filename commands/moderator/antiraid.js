const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antiraid")
    .setDescription("Anti-raid sistemi yönetimi")
    .addSubcommand(subcommand =>
      subcommand
        .setName("durum")
        .setDescription("Anti-raid sistem durumunu gösterir")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("sifirla")
        .setDescription("Anti-raid durumunu sıfırlar")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("ayarlar")
        .setDescription("Anti-raid ayarlarını gösterir")
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(config.roles.moderator) && interaction.user.id !== config.owners.sphinx) {
        return await interaction.reply({
          content: `${config.emojis.cancel} Bu komutu kullanmak için Moderator rolüne sahip olmalısınız.`,
          flags: ["Ephemeral"]
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "durum") {
        await handleStatus(interaction);
      } else if (subcommand === "sifirla") {
        await handleReset(interaction);
      } else if (subcommand === "ayarlar") {
        await handleSettings(interaction);
      }

    } catch (err) {
      await interaction.reply({
        content: `${config.emojis.cancel} Anti-raid işlemi sırasında bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};

async function handleStatus(interaction) {
  const antiRaid = interaction.client.antiRaid;
  
  if (!antiRaid) {
    return await interaction.reply({
      content: `${config.emojis.cancel} Anti-raid sistemi başlatılmamış.`,
      flags: ["Ephemeral"]
    });
  }

  const status = antiRaid.getRaidStatus();
  
  const embed = new EmbedBuilder()
    .setTitle(`${config.emojis.warning} Anti-Raid Sistemi Durumu`)
    .setDescription("Sunucu güvenlik durumu ve istatistikler")
    .addFields(
      { 
        name: `${config.emojis.stats} Sistem Durumu`, 
        value: status.detected ? "🚨 **RAID TESPİT EDİLDİ**" : "✅ **GÜVENLİ**", 
        inline: true 
      },
      { 
        name: `${config.emojis.member} Son 1 Dakika`, 
        value: `${status.recentJoins} kişi katıldı`, 
        inline: true 
      },
      { 
        name: `${config.emojis.time} Raid Başlangıcı`, 
        value: status.startTime ? `<t:${Math.floor(status.startTime / 1000)}:R>` : "Yok", 
        inline: true 
      },
      { 
        name: `${config.emojis.info} Raid Üyeleri`, 
        value: status.memberCount > 0 ? `${status.memberCount} kişi` : "Yok", 
        inline: true 
      }
    )
    .setColor(status.detected ? 0xFF0000 : 0x00FF00)
    .setFooter({ text: "The Shinra | Anti-Raid Sistemi", iconURL: interaction.guild.iconURL() })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleReset(interaction) {
  const antiRaid = interaction.client.antiRaid;
  
  if (!antiRaid) {
    return await interaction.reply({
      content: `${config.emojis.cancel} Anti-raid sistemi başlatılmamış.`,
      flags: ["Ephemeral"]
    });
  }

  antiRaid.resetRaidStatus();

  const embed = new EmbedBuilder()
    .setTitle(`${config.emojis.success} Anti-Raid Sıfırlandı`)
    .setDescription("Anti-raid sistemi durumu başarıyla sıfırlandı.")
    .addFields(
      { 
        name: `${config.emojis.info} Yapılan İşlem`, 
        value: "• Raid durumu sıfırlandı\n• Üye listesi temizlendi\n• Sistem normal moda geçti", 
        inline: false 
      }
    )
    .setColor(0x00FF00)
    .setFooter({ text: "The Shinra | Anti-Raid Sistemi", iconURL: interaction.guild.iconURL() })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleSettings(interaction) {
  const antiRaid = interaction.client.antiRaid;
  
  if (!antiRaid) {
    return await interaction.reply({
      content: `${config.emojis.cancel} Anti-raid sistemi başlatılmamış.`,
      flags: ["Ephemeral"]
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`${config.emojis.info} Anti-Raid Ayarları`)
    .setDescription("Mevcut güvenlik ayarları ve eşik değerleri")
    .addFields(
      { 
        name: `${config.emojis.warning} Raid Eşiği`, 
        value: `${antiRaid.raidThreshold} kişi`, 
        inline: true 
      },
      { 
        name: `${config.emojis.time} Zaman Penceresi`, 
        value: `${antiRaid.raidWindow / 1000} saniye`, 
        inline: true 
      },
      { 
        name: `${config.emojis.stats} Aktif Kontroller`, 
        value: "• Otomatik ban\n• Log bildirimi\n• Sunucu ayarları güncelleme", 
        inline: false 
      },
      { 
        name: `${config.emojis.info} Nasıl Çalışır`, 
        value: `• ${antiRaid.raidThreshold} veya daha fazla kişi\n• ${antiRaid.raidWindow / 1000} saniye içinde katılırsa\n• Otomatik olarak raid tespit edilir\n• Tüm yeni katılanlar banlanır`, 
        inline: false 
      }
    )
    .setColor(0x0099FF)
    .setFooter({ text: "The Shinra | Anti-Raid Sistemi", iconURL: interaction.guild.iconURL() })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
