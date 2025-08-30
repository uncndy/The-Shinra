// logs/guildMemberAdd.js
const { EmbedBuilder, Events } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      if (!member.guild) return;

      const logChannel = member.guild.channels.cache.get(config.logChannels.memberJoin);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setDescription(`**${member.user.tag}** (\`${member.id}\`) sunucuya katıldı.`)
        .addFields(
          { name: "Kullanıcı", value: `${member}`, inline: true },
          { name: "Sorumlu Moderator", value: "Bilinmiyor", inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: member.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("guildMemberAdd eventinde hata:", err);
    }
  },
};
