const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Bot komutları ve kullanım bilgileri")
    .addStringOption(option =>
      option
        .setName("kategori")
        .setDescription("Görmek istediğin komut kategorisini seç")
        .setRequired(false)
        .addChoices(
          { name: "🏠 Genel Komutlar", value: "genel" },
          { name: "🛡️ Moderasyon Komutları", value: "moderasyon" },
          { name: "🎁 Çekiliş Komutları", value: "cekilis" },
          { name: "🛡️ Anti-Raid Sistemi", value: "antiraid" },
          { name: "💾 Backup Sistemi", value: "backup" },
          { name: "📊 İstatistikler", value: "istatistik" }
        )
    ),

  async execute(interaction, client) {
    const kategori = interaction.options.getString("kategori");

    if (!kategori) {
      // Ana help menüsü
      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.info} The Shinra Bot - Yardım Menüsü`)
        .setDescription(`Merhaba! Ben **The Shinra** botuyum. Aşağıdaki kategorilerden birini seçerek komutları görebilirsin.`)
        .addFields(
          {
            name: `${config.emojis.stats} Bot İstatistikleri`,
            value: `**Sunucular:** ${client.guilds.cache.size}\n**Kullanıcılar:** ${client.users.cache.size}\n**Ping:** ${client.ws.ping}ms`,
            inline: true
          },
          {
            name: `${config.emojis.info} Komut Kategorileri`,
            value: `🏠 **Genel Komutlar** - Temel bot komutları\n🛡️ **Moderasyon** - Sunucu yönetim komutları\n🎁 **Çekiliş** - Çekiliş yönetim sistemi\n🛡️ **Anti-Raid** - Raid koruma sistemi\n💾 **Backup** - Veritabanı yedekleme\n📊 **İstatistik** - Sunucu istatistikleri`,
            inline: false
          },
          {
            name: `${config.emojis.success} Hızlı Erişim`,
            value: `\`/help kategori:genel\` - Genel komutları göster\n\`/help kategori:moderasyon\` - Moderasyon komutlarını göster\n\`/help kategori:cekilis\` - Çekiliş komutlarını göster`,
            inline: false
          }
        )
        .setColor(0x0099FF)
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp()
        .setThumbnail(client.user.displayAvatarURL());

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`help_genel_${interaction.user.id}`)
            .setLabel('🏠 Genel')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`help_moderasyon_${interaction.user.id}`)
            .setLabel('🛡️ Moderasyon')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`help_cekilis_${interaction.user.id}`)
            .setLabel('🎁 Çekiliş')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`help_antiraid_${interaction.user.id}`)
            .setLabel('🛡️ Anti-Raid')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`help_backup_${interaction.user.id}`)
            .setLabel('💾 Backup')
            .setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // Kategoriye göre komutları göster
    let embed;
    
    switch (kategori) {
      case "genel":
        embed = createGenelEmbed(client);
        break;
      case "moderasyon":
        embed = createModerasyonEmbed(client);
        break;
      case "cekilis":
        embed = createCekilisEmbed(client);
        break;
      case "antiraid":
        embed = createAntiRaidEmbed(client);
        break;
      case "backup":
        embed = createBackupEmbed(client);
        break;
      case "istatistik":
        embed = createIstatistikEmbed(client);
        break;
      default:
        embed = createGenelEmbed(client);
    }

    await interaction.reply({ embeds: [embed] });
  }
};

// Genel komutlar embed'i
function createGenelEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.info} 🏠 Genel Komutlar`)
    .setDescription("Temel bot komutları ve genel kullanım bilgileri")
    .addFields(
      {
        name: `${config.emojis.ping} Temel Komutlar`,
        value: `\`/ping\` - Bot ping'ini gösterir\n\`/help\` - Bu yardım menüsünü gösterir\n\`/seviye\` - Seviye ve XP bilgilerini gösterir`,
        inline: false
      },
      {
        name: `${config.emojis.stats} İstatistik Komutları`,
        value: `\`/istatistikler\` - Kullanıcı istatistiklerini gösterir\n\`/claim\` - Günlük ödülünü al`,
        inline: false
      },
      {
        name: `${config.emojis.info} Kullanım Bilgileri`,
        value: `• Tüm komutlar slash (/) formatında kullanılır\n• Komutlar otomatik tamamlanır\n• Yetki gerektiren komutlar sadece moderatorler tarafından kullanılabilir\n• Bot 7/24 aktif ve güvenli`,
        inline: false
      }
    )
    .setColor(0x0099FF)
    .setFooter({ text: "The Shinra | Genel Komutlar", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// Moderasyon komutları embed'i
function createModerasyonEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.moderator} 🛡️ Moderasyon Komutları`)
    .setDescription("Sunucu yönetimi ve moderasyon komutları")
    .addFields(
      {
        name: `${config.emojis.warning} Kullanıcı Yönetimi`,
        value: `\`/yasak ekle\` - Kullanıcıyı banlar\n\`/yasak kaldir\` - Kullanıcının banını kaldırır\n\`/at\` - Kullanıcıyı sunucudan atar\n\`/sustur ekle\` - Kullanıcıyı susturur\n\`/sustur kaldir\` - Kullanıcının susturmasını kaldırır\n\`/uyari ekle\` - Kullanıcıya uyarı verir\n\`/uyari sil\` - Kullanıcının uyarısını siler\n\`/uyari listele\` - Kullanıcının uyarılarını listeler`,
        inline: false
      },
      {
        name: `${config.emojis.trash} Mesaj Yönetimi`,
        value: `\`/temizle\` - Belirtilen sayıda mesajı siler\n\`/sorgu\` - Kullanıcı sorgulama`,
        inline: false
      },
      {
        name: `${config.emojis.question} Soru-Cevap Sistemi`,
        value: `\`/soru ekle\` - Veritabanına soru ekler\n\`/soru sil\` - Veritabanından soru siler\n\`/soru listele\` - Veritabanındaki soruları listeler`,
        inline: false
      },
      {
        name: `${config.emojis.stats} Sistem Komutları`,
        value: `\`/health\` - Bot sağlık durumu\n\`/performance\` - Bot performans bilgileri\n\`/migrateroles\` - Rol migrasyonu\n\`/user\` - Kullanıcı bilgileri`,
        inline: false
      }
    )
    .setColor(0xFF0000)
    .setFooter({ text: "The Shinra | Moderasyon Komutları", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// Çekiliş komutları embed'i
function createCekilisEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.gift} 🎁 Çekiliş Komutları`)
    .setDescription("Çekiliş yönetim sistemi komutları")
    .addFields(
      {
        name: `${config.emojis.create} Çekiliş Yönetimi`,
        value: `\`/cekilis baslat\` - Yeni çekiliş başlatır\n\`/cekilis bitir\` - Aktif çekilişi bitirir\n\`/cekilis iptal\` - Çekilişi iptal eder`,
        inline: false
      },
      {
        name: `${config.emojis.info} Çekiliş Bilgileri`,
        value: `• Çekilişler otomatik olarak bitirilir\n• Bot yeniden başladığında çekilişler korunur\n• Katılım süresi dolduğunda otomatik kapanır\n• Çekiliş rolü otomatik etiketlenir`,
        inline: false
      }
    )
    .setColor(0x00FF00)
    .setFooter({ text: "The Shinra | Çekiliş Sistemi", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// Anti-raid komutları embed'i
function createAntiRaidEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.warning} 🛡️ Anti-Raid Sistemi`)
    .setDescription("Raid koruma ve güvenlik sistemi")
    .addFields(
      {
        name: `${config.emojis.stats} Anti-Raid Komutları`,
        value: `\`/antiraid durum\` - Anti-raid durumunu gösterir\n\`/antiraid sifirla\` - Raid durumunu sıfırlar\n\`/antiraid ayarlar\` - Anti-raid ayarlarını gösterir`,
        inline: false
      },
      {
        name: `${config.emojis.info} Nasıl Çalışır`,
        value: `• **Eşik:** 10 kişi\n• **Zaman:** 1 dakika içinde\n• **Aksiyon:** Şüpheli hesapları banlar\n• **Kriterler:** Hesap yaşı, avatar, kullanıcı adı\n• **Log:** Ban log kanalına bildirim gönderir`,
        inline: false
      }
    )
    .setColor(0xFFA500)
    .setFooter({ text: "The Shinra | Anti-Raid Sistemi", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// Backup komutları embed'i
function createBackupEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.success} 💾 Backup Sistemi`)
    .setDescription("Veritabanı yedekleme ve geri yükleme sistemi")
    .addFields(
      {
        name: `${config.emojis.create} Backup Komutları`,
        value: `\`/backup create\` - Manuel backup oluşturur\n\`/backup list\` - Mevcut backup'ları listeler\n\`/backup clean\` - Eski backup'ları temizler`,
        inline: false
      },
      {
        name: `${config.emojis.info} Otomatik Backup`,
        value: `• **Sıklık:** Her 24 saatte bir\n• **Format:** JSON dosyası\n• **Gönderim:** Backup log kanalına\n• **Temizlik:** Son 5 backup'ı tutar\n• **İçerik:** Tüm veritabanı koleksiyonları`,
        inline: false
      }
    )
    .setColor(0x800080)
    .setFooter({ text: "The Shinra | Backup Sistemi", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}

// İstatistik komutları embed'i
function createIstatistikEmbed(client) {
  return new EmbedBuilder()
    .setTitle(`${config.emojis.stats} 📊 İstatistik Komutları`)
    .setDescription("Sunucu ve bot istatistikleri")
    .addFields(
      {
        name: `${config.emojis.stats} İstatistik Komutları`,
        value: `\`/istatistikler\` - Detaylı sunucu istatistikleri\n\`/ping\` - Bot ping ve uptime bilgisi\n\`/health\` - Bot sağlık durumu\n\`/performance\` - Bot performans bilgileri`,
        inline: false
      },
      {
        name: `${config.emojis.info} İstatistik Bilgileri`,
        value: `• **Sunucu İstatistikleri:** Üye sayısı, kanal sayısı, rol sayısı\n• **Bot İstatistikleri:** Ping, uptime, sunucu sayısı\n• **Performans:** CPU, RAM, veritabanı durumu\n• **Sağlık:** Bot durumu ve sistem bilgileri`,
        inline: false
      },
      {
        name: `${config.emojis.success} Özellikler`,
        value: `• Gerçek zamanlı istatistikler\n• Detaylı sunucu analizi\n• Bot performans takibi\n• Sistem sağlık kontrolü`,
        inline: false
      }
    )
    .setColor(0x9932CC)
    .setFooter({ text: "The Shinra | İstatistik Sistemi", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();
}
