const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role) {
    try {
      const logChannel = role.guild.channels.cache.get(config.logChannels.createdRole);
      if (!logChannel) return;

      // Audit Log'dan rol oluşturma olayını çek
      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleCreate,
      });

      const creationLog = fetchedLogs.entries.first();
      const executor = creationLog ? creationLog.executor : null;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: executor ? executor.tag : "Bilinmiyor",
          iconURL: executor ? executor.displayAvatarURL() : null,
        })
        .setDescription(
          `${config.emojis.role} ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${role.name}** (\`${role.id}\`) rolü oluşturuldu.`
        )
        .addFields(
          { name: `${config.emojis.role} Rol`, value: `\`${role.name}\``, inline: true },
          { name: `${config.emojis.sorumlu} Sorumlu`, value: `<@${executor ? executor.id : "Bilinmiyor"}>`, inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: role.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for role create errors
    }
  },
};
