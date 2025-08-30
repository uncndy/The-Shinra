const { EmbedBuilder, Events, AuditLogEvent, PermissionsBitField } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole) {
    try {
      if (!oldRole.guild) return;

      const logChannel = oldRole.guild.channels.cache.get(config.logChannels.updatedRole);
      if (!logChannel) return;

      if (oldRole === newRole) return;

      // Audit logdan sorumlu kişiyi bul
      const fetchedLogs = await oldRole.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleUpdate,
      });

      const updateLog = fetchedLogs.entries.first();
      const executor = updateLog ? updateLog.executor : null;

      let changes = [];
      if (oldRole.name !== newRole.name) {
        changes.push(`**İsim:** \`${oldRole.name}\` ➝ \`${newRole.name}\``);
      }
      if (oldRole.color !== newRole.color) {
        changes.push(`**Renk:** \`${oldRole.hexColor}\` ➝ \`${newRole.hexColor}\``);
      }
      if (oldRole.hoist !== newRole.hoist) {
        changes.push(`**Hoist:** \`${oldRole.hoist ? "Açık" : "Kapalı"}\` ➝ \`${newRole.hoist ? "Açık" : "Kapalı"}\``);
      }
      if (oldRole.mentionable !== newRole.mentionable) {
        changes.push(`**Mentionable:** \`${oldRole.mentionable ? "Evet" : "Hayır"}\` ➝ \`${newRole.mentionable ? "Evet" : "Hayır"}\``);
      }
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
        const oldPerms = new PermissionsBitField(oldRole.permissions.bitfield);
        const newPerms = new PermissionsBitField(newRole.permissions.bitfield);

        const addedPerms = newPerms.toArray().filter(p => !oldPerms.has(p));
        const removedPerms = oldPerms.toArray().filter(p => !newPerms.has(p));

        if (addedPerms.length > 0 || removedPerms.length > 0) {
          let permChanges = [];
          if (addedPerms.length > 0) permChanges.push(addedPerms.map(p => `\`+ ${p}\``).join("\n"));
          if (removedPerms.length > 0) permChanges.push(removedPerms.map(p => `\`- ${p}\``).join("\n"));
          changes.push(`**İzinler:**\n${permChanges.join("\n")}`);
        }
      }

      if (changes.length === 0) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: executor ? executor.tag : "Bilinmiyor",
          iconURL: executor ? executor.displayAvatarURL() : null,
        })
        .setDescription(
          `📝 ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${oldRole.name}** (\`${oldRole.id}\`) rolü güncellendi.`
        )
        .addFields(
          { name: "Rol", value: `${newRole}`, inline: true },
          { name: "Değişiklikler", value: changes.join("\n") || "Yok", inline: true },
          { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: oldRole.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("roleUpdate eventinde hata:", err);
    }
  },
};
