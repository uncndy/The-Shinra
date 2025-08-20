const config = require('../config');

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    const channel = member.guild.channels.cache.get(config.channels.generalChat);
    if (!channel) return;
    const { EmbedBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
      .setDescription(`<a:kannaohwelcome:1406951788774559744> Hoş geldin ${member}! The Shinra’ya katıldın ve artık topluluğumuzun bir parçasısın! Anime, manga, oyun ve sohbet dolu bu evrende keyifli vakit geçir, etkinliklere katıl ve yeni arkadaşlıklar kur! ✨🚀`)
      .setColor(0x00FFCC);
    channel.send({ content: `<@${member.id}>`, embeds: [embed] });
  }
};
