const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.ThreadUpdate,
  async execute(oldThread, newThread) {
    try {
      if (!newThread.guild) return;

      const logChannel = newThread.guild.channels.cache.get(config.logChannels.updatedThread);
      if (!logChannel) return;

      // Audit Log'dan kim güncelledi bilgisini çekiyoruz
      const fetchedLogs = await newThread.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ThreadUpdate,
      });
      const updateLog = fetchedLogs.entries.first();
      const executor = updateLog ? updateLog.executor : null;

      let changes = [];

      if (oldThread.name !== newThread.name) {
        changes.push(`**İsim:** \`${oldThread.name}\` ➝ \`${newThread.name}\``);
      }
      if (oldThread.archived !== newThread.archived) {
        changes.push(`**Arşiv:** \`${oldThread.archived}\` ➝ \`${newThread.archived}\``);
      }
      if (oldThread.locked !== newThread.locked) {
        changes.push(`**Kilit:** \`${oldThread.locked}\` ➝ \`${newThread.locked}\``);
      }
      if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
        changes.push(`**Yavaş Mod:** \`${oldThread.rateLimitPerUser}s\` ➝ \`${newThread.rateLimitPerUser}s\``);
      }
      if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
        changes.push(
          `**Auto Archive Süresi:** \`${oldThread.autoArchiveDuration}\` ➝ \`${newThread.autoArchiveDuration}\``
        );
      }

      if (changes.length === 0) return; // hiç değişiklik yoksa çık

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${executor ? executor.tag : "Bilinmiyor"}`,
          iconURL: `${executor ? executor.displayAvatarURL() : ""}`,
        })
        .setDescription(
          `${config.emojis.update} ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${oldThread.name}** (\`${newThread.id}\`) alt başlığı güncellendi.`
        )
        .addFields(
            { name: `${config.emojis.channel} Kanal`, value: `<#${newThread.parentId}>`, inline: true },
            { name: `${config.emojis.update} Değişiklikler`, value: changes.join("\n"), inline: true },
            { name: `${config.emojis.sorumlu} Sorumlu`, value: `<@${executor ? executor.id : "Bilinmiyor"}>`, inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: newThread.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for thread update errors
    }
  },
};
