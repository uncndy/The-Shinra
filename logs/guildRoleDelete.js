// logs/guildRoleDelete.js
const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role) {
    try {
      if (!role.guild) return;

      const logChannel = role.guild.channels.cache.get(config.logChannels.deletedRole);
      if (!logChannel) return;

      // Audit logdan sorumlu kişiyi bul
      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleDelete,
      });

      const deleteLog = fetchedLogs.entries.first();
      const executor = deleteLog ? deleteLog.executor : null;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: executor ? executor.tag : "Bilinmiyor",
          iconURL: executor ? executor.displayAvatarURL() : null,
        })
        .setDescription(
          `${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${role.name}** (\`${role.id}\`) rolü sunucudan silindi.`
        )
        .addFields(
          { name: "Rol", value: `${role.name} (\`${role.id}\`)`, inline: true },
          { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: role.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("guildRoleDelete eventinde hata:", err);
    }
  },
};
