const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const Sanction = require('../models/Sanction');
const User = require('../models/User');

class AntiRaidSystem {
  constructor() {
    this.joinTimes = new Map(); // userId -> timestamp
    this.raidDetected = false;
    this.raidStartTime = null;
    this.raidMembers = [];
    this.raidThreshold = 10; // 1 kişi
    this.raidWindow = 60000; // 1 dakika (60 saniye)
  }

  async checkRaid(member) {
    const now = Date.now();
    const userId = member.id;
    const guildId = member.guild.id;

    // Kullanıcının katılım zamanını kaydet
    this.joinTimes.set(userId, now);

    // Son 1 dakikadaki katılımları say
    const recentJoins = Array.from(this.joinTimes.entries())
      .filter(([id, timestamp]) => now - timestamp <= this.raidWindow)
      .map(([id, timestamp]) => ({ id, timestamp }));

    // Eğer 10 veya daha fazla kişi katıldıysa
    if (recentJoins.length >= this.raidThreshold && !this.raidDetected) {
      this.raidDetected = true;
      this.raidStartTime = now;
      this.raidMembers = recentJoins.map(join => join.id);

      // Anti-raid önlemlerini başlat
      await this.activateAntiRaid(member.guild, recentJoins.length);
    }

    // Eski kayıtları temizle (1 dakikadan eski)
    this.cleanupOldJoins(now);
  }

  async activateAntiRaid(guild, joinCount) {
    try {
      // 1. Şüpheli hesapları tespit et ve sadece onları banla
      const suspiciousMembers = await this.identifySuspiciousMembers(guild);
      
      const banPromises = suspiciousMembers.map(async (member) => {
        try {
          if (member && member.bannable) {
            const reason = 'Anti-raid: Şüpheli hesap tespit edildi';
            
            // Discord'da ban at
            await member.ban({ 
            reason: reason,
            deleteMessageSeconds: 0 
            });

            // Sanction ID oluştur
            const lastSanction = await Sanction.findOne({ guildId: member.guild.id }).sort({ sanctionId: -1 });
            const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

            // MongoDB'ye kaydet
            const newBan = new Sanction({
              sanctionId: sanctionId,
              type: "Ban",
              guildId: member.guild.id,
              userId: member.user.id,
              moderatorId: "Anti-Raid System", // Bot sistemi
              reason: reason,
              active: true
            });
            await newBan.save();

            // User modelini güncelle
            let userData = await User.findOne({ userId: member.user.id, guildId: member.guild.id });
            if (!userData) {
              userData = new User({ 
                userId: member.user.id, 
                guildId: member.guild.id,
                level: 1,
                xp: 0,
                roles: []
              });
            }
            userData.currentBan = {
              sanctionId: sanctionId,
              isBanned: true
            };
            await userData.save();

            // Ban log embed'i oluştur
            await this.sendBanLog(member, sanctionId, reason);

          }
        } catch (error) {
        }
      });

      await Promise.all(banPromises);

      // 2. Log kanalına bildirim gönder
      await this.sendRaidAlert(guild, joinCount, suspiciousMembers.length);

      // 3. Sunucu ayarlarını güncelle (opsiyonel)
      await this.updateServerSettings(guild);

    } catch (error) {
    }
  }

  async sendRaidAlert(guild, joinCount, bannedCount) {
    try {
      const logChannel = guild.channels.cache.get(config.logChannels.antiRaidLog);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setTitle(`🚨 ANTI-RAID AKTİF!`)
        .setDescription(`**${joinCount} kişi** son 1 dakikada sunucuya katıldı!\n**Anti-raid sistemi** otomatik olarak devreye girdi.`)
        .addFields(
          { 
            name: `${config.emojis.warning} Tespit Edilen Raid`, 
            value: `**Katılım Sayısı:** ${joinCount}\n**Zaman Dilimi:** 1 dakika\n**Durum:** Otomatik ban uygulandı`, 
            inline: true 
          },
          { 
            name: `${config.emojis.stats} İstatistikler`, 
            value: `**Toplam Katılım:** ${joinCount} kişi\n**Şüpheli Tespit:** ${bannedCount} kişi\n**Banlanan:** ${bannedCount} kişi\n**Korunan:** ${guild.memberCount} üye`, 
            inline: true 
          }
        )
        .setColor(0xFF0000) // Kırmızı
        .setFooter({ text: "The Shinra | Anti-Raid Sistemi", iconURL: guild.iconURL() })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });

    } catch (error) {
    }
  }

  async updateServerSettings(guild) {
    try {
      // Sunucu ayarlarını güncelle (örnek: verification level artır)
      if (guild.verificationLevel < 2) {
        await guild.setVerificationLevel(2, 'Anti-raid: Güvenlik seviyesi artırıldı');
      }

      // Invite'ları geçici olarak kapat (opsiyonel)
      // await guild.setInvitesDisabled(true, 'Anti-raid: Geçici güvenlik önlemi');

    } catch (error) {
    }
  }

  cleanupOldJoins(now) {
    // 1 dakikadan eski kayıtları temizle
    for (const [userId, timestamp] of this.joinTimes.entries()) {
      if (now - timestamp > this.raidWindow) {
        this.joinTimes.delete(userId);
      }
    }
  }

  // Raid durumunu sıfırla (manuel olarak)
  resetRaidStatus() {
    this.raidDetected = false;
    this.raidStartTime = null;
    this.raidMembers = [];
  }

  // Şüpheli hesapları tespit et
  async identifySuspiciousMembers(guild) {
    const suspiciousMembers = [];
    
    for (const userId of this.raidMembers) {
      try {
        const member = guild.members.cache.get(userId);
        if (!member) continue;

        const user = member.user;
        const accountAge = Date.now() - user.createdTimestamp;
        const isSuspicious = this.isAccountSuspicious(user, accountAge);
        
        if (isSuspicious) {
          suspiciousMembers.push(member);
        }
      } catch (error) {
      }
    }
    
    return suspiciousMembers;
  }

  // Hesabın şüpheli olup olmadığını kontrol et
  isAccountSuspicious(user, accountAge) {
    // 1. Hesap yaşı 7 günden az
    if (accountAge < 7 * 24 * 60 * 60 * 1000) {
      return true;
    }

    // 2. Varsayılan avatar (Discord'un verdiği avatar)
    if (user.avatar === null) {
      return true;
    }

    // 3. Şüpheli isim formatı (sadece sayılar, çok kısa isimler)
    const username = user.username.toLowerCase();
    if (username.length < 3 || /^\d+$/.test(username)) {
      return true;
    }

    // 4. Çok yeni hesap (1 günden az)
    if (accountAge < 24 * 60 * 60 * 1000) {
      return true;
    }

    return false;
  }

  // Ban log embed'i gönder
  async sendBanLog(member, sanctionId, reason) {
    try {
      const logChannel = member.guild.channels.cache.get(config.logChannels.banLog);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
        .setThumbnail(member.user.displayAvatarURL())
        .setDescription(`${member.user.tag} (\`${member.user.id}\`) kullanıcısı sunucudan banlandı.`)
        .addFields(
          { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `Anti-Raid Sistemi`, inline: true },
          { name: `${config.emojis.warning} Ban ID`, value: `\`#${sanctionId}\``, inline: true },
          { name: `${config.emojis.info} Sebep`, value: reason, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: member.guild.iconURL() })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });

    } catch (error) {
    }
  }

  // Raid durumunu kontrol et
  getRaidStatus() {
    return {
      detected: this.raidDetected,
      startTime: this.raidStartTime,
      memberCount: this.raidMembers.length,
      recentJoins: this.joinTimes.size
    };
  }
}

module.exports = AntiRaidSystem;
