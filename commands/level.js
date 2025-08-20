const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Level = require("../models/Level.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Seviyeni ve XP'ni gösterir"),
  
  async execute(interaction) {
    try {
      const userData = await Level.findOne({ userId: interaction.user.id }) || 
                      new Level({ userId: interaction.user.id });

      const nextLevel = userData.level > 0 ? Math.floor(100 * Math.pow(userData.level, 0.5)) : 100;
      const totalBars = 10;
      const progressBars = Math.floor((userData.xp / nextLevel) * totalBars);
      const emptyBars = totalBars - progressBars;

      const emojis = {
        startFilled: "<:5988lbg:1406979069555380264>",
        startEmpty: "<:5499lb2g:1406979067038924890>",
        middleFilled: "<:3451lg:1406979064765612144>",
        middleEmpty: "<:2827l2g:1406979058947985448>",
        endFilled: "<:3166lb4g:1406979062077067376>",
        endEmpty: "<:2881lb3g:1406979060533297233>"
      };
      const percentage = Math.floor((userData.xp / nextLevel) * 100);

      let bar = "";
      bar += progressBars > 0 ? emojis.startFilled : emojis.startEmpty;
      if (totalBars > 2) {
        const middleFilled = Math.max(progressBars - 2, 0);
        const middleEmpty = Math.max(emptyBars - 1, 0); // <-- Düzeltildi!
        bar += emojis.middleFilled.repeat(middleFilled);
        bar += emojis.middleEmpty.repeat(middleEmpty);
      }
      if (totalBars > 1) {
        bar += progressBars === totalBars ? emojis.endFilled : emojis.endEmpty;
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setColor(0x00FF00)
        .setDescription(`${bar}\n**İlerleme:** \`${percentage}%\``) // Yüzde eklendi
        .addFields(
          { name: "Toplam XP", value: `\`${userData.xp}\``, inline: true },
          { name: "Gerekli XP", value: `\`${nextLevel}\``, inline: true },
          { name: "Seviye", value: `\`${userData.level}\``, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();
        

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Veritabanı hatası:", err);
      await interaction.reply("Bir hata oluştu, lütfen daha sonra tekrar deneyin.");
    }
  }
};
