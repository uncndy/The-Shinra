const { EmbedBuilder, Events } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    try {
      if (message.partial) return; // Cache'de yoksa atla
      if (!message.guild || message.author.bot) return;

      const logChannel = message.guild.channels.cache.get(config.logChannels.deletedMessage);
      if (!logChannel) return;

      const content = message.content && message.content.length > 0 
        ? message.content 
        : "[Mesaj içeriği yok / sadece dosya veya embed vardı]";

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(
          `${config.emojis.trash} ${config.emojis.trash} ${message.author.tag} (\`${message.author.id}\`) tarafından gönderilen bir mesaj **${message.channel.name}** (\`${message.channel.id}\`) kanalında silindi.`
        )
        .addFields(
          {
            name: `${config.emojis.channel} Kanal`,
            value: `<#${message.channel.id}>`,
            inline: true
          },
          {
            name: `${config.emojis.sorumlu} Sorumlu`,
            value: `<@${message.author.id}>`,
            inline: true
          },
          {
            name: `${config.emojis.question} İçerik`,
            value: `\`\`\`${content.length > 1000 ? content.slice(0, 1000) + "..." : content}\`\`\``,
            inline: false
          }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for message delete errors
    }
  },
};
