const {Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = {
    name: Events.ChannelDelete,
    async execute(deletedChannel) {
        try {
            if (!deletedChannel.guild) return;

            const logChannel = deletedChannel.guild.channels.cache.get(config.logChannels.deletedChannel);
            if (!logChannel) return;

            const fetchedLogs = await deletedChannel.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.ChannelDelete,
            });

            const deletionLog = fetchedLogs.entries.first();
            const executor = deletionLog ? deletionLog.executor : null;

            const embed = new EmbedBuilder()
                .setAuthor({
                    name: `${executor ? executor.tag : "Bilinmiyor"}`,
                    iconURL: `${executor ? executor.displayAvatarURL() : ""}`,
                })
                .setDescription(
                    `📢 ${executor ? executor.tag : "Bilinmiyor"} (\`${executor ? executor.id : "Bilinmiyor"}\`) tarafından **${deletedChannel.name}** (\`${deletedChannel.id}\`) silindi.`
                )
                .addFields(
                    { name: "Kanal", value: `${deletedChannel.name} (\`${deletedChannel.id}\`)`, inline: true },
                    { name: "Sorumlu Moderator", value: `${executor ? `<@${executor.id}>` : "Bilinmiyor"}`, inline: true }
                )
                .setFooter({
                    text: "The Shinra | Ateşin Efsanesi",
                    iconURL: deletedChannel.guild.iconURL(),
                })
                .setTimestamp();

            logChannel.send({ embeds: [embed] });
        } catch (err) {
            console.error("channelDelete eventinde hata:", err);
        }
    }
};
