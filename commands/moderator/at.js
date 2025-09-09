const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  PermissionFlagsBits,
  SeparatorBuilder,
  MessageFlags,
  TextDisplayBuilder
} = require("discord.js");
const Sanction = require("../../models/Sanction");
const config = require('../../config');
const {components, texts} = require('../../components')

module.exports = {
  data: new SlashCommandBuilder()
    .setName("at")
    .setDescription("Bir kullanıcıyı sunucudan atar ve kaydeder.")
    .addUserOption(option =>
      option
        .setName("kullanıcı")
        .setDescription("Atılacak kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("sebep")
        .setDescription("Kick sebebi")
        .setRequired(false)
    ), // v15 için önerilen kullanım

  async execute(interaction) {
    // Yetki kontrolü
    if (
      !interaction.member.roles.cache.has(config.roles.moderator) &&
      !interaction.member.roles.cache.has(config.roles.staff) &&
      interaction.user.id !== config.owners.sphinx
    ) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [texts.tr.modOrStaffControlText, components.separator]
      });
    }

    const user = interaction.options.getUser("kullanıcı");
    const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.cancel} Kendini atamazsın.`,
        ephemeral: true
      });
    }
    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: `${config.emojis.cancel} Botu atamazsın.`,
        ephemeral: true
      });
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);

      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bu kullanıcıyı atamazsın - rol hiyerarşisi nedeniyle.`,
          ephemeral: true
        });
      }

      // Onay butonları
      const confirmationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_kick")
          .setLabel("Evet, At")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_kick")
          .setLabel("Hayır, İptal Et")
          .setStyle(ButtonStyle.Secondary)
      );

      const text = new TextDisplayBuilder().setContent(`${config.emojis.warning} **${user.tag}** kullanıcısını \`${reason}\` sebebiyle atmak istediğine emin misin?`);
      const separator = new SeparatorBuilder();
      const confirmationMessage = await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [text, separator, confirmationRow]
      });

      // v15 Collector kullanımı (çok değişmeyecek)
      const collector = confirmationMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
      });

      collector.on("collect", async i => {
        if (i.customId === "confirm_kick") {
          await i.update({ content: `${config.emojis.time} Kullanıcı atılıyor...`, components: [] });

          await member.kick(reason);

          // Sanction DB kaydı
          const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
          const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

          const newKick = new Sanction({
            sanctionId,
            type: "Kick",
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            active: false
          });
          await newKick.save();

          // Log embed
          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı sunucudan atıldı.`)
            .addFields(
              { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
              { name: `${config.emojis.warning} Kick ID`, value: `\`#${sanctionId}\``, inline: true },
              { name: `${config.emojis.info} Sebep`, value: reason, inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

          const logChannel = interaction.guild.channels.cache.get(config.logChannels.kickLog);
          if (logChannel) logChannel.send({ embeds: [embed] });

          await interaction.followUp({
            content: `> ${config.emojis.success} **${user.tag}** kullanıcısı başarıyla atıldı.`,
            ephemeral: true
          });

        } else if (i.customId === "cancel_kick") {
          await i.update({
            content: `${config.emojis.cancel} İşlem iptal edildi.`,
            components: []
          });
        }
        collector.stop();
      });

      collector.on("end", async collected => {
        if (collected.size === 0) {
          try {
            await confirmationMessage.edit({
              content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
              components: []
            });
          } catch (err) {
            return;
          }
        }
      });

    } catch (err) {
      await interaction.editReply({
        content: `${config.emojis.cancel} Kullanıcı atılamadı.`,
        components: []
      });
    }
  }
};
