const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrateboosters")
    .setDescription("Sunucudaki tüm booster'ları User modeline kaydeder."),

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
                boostCount: isBooster ? 1 : 0,
                firstBoostDate: isBooster ? member.premiumSince : null,
                lastBoostDate: isBooster ? member.premiumSince : null,
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
                userData.booster.boostCount = 1;
                userData.booster.lastBoostDate = member.premiumSince;
                
                if (!userData.booster.firstBoostDate) {
                  userData.booster.firstBoostDate = member.premiumSince;
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
            value: `• **Aktif Booster:** ${boostersFound} kullanıcı\n• **Boost Sayısı:** Her booster için 1 olarak ayarlandı\n• **Boost Tarihi:** Mevcut boost tarihi kullanıldı`,
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
