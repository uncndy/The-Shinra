// logs/guildMemberRemove.js
const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      if (!member.guild) return;

      const logChannel = member.guild.channels.cache.get(config.logChannels.memberLeave);
      if (!logChannel) return;

      // Audit log ile kontrol edelim, kick/ban ise moderator bilgisi çekilebilir
      let executor = null;
      try {
        const fetchedLogs = await member.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberKick, // Kick edilmişse
        });
        const kickLog = fetchedLogs.entries.first();
        if (kickLog && kickLog.target.id === member.id) {
          executor = kickLog.executor;
        }
      } catch {}

      const embed = new EmbedBuilder()
        .setDescription(`${config.emojis.leave} **${member.user.tag}** (\`${member.id}\`) sunucudan ayrıldı.`)
        .addFields(
          { name: `${config.emojis.member} Kullanıcı`, value: `${member.name} (\`${member.id}\`)`, inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: member.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for guild member remove errors
    }
  },
};
