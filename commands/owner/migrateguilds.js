const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Guild = require("../../models/Guild");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("migrateguils")
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
          
          let guildData = await Guild.findOne({
            guildId: guild.id 
          });

          if (!guildData) {
            // Yeni kullanıcı oluştur
            guildData = new Guild({
              guildId: guild.id,
              ownerId: interaction.guild.ownerId,
              lang: interaction.guild.preferredLocale
            });
            await guildData.save();
            created++;
          }
        } catch (err) {
          console.log(err);
        }
      }


      await interaction.editReply({ content: 'migration finish' });

    } catch (err) {
      console.log(err);
      await interaction.editReply({
        content: `${config.emojis.cancel} Rol migrasyonu sırasında bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
