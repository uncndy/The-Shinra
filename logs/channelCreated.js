const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    try {
      if (!channel.guild) return;

      const logChannel = channel.guild.channels.cache.get(config.logChannels.createdChannel);
      // Audit Log'dan kanalı kim açtı bilgisini çekiyoruz
      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate,
      });

      const creationLog = fetchedLogs.entries.first();
      const executor = creationLog ? creationLog.executor : null;

      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${executor ? executor.tag : "Bilinmiyor"}`,
          iconURL: `${executor ? executor.displayAvatarURL() : ""}`,
        })
        .setDescription(
          `📢 ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${channel.name}** (\`${channel.id}\`) oluşturuldu.`
        )
        .addFields(
          { name: `Kanal`, value: `${channel}`, inline: true },
          { name: `Sorumlu Moderator`, value: `${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: channel.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("channelCreate eventinde hata:", err);
    }
  },
};
