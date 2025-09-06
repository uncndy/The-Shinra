const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/User.js");
const config = require("../../config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seviye")
    .setDescription("Seviyeni ve XP'ni gösterir")
    .addUserOption(option => option
      .setName("kullanıcı")
      .setDescription("Levelini görmek istediğin kullanıcı")
      .setRequired(false)
    ),
  
  async execute(interaction) {
  try {
    // Seçilen kullanıcıyı al, yoksa kendi user’ı kullan
    const targetUser = interaction.options.getUser("kullanıcı") || interaction.user;

    let userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
    if (!userData) {
      userData = new User({ userId: targetUser.id, guildId: interaction.guild.id });
      await userData.save();
    }

    const nextLevel = userData.level > 0 ? Math.floor(100 * Math.pow(userData.level, 0.5)) : 100;

    const totalBars = 10;
    const progressBars = Math.floor((userData.xp / nextLevel) * totalBars);
    const emptyBars = totalBars - progressBars;

    const emojis = {
      startFilled: "<:5988lbg:1408427367868792972>",
      startEmpty: "<:5499lb2g:1408427365721440256>",
      middleFilled: "<:3451lg:1408427363854979202>",
      middleEmpty: "<:2827l2g:1408427357588557995>",
      endFilled: "<:3166lb4g:1408427361585594388>",
      endEmpty: "<:2881lb3g:1408427359522127922>",
    };
    const percentage = Math.floor((userData.xp / nextLevel) * 100);

    let bar = "";
    bar += progressBars > 0 ? emojis.startFilled : emojis.startEmpty;
    if (totalBars > 2) {
      const middleFilled = Math.max(progressBars - 2, 0);
      const middleEmpty = Math.max(emptyBars - 1, 0);
      bar += emojis.middleFilled.repeat(middleFilled);
      bar += emojis.middleEmpty.repeat(middleEmpty);
    }
    if (totalBars > 1) {
      bar += progressBars === totalBars ? emojis.endFilled : emojis.endEmpty;
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: targetUser.username,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setDescription(`${targetUser.username} (\`${userData.userId}\`) kullanıcısının seviye bilgileri:`)
      .addFields(
        { name: `${config.emojis.target} İlerleme durumu`, value: `${bar} \`${percentage}%\``, inline: false },
        { name: `${config.emojis.xp} Toplam XP`, value: `\`${userData.xp}\``, inline: true },
        { name: `${config.emojis.xp} Gerekli XP`, value: `\`${nextLevel}\``, inline: true },
        { name: `${config.emojis.level} Seviye`, value: `\`${userData.level}\``, inline: true }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({
        text: "The Shinra | Ateşin Efsanesi",
        iconURL: interaction.guild.iconURL(),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    // Silent fail for database errors
    await interaction.reply(`${config.emojis.cancel} Bir hata oluştu, lütfen daha sonra tekrar deneyin.`);
  }
  }
};
