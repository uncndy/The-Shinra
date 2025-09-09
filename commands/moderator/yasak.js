const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SeparatorBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const Sanction = require("../../models/Sanction");
const User = require("../../models/User");
const config = require('../../config');
const {components, texts} = require('../../components')

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yasak")
    .setDescription("Kullanıcıları yasaklama ve yasağını kaldırma işlemleri.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("ekle")
        .setDescription("Bir kullanıcıyı sunucudan yasaklar ve kaydeder.")
        .addUserOption(option =>
          option.setName("kullanıcı")
            .setDescription("Yasaklanacak kullanıcı.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName("sebep")
            .setDescription("Yasaklama sebebi.")
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("kaldir")
        .setDescription("Bir kullanıcının yasağını kaldırır ve kaydını günceller.")
        .addUserOption(option =>
          option.setName("kullanıcı")
            .setDescription("Yasağı kaldırılacak kullanıcı.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator) && interaction.user.id !== config.owners.sphinx) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [texts.tr.modControlText, components.separator]
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("kullanıcı");

    // Kullanıcı kontrolleri
    if (user.id === interaction.user.id) {
      const text = new TextDisplayBuilder().setContent(`${config.emojis.cancel} Kendine işlem uygulayamazsın.`);
      const separator = new SeparatorBuilder();
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [text, separator]
      });
    }

    if (user.id === interaction.client.user.id) {
      const text = new TextDisplayBuilder().setContent(`${config.emojis.cancel} Botu işlem uygulayamazsın.`);
      const separator = new SeparatorBuilder();
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [text, separator]
      });
    }

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(user.id);
    } catch {
      targetMember = null;
    }

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      const text = new TextDisplayBuilder().setContent(`${config.emojis.cancel} Bu kullanıcıya işlem uygulayamazsın (rol hiyerarşisi).`);
      const separator = new SeparatorBuilder();
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [text, separator]
      });
    }

    const isBan = subcommand === "ekle";
    const actionLabel = isBan ? "Banla" : "Banı Kaldır";
    const actionId = isBan ? "confirm_ban" : "confirm_unban";
    const cancelId = isBan ? "cancel_ban" : "cancel_unban";
    const reason = isBan ? (interaction.options.getString("sebep") || "Sebep belirtilmedi") : null;

    const confirmationRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(actionId)
        .setLabel(`Evet, ${actionLabel}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(cancelId)
        .setLabel("Hayır, İptal Et")
        .setStyle(ButtonStyle.Secondary)
    );
    const text = new TextDisplayBuilder().setContent(
      isBan
        ? `${config.emojis.warning} **@${user.username}** kullanıcısını \`${reason}\` sebebiyle banlamak istediğine emin misin?`
        : `${config.emojis.warning} **@${user.username}** kullanıcısının banını kaldırmak istediğine emin misin?`
    );
    const separator = new SeparatorBuilder();
    await interaction.reply({
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      components: [text, separator, confirmationRow]
    });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on("collect", async i => {
      if (i.customId === actionId) {
        await i.update({ content: `${config.emojis.time} İşlem yapılıyor...`, components: [] });

        if (isBan) {
          await interaction.guild.members.ban(user.id, { reason });

          const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
          const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

          const newBan = new Sanction({
            sanctionId,
            type: "Ban",
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            active: true
          });
          await newBan.save();

          let userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
          if (!userData) userData = new User({ userId: user.id, guildId: interaction.guild.id });
          userData.currentBan = { sanctionId, isBanned: true };
          await userData.save();

          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı sunucudan banlandı.`)
            .addFields(
              { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
              { name: `${config.emojis.warning} Ban ID`, value: `\`#${sanctionId}\``, inline: true },
              { name: `${config.emojis.info} Sebep`, value: reason, inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

          const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
          if (logChannel) logChannel.send({ embeds: [embed] });

          await i.editReply({ content: `${config.emojis.success} **@${user.username}** başarıyla banlandı.`, components: [] });
        } else {
          const bannedUsers = await interaction.guild.bans.fetch();
          const banEntry = bannedUsers.get(user.id);
          if (!banEntry) {
            return i.editReply({ content: `${config.emojis.cancel} Bu kullanıcı zaten banlı değil.`, components: [] });
          }

          await interaction.guild.members.unban(user.id);

          const banRecord = await Sanction.findOneAndUpdate(
            { userId: user.id, guildId: interaction.guild.id, type: "Ban", active: true },
            { active: false },
            { new: false }
          );

          const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
          if (userData) {
            userData.currentBan = { sanctionId: null, isBanned: false };
            await userData.save();
          }

          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının banı kaldırıldı.`)
            .addFields(
              { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
              { name: `${config.emojis.warning} Ban Kaydı`, value: banRecord ? `\`#${banRecord.sanctionId}\`` : "MongoDB kaydı bulunamadı", inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

          const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
          if (logChannel) logChannel.send({ embeds: [embed] });

          await i.editReply({ content: `${config.emojis.success} **@${user.username}** banı kaldırıldı.`, components: [] });
        }
      } else if (i.customId === cancelId) {
        await i.update({ content: `${config.emojis.cancel} İşlem iptal edildi.`, components: [] });
      }
      collector.stop();
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        await interaction.editReply({ content: `${config.emojis.time} İşlem zaman aşımına uğradı.`, components: [] }).catch(() => {});
      }
    });
  }
};
