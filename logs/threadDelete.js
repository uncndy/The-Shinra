const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.ThreadDelete,
  async execute(thread) {
    try {
      if (!thread.guild) return;

      const logChannel = thread.guild.channels.cache.get(config.logChannels.deletedThread);
      if (!logChannel) return;

      // Audit Log'dan thread silme olayını al
      const fetchedLogs = await thread.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ThreadDelete,
      });

      const deletionLog = fetchedLogs.entries.first();
      const executor = deletionLog ? deletionLog.executor : null;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: executor ? executor.tag : "Bilinmiyor",
          iconURL: executor ? executor.displayAvatarURL() : null,
        })
        .setDescription(
          `🗑️ ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${thread.name}** (\`${thread.id}\`) alt başlığı silindi.`
        )
        .addFields(
          { name: `Kanal`, value: `<#${thread.parentId}>`, inline: true },
          { name: `Alt Başlık`, value: `${thread.name} (\`${thread.id}\`)`, inline: true },
          { name: `Sorumlu Moderator`, value: `<@${executor ? executor.id : "Bilinmiyor"}>`, inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: thread.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("threadDelete eventinde hata:", err);
    }
  },
};
