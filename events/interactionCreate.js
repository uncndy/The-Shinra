const cooldowns = new Map();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");

// Help embed fonksiyonları
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

// Moderasyon buton handler fonksiyonları
async function handleModConfirm(interaction, client) {
  // Moderasyon onay butonu
  await interaction.editReply({
    content: `${config.emojis.success} Moderasyon işlemi onaylandı.`,
    components: []
  });
}

async function handleModCancel(interaction, client) {
  // Moderasyon iptal butonu
  await interaction.editReply({
    content: `${config.emojis.cancel} Moderasyon işlemi iptal edildi.`,
    components: []
  });
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // Buton etkileşimi kontrolü
    if (interaction.isButton()) {
      // Help komutları butonları
      if (interaction.customId.startsWith('help_')) {
        try {
          // Sadece butonu oluşturan kişi basabilir
          const originalUserId = interaction.customId.split('_')[2];
          if (interaction.user.id !== originalUserId) {
            return await interaction.reply({
              content: `${config.emojis.cancel} Bu butonları sadece komutu kullanan kişi kullanabilir.`,
              flags: ["Ephemeral"]
            });
          }
          
          await interaction.deferUpdate();
          
          const kategori = interaction.customId.split('_')[1];
          let embed;
          
          switch (kategori) {
            case 'genel':
              embed = createGenelEmbed(client);
              break;
            case 'moderasyon':
              embed = createModerasyonEmbed(client);
              break;
            case 'cekilis':
              embed = createCekilisEmbed(client);
              break;
            case 'antiraid':
              embed = createAntiRaidEmbed(client);
              break;
            case 'backup':
              embed = createBackupEmbed(client);
              break;
            default:
              embed = createGenelEmbed(client);
          }
          
          await interaction.editReply({ embeds: [embed] });
        } catch (error) {
          try {
            if (interaction.deferred) {
              await interaction.editReply({
                content: `${config.emojis.cancel} Help menüsü yüklenirken hata oluştu.`
              });
            }
          } catch (replyError) {
            // Silent fail for reply errors
          }
        }
        return;
      }
      
      // Moderasyon komutları butonları (30 saniye süreli)
      if (interaction.customId.startsWith('mod_')) {
        try {
          await interaction.deferUpdate();
          
          // Moderasyon buton işlemleri
          const modType = interaction.customId.split('_')[1];
          
          switch (modType) {
            case 'confirm':
              await handleModConfirm(interaction, client);
              break;
            case 'cancel':
              await handleModCancel(interaction, client);
              break;
            default:
              await interaction.editReply({
                content: `${config.emojis.cancel} Bilinmeyen moderasyon butonu.`,
                components: []
              });
          }
        } catch (error) {
          try {
            if (interaction.deferred) {
              await interaction.editReply({
                content: `${config.emojis.cancel} Moderasyon işlemi sırasında hata oluştu.`
              });
            }
          } catch (replyError) {
            // Silent fail for reply errors
          }
        }
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // COOLDOWN KONTROLÜ
    if (command.cooldown) {
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = command.cooldown;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
          const kalan = expirationTime - now;
          const saat = Math.floor(kalan / 3600000);
          const dakika = Math.floor((kalan % 3600000) / 60000);
          try {
            return await interaction.reply({
              content: `⏳ Bu komutu tekrar kullanabilmek için **${saat} saat ${dakika} dakika** beklemelisin.`,
              flags: ["Ephemeral"]
            });
          } catch (replyError) {
            // Silent fail for cooldown reply errors
            return;
          }
        }
      }
      timestamps.set(interaction.user.id, now);
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
        } else {
          await interaction.reply({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
        }
      } catch (replyError) {
        // Silent fail for reply errors
        console.error('Interaction reply error:', replyError.message);
      }
    }
  }
};