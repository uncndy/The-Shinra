// logs/guildUpdate.js
const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild) {
    try {
      if (!oldGuild) return;

      const logChannel = newGuild.channels.cache.get(config.logChannels.serverSettingsUpdated);
      if (!logChannel) return;

      let changes = [];

      // Sunucu ismi değiştiyse
      if (oldGuild.name !== newGuild.name) {
        changes.push(`**Sunucu İsmi:** \`${oldGuild.name}\` ➝ \`${newGuild.name}\``);
      }

      // Sunucu simgesi değiştiyse
      if (oldGuild.iconURL() !== newGuild.iconURL()) {
        changes.push(`**Sunucu Simgesi:** Değiştirildi`);
      }

      // Sunucu afişi değiştiyse
      if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
        changes.push(`**Sunucu Afişi:** Değiştirildi`);
      }

      // Doğrulama seviyesi değiştiyse
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push(`**Doğrulama Seviyesi:** \`${oldGuild.verificationLevel}\` ➝ \`${newGuild.verificationLevel}\``);
      }

      // Sistem kanal değiştiyse
      if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
        changes.push(`**Sistem Kanalı:** <#${oldGuild.systemChannelId || "Yok"}> ➝ <#${newGuild.systemChannelId || "Yok"}>`);
      }

      // Kurallar kanalı değiştiyse
      if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
        changes.push(`**Kurallar Kanalı:** <#${oldGuild.rulesChannelId || "Yok"}> ➝ <#${newGuild.rulesChannelId || "Yok"}>`);
      }

      // Halk güncellemeleri kanalı değiştiyse
      if (oldGuild.publicUpdatesChannelId !== newGuild.publicUpdatesChannelId) {
        changes.push(`**Halk Güncellemeleri Kanalı:** <#${oldGuild.publicUpdatesChannelId || "Yok"}> ➝ <#${newGuild.publicUpdatesChannelId || "Yok"}>`);
      }
      
      // Gizlilik seviyesi değiştiyse
      if (oldGuild.privacyLevel !== newGuild.privacyLevel) {
        changes.push(`**Gizlilik Seviyesi:** \`${oldGuild.privacyLevel}\` ➝ \`${newGuild.privacyLevel}\``);
      }

      if (changes.length === 0) return;

      // Audit logdan sorumlu kullanıcı
      const fetchedLogs = await newGuild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.GuildUpdate,
      });
      const updateLog = fetchedLogs.entries.first();
      const executor = updateLog ? updateLog.executor : null;

      const embed = new EmbedBuilder()
        .setAuthor({ name: executor ? executor.tag : "Bilinmiyor", iconURL: executor ? executor.displayAvatarURL() : null })
        .setDescription(`${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından sunucu ayarları güncellendi.`)
        .addFields(
          { name: "Sunucu", value: `${newGuild.name}`, inline: true },
          { name: "Değişiklikler", value: changes.join("\n") || "Yok", inline: true },
          { name: "Sorumlu Moderator", value: executor ? `<@${executor.id}>` : "Bilinmiyor", inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newGuild.iconURL() })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error("guildUpdate eventinde hata:", err);
    }
  },
};
