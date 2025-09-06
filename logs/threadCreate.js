const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.ThreadCreate,
  async execute(thread) {
    try {
      if (!thread.guild) return;

      const logChannel = thread.guild.channels.cache.get(config.logChannels.createdThread);

      // Audit Log'dan kim açtı bilgisini çekiyoruz
      const fetchedLogs = await thread.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ThreadCreate,
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
          `${config.emojis.create} ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${thread.name}** (\`${thread.id}\`) alt başlığı oluşturuldu.`
        )
        .addFields(
          { name: `${config.emojis.channel} Kanal`, value: `<#${thread.parentId}>`, inline: true },
          { name: `${config.emojis.channel} Alt Başlık`, value: `${thread.name}`, inline: true },
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: thread.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for thread create errors
    }
  },
};
