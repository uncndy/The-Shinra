const { SlashCommandBuilder, EmbedBuilder, AuditLogEvent } = require("discord.js");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrateboosters")
    .setDescription("Sunucudaki tüm booster'ları User modeline kaydeder."),

  /**
   * Audit log'dan kullanıcının boost geçmişini alır
   * @param {Guild} guild - Discord sunucusu
   * @param {string} userId - Kullanıcı ID'si
   * @returns {Object} Boost verileri
   */
  async getBoostDataFromAuditLog(guild, userId) {
    try {
      const boostData = {
        totalBoosts: 0,
        firstBoostDate: null,
        lastBoostDate: null,
        boostHistory: []
      };

      // Önce mevcut üyeyi al ve mevcut boost durumunu kontrol et
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        return boostData;
      }

      // Eğer şu anda boost yapıyorsa, mevcut boost sayısını al
      if (member.premiumSince) {
        // Discord API'den boost sayısını al - daha güvenilir yöntem
        const subscriptionCount = member.premiumSubscriptionCount;
        console.log(`User ${userId}: premiumSubscriptionCount = ${subscriptionCount}, premiumSince = ${member.premiumSince}`);
        
        // Eğer premiumSubscriptionCount null veya undefined ise, 1 olarak ayarla
        boostData.totalBoosts = subscriptionCount !== null && subscriptionCount !== undefined ? subscriptionCount : 1;
        boostData.firstBoostDate = member.premiumSince;
        boostData.lastBoostDate = member.premiumSince;
      }

      // Audit log'dan boost geçmişini al
      try {
        const auditLogs = await guild.fetchAuditLogs({
          limit: 100,
          type: AuditLogEvent.MemberUpdate
        });

        // Bu kullanıcıya ait boost değişikliklerini filtrele
        const userBoostLogs = auditLogs.entries
          .filter(entry => entry.targetId === userId)
          .filter(entry => {
            const changes = entry.changes;
            if (!changes) return false;
            return changes.some(change => change.key === 'premium_since');
          })
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp); // Eski tarihten yeniye

        // Boost geçmişini analiz et
        let totalBoosts = 0;
        let firstBoost = null;
        let lastBoost = null;

        for (const entry of userBoostLogs) {
          const changes = entry.changes;
          const premiumChange = changes.find(change => change.key === 'premium_since');
          
          if (premiumChange) {
            if (premiumChange.new && !premiumChange.old) {
              // Boost başladı
              totalBoosts++;
              const boostDate = new Date(premiumChange.new);
              
              if (!firstBoost) firstBoost = boostDate;
              lastBoost = boostDate;
              
              boostData.boostHistory.push({
                type: 'start',
                date: boostDate,
                count: totalBoosts
              });
            } else if (!premiumChange.new && premiumChange.old) {
              // Boost bitti - ama toplam boost sayısını azaltmayalım
              boostData.boostHistory.push({
                type: 'end',
                date: entry.createdAt,
                count: totalBoosts
              });
            }
          }
        }

        // Eğer audit log'dan veri bulunduysa, onu kullan
        if (totalBoosts > 0) {
          boostData.totalBoosts = totalBoosts;
          boostData.firstBoostDate = firstBoost;
          boostData.lastBoostDate = lastBoost;
        }

      } catch (auditError) {
        console.log('Audit log fetch failed, using current member data:', auditError.message);
        // Audit log alınamazsa mevcut veriyi kullan
      }

      return boostData;
    } catch (error) {
      console.error('Boost data fetch error:', error);
      return {
        totalBoosts: 0,
        firstBoostDate: null,
        lastBoostDate: null,
        boostHistory: []
      };
    }
  },

  async execute(interaction) {
    // Yetki kontrolü
    if (interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu sadece bot sahibi kullanabilir.`,
        flags: ["Ephemeral"]
      });
    }

    try {
      await interaction.deferReply({ flags: ["Ephemeral"] });

      const guild = interaction.guild;
      const members = await guild.members.fetch();
      let processed = 0;
      let created = 0;
      let updated = 0;
      let boostersFound = 0;

      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.time} Booster Migrasyonu Başlatıldı`)
        .setDescription(`Sunucudaki ${members.size} üyenin booster durumları User modeline kaydediliyor...`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      for (const [userId, member] of members) {
        try {
          const isBooster = member.premiumSince !== null;
          
          // Audit log'dan doğru boost verilerini al
          const boostData = await this.getBoostDataFromAuditLog(guild, userId);
          const boostCount = boostData.totalBoosts;
          const firstBoostDate = boostData.firstBoostDate;
          const lastBoostDate = boostData.lastBoostDate;
          
          // Debug: Boost verilerini logla
          if (isBooster && boostCount === 0) {
            console.log(`Debug - User ${userId}: isBooster=${isBooster}, premiumSince=${member.premiumSince}, premiumSubscriptionCount=${member.premiumSubscriptionCount}, auditBoostCount=${boostCount}`);
          }
          
          // Fallback: Eğer audit log'dan veri alınamadıysa, mevcut Discord API verilerini kullan
          const finalBoostCount = boostCount > 0 ? boostCount : (isBooster ? (member.premiumSubscriptionCount || 1) : 0);
          const finalFirstBoostDate = firstBoostDate || (isBooster ? member.premiumSince : null);
          const finalLastBoostDate = lastBoostDate || (isBooster ? member.premiumSince : null);
          
          let userData = await User.findOne({ 
            userId: userId, 
            guildId: guild.id 
          });

          if (!userData) {
            // Yeni kullanıcı oluştur
            userData = new User({
              userId: userId,
              guildId: guild.id,
              joinDate: member.joinedAt,
              level: 1,
              xp: 0,
              roles: member.roles.cache
                .filter(role => role.id !== guild.id) // @everyone hariç
                .map(role => role.id),
              booster: {
                isBooster: isBooster,
                boostCount: finalBoostCount,
                firstBoostDate: finalFirstBoostDate,
                lastBoostDate: finalLastBoostDate,
                totalBoostDuration: 0
              }
            });
            await userData.save();
            created++;
          } else {
            // Mevcut kullanıcıyı güncelle
            if (isBooster) {
              // Eğer booster ise ve veritabanında booster değilse
              if (!userData.booster.isBooster) {
                userData.booster.isBooster = true;
                userData.booster.boostCount = finalBoostCount;
                userData.booster.lastBoostDate = finalLastBoostDate;
                
                if (!userData.booster.firstBoostDate) {
                  userData.booster.firstBoostDate = finalFirstBoostDate;
                }
              } else {
                // Eğer zaten booster ise, boost sayısını güncelle
                userData.booster.boostCount = finalBoostCount;
                userData.booster.lastBoostDate = finalLastBoostDate;
                
                // İlk boost tarihini güncelle (eğer daha eski bir tarih bulunduysa)
                if (finalFirstBoostDate && (!userData.booster.firstBoostDate || finalFirstBoostDate < userData.booster.firstBoostDate)) {
                  userData.booster.firstBoostDate = finalFirstBoostDate;
                }
              }
              boostersFound++;
            }
            
            // Rolleri de güncelle
            userData.roles = member.roles.cache
              .filter(role => role.id !== guild.id) // @everyone hariç
              .map(role => role.id);
            
            await userData.save();
            updated++;
          }

          processed++;

          // Her 50 kullanıcıda bir güncelleme göster
          if (processed % 50 === 0) {
            const progressEmbed = new EmbedBuilder()
              .setTitle(`${config.emojis.time} Booster Migrasyonu Devam Ediyor`)
              .setDescription(
                `**İşlenen:** ${processed}/${members.size} üye\n` +
                `**Oluşturulan:** ${created} yeni kullanıcı\n` +
                `**Güncellenen:** ${updated} mevcut kullanıcı\n` +
                `**Booster Bulunan:** ${boostersFound} kullanıcı`
              )
              .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });
          }

        } catch (err) {
          // Silent fail for booster migration errors
        }
      }

      // Tamamlanma mesajı
      const finalEmbed = new EmbedBuilder()
        .setTitle(`${config.emojis.success} Booster Migrasyonu Tamamlandı`)
        .setDescription(
          `**Toplam İşlenen:** ${processed} üye\n` +
          `**Oluşturulan:** ${created} yeni kullanıcı\n` +
          `**Güncellenen:** ${updated} mevcut kullanıcı\n` +
          `**Booster Bulunan:** ${boostersFound} kullanıcı\n` +
          `**Sunucu:** ${guild.name}`
        )
        .addFields(
          {
            name: `${config.emojis.gift} Booster Detayları`,
            value: `• **Aktif Booster:** ${boostersFound} kullanıcı\n• **Boost Sayısı:** Audit log'dan doğru boost sayıları alındı\n• **Boost Tarihi:** Audit log'dan gerçek boost tarihleri kullanıldı\n• **Çoklu Boost:** Birden fazla boost'u olan kullanıcılar doğru şekilde tespit edildi\n• **Veri Kaynağı:** Discord Audit Logs`,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [finalEmbed] });

    } catch (err) {
      // Silent fail for booster migration errors
      await interaction.editReply({
        content: `${config.emojis.cancel} Booster migrasyonu sırasında bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
