const { EmbedBuilder, Events, AuditLogEvent, PermissionsBitField } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    try {
      if (!oldChannel.guild) return;
      const logChannel = oldChannel.guild.channels.cache.get(config.logChannels.updatedChannel);
      if (!logChannel) return;

      // Audit Log'dan executor çek
      const fetchedLogs = await oldChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate,
      });
      const updateLog = fetchedLogs.entries.first();
      const executor = updateLog ? updateLog.executor : null;

      let changes = [];

      if (oldChannel.name !== newChannel.name) {
        changes.push(`**İsim:** \`${oldChannel.name}\` ➝ \`${newChannel.name}\``);
      }
      if (oldChannel.topic !== newChannel.topic) {
        changes.push(`**Konu:** \`${oldChannel.topic || "Yok"}\` ➝ \`${newChannel.topic || "Yok"}\``);
      }
      if (oldChannel.bitrate !== newChannel.bitrate) {
        changes.push(`**Bitrate:** \`${oldChannel.bitrate}\` ➝ \`${newChannel.bitrate}\``);
      }
      if (oldChannel.userLimit !== newChannel.userLimit) {
        changes.push(`**Kullanıcı Limiti:** \`${oldChannel.userLimit || 0}\` ➝ \`${newChannel.userLimit || 0}\``);
      }
      if (oldChannel.nsfw !== newChannel.nsfw) {
        changes.push(`**NSFW:** \`${oldChannel.nsfw ? "Açık" : "Kapalı"}\` ➝ \`${newChannel.nsfw ? "Açık" : "Kapalı"}\``);
      }
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        changes.push(`**Yavaş Mod:** \`${oldChannel.rateLimitPerUser || 0} saniye\` ➝ \`${newChannel.rateLimitPerUser || 0} saniye\``);
      }
      if (oldChannel.parentId !== newChannel.parentId) {
        const oldParent = oldChannel.parent ? oldChannel.parent.name : "Yok";
        const newParent = newChannel.parent ? newChannel.parent.name : "Yok";
        changes.push(`**Kategori:** \`${oldParent}\` ➝ \`${newParent}\``);
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: executor ? executor.tag : "Bilinmiyor",
          iconURL: executor ? executor.displayAvatarURL() : "",
        })
        .setDescription(
          `📢 ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${oldChannel.name}** (\`${oldChannel.id}\`) güncellendi.`
        )
        .addFields(
            { name: "Kanal", value: `<#${oldChannel.id}>`, inline: true },
            { name: "Değişiklikler", value: changes.length > 0 ? changes.join("\n") : "Yok", inline: true },
            { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : `Bilinmiyor`, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: oldChannel.guild.iconURL() })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("channelUpdate eventinde hata:", err);
    }
  },
};
