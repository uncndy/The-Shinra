const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrateroles")
    .setDescription("Sunucudaki tüm üyelerin rollerini User modeline kaydeder."),

  async execute(interaction) {
    // Yetki kontrolü
    if (interaction.user.id !== config.owners.sphinx) { // Bot sahibinin ID'si
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

      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.time} Rol Migrasyonu Başlatıldı`)
        .setDescription(`Sunucudaki ${members.size} üyenin rolleri User modeline kaydediliyor...`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      for (const [userId, member] of members) {
        try {
          const userRoles = member.roles.cache.map(role => role.id);
          
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
              roles: userRoles
            });
            await userData.save();
            created++;
          } else {
            // Mevcut kullanıcıyı güncelle
            userData.roles = userRoles;
            await userData.save();
            updated++;
          }

          processed++;

          // Her 50 kullanıcıda bir güncelleme göster
          if (processed % 50 === 0) {
            const progressEmbed = new EmbedBuilder()
              .setTitle(`${config.emojis.time} Rol Migrasyonu Devam Ediyor`)
              .setDescription(`İşlenen: ${processed}/${members.size} üye\nOluşturulan: ${created}\nGüncellenen: ${updated}`)
              .setTimestamp();

            await interaction.editReply({ embeds: [progressEmbed] });
          }

        } catch (err) {
          // Silent fail for role migration errors
        }
      }

      // Tamamlanma mesajı
      const finalEmbed = new EmbedBuilder()
        .setTitle(`${config.emojis.success} Rol Migrasyonu Tamamlandı`)
        .setDescription(
          `**Toplam İşlenen:** ${processed} üye\n` +
          `**Oluşturulan:** ${created} yeni kullanıcı\n` +
          `**Güncellenen:** ${updated} mevcut kullanıcı\n` +
          `**Sunucu:** ${guild.name}`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [finalEmbed] });

    } catch (err) {
      // Silent fail for role migration errors
      await interaction.editReply({
        content: `${config.emojis.cancel} Rol migrasyonu sırasında bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
