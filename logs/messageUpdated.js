const { EmbedBuilder, Events } = require("discord.js");
const config = require("../config");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    try {
      if (oldMessage.partial || newMessage.partial) return; // Cache'de yoksa atla
      if (!oldMessage.guild || oldMessage.author.bot) return;

      const logChannel = oldMessage.guild.channels.cache.get(config.logChannels.editedMessage);
      if (!logChannel) return;

      const oldContent = oldMessage.content && oldMessage.content.length > 0
        ? oldMessage.content
        : "[Mesaj içeriği yok / sadece dosya vardı]";

      const newContent = newMessage.content && newMessage.content.length > 0
        ? newMessage.content
        : "[Mesaj içeriği yok / sadece dosya vardı]";

      if (oldContent === newContent) return;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${oldMessage.author.tag}`,
          iconURL: oldMessage.author.displayAvatarURL(),
        })
        .setDescription(
          `${config.emojis.edit} ${oldMessage.author.tag} (\`${oldMessage.author.id}\`) tarafından gönderilen bir mesaj **${oldMessage.channel.name}** (\`${oldMessage.channel.id}\`) kanalında güncellendi.`
        )
        .addFields(
          {
            name: `${config.emojis.channel} Kanal`,
            value: `<#${oldMessage.channel.id}>`,
            inline: true,
          },
          {
            name: `${config.emojis.sorumlu} Sorumlu`,
            value: `<@${oldMessage.author.id}>`,
            inline: true,
          },
          {
            name: `${config.emojis.question} Eski İçerik:`,
            value: `\`\`\`${oldContent.length > 1000 ? oldContent.slice(0, 1000) + "..." : oldContent}\`\`\``,
            inline: false,
          },
          {
            name: `${config.emojis.edit} Yeni İçerik:`,
            value: `\`\`\`${newContent.length > 1000 ? newContent.slice(0, 1000) + "..." : newContent}\`\`\``,
            inline: true,
          }
        )
        .setFooter({
          text: "The Shinra | Ateşin Efsanesi",
          iconURL: oldMessage.guild.iconURL(),
        })
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      // Silent fail for message edit errors
    }
  },
};
