// logs/guildMemberUpdate.js
const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      if (!oldMember.guild) return;

      // --- ROL DEĞİŞİKLİKLERİ ---
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
      const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

      // Audit log
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate,
      });
      const roleLog = fetchedLogs.entries.first();
      const executor = roleLog ? roleLog.executor : null;

      // Rol eklenmişse
      if (addedRoles.size > 0) {
        const logChannel = newMember.guild.channels.cache.get(config.logChannels.roleGived);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: executor ? executor.tag : "Bilinmiyor", iconURL: executor ? executor.displayAvatarURL() : null })
            .setDescription(`${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısına rol verildi.`)
            .addFields(
              { name: "Kullanıcı", value: `${newMember}`, inline: true },
              { name: "Verilen Roller", value: addedRoles.map(r => r.toString()).join("\n"), inline: true },
              { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // Rol alınmışsa
      if (removedRoles.size > 0) {
        const logChannel = newMember.guild.channels.cache.get(config.logChannels.roleRemoved);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: executor ? executor.tag : "Bilinmiyor", iconURL: executor ? executor.displayAvatarURL() : null })
            .setDescription(`${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısından rol alındı.`)
            .addFields(
              { name: "Kullanıcı", value: `${newMember}`, inline: true },
              { name: "Alınan Roller", value: removedRoles.map(r => r.toString()).join("\n"), inline: true },
              { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // --- NICKNAME DEĞİŞİKLİKLERİ ---
      if (oldMember.nickname !== newMember.nickname) {
        const logChannel = newMember.guild.channels.cache.get(config.logChannels.changedNick);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: executor ? executor.tag : "Bilinmiyor", iconURL: executor ? executor.displayAvatarURL() : null })
            .setDescription(`${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısının takma adı değiştirildi.`)
            .addFields(
              { name: "Eski Nick", value: oldMember.nickname || "Yok", inline: true },
              { name: "Yeni Nick", value: newMember.nickname || "Yok", inline: true },
              { name: "Sorumlu", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

    } catch (err) {
      console.error("guildMemberUpdate eventinde hata:", err);
    }
  },
};
