const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require("discord.js");
const Sanction = require("../../models/Sanction");
const User = require("../../models/User");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sustur")
    .setDescription("Kullanıcıları susturur veya susturmasını kaldırır.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("ekle")
        .setDescription("Belirtilen kullanıcıyı susturur.")
        .addUserOption(option =>
          option
            .setName("kullanıcı")
            .setDescription("Susturulacak kullanıcı")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("dakika")
            .setDescription("Susturma süresi (dakika)")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("kaldır")
        .setDescription("Belirtilen kullanıcının susturmasını kaldırır.")
        .addUserOption(option =>
          option
            .setName("kullanıcı")
            .setDescription("Susturması kaldırılacak kullanıcı")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (
      !interaction.member.roles.cache.has(config.roles.moderator) &&
      !interaction.member.roles.cache.has(config.roles.staff) &&
      interaction.user.id !== config.owners.sphinx
    ) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }

    // ================== MUTE EKLE ==================
    if (interaction.options.getSubcommand() === "ekle") {
      const user = interaction.options.getUser("kullanıcı");
      const minutes = interaction.options.getInteger("dakika");

      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendini susturamazsın.`,
          flags: ["Ephemeral"]
        });
      }
      if (user.id === interaction.client.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Botu susturamazsın.`,
          flags: ["Ephemeral"]
        });
      }

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);
      if (!member) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kullanıcı bulunamadı.`,
          flags: ["Ephemeral"]
        });
      }

      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bu kullanıcıyı susturamazsın - rol hiyerarşisi`,
          flags: ["Ephemeral"]
        });
      }

      // Onay butonları
      const confirmationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_mute")
          .setLabel("Evet, Sustur")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_mute")
          .setLabel("Hayır, İptal Et")
          .setStyle(ButtonStyle.Secondary)
      );

      const confirmationMessage = await interaction.reply({
        content: `**${user.tag}** kullanıcısını **${minutes} dakika** susturmak istediğine emin misin?`,
        components: [confirmationRow],
        flags: ["Ephemeral"]
      });

      const collector = confirmationMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: i => i.user.id === interaction.user.id
      });

      collector.on("collect", async i => {
        if (i.customId === "confirm_mute") {
          await i.update({
            content: `${config.emojis.time} Kullanıcı susturuluyor...`,
            components: []
          });

          const mutedRole = interaction.guild.roles.cache.get(config.roles.muted);
          if (!mutedRole) {
            return i.editReply({
              content: `${config.emojis.cancel} Muted rolü bulunamadı!`
            });
          }
          await member.roles.add(mutedRole);

          // Veritabanı işlemleri
          const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
          const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

          const newMute = new Sanction({
            sanctionId,
            type: "Mute",
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason: `Mute (${minutes} dakika)`,
            duration: minutes * 60 * 1000,
            active: true
          });
          await newMute.save();

          let userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
          if (!userData) {
            userData = new User({ userId: user.id, guildId: interaction.guild.id });
          }
          userData.currentMute = {
            sanctionId,
            muteUntil: new Date(Date.now() + minutes * 60 * 1000)
          };
          await userData.save();

          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı \`${minutes}\` dakika boyunca susturuldu.`)
            .addFields(
              { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
              { name: `${config.emojis.warning} Mute ID`, value: `\`#${sanctionId}\``, inline: true },
              { name: `${config.emojis.info} Süre`, value: `\`${minutes}\` dakika`, inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

          const logChannel = interaction.guild.channels.cache.get(config.logChannels.muteLog);
          if (logChannel) await logChannel.send({ embeds: [embed] });

          await i.editReply({
            content: `> ${config.emojis.success} **${user.tag}** \`${minutes}\` dakika boyunca susturuldu.`
          });
        }

        if (i.customId === "cancel_mute") {
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
          } catch {}
        }
      });
    }

    // ================== MUTE KALDIR ==================
    if (interaction.options.getSubcommand() === "kaldır") {
      const user = interaction.options.getUser("kullanıcı");

      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendi susturmanı kaldıramazsın.`,
          flags: ["Ephemeral"]
        });
      }

      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kullanıcı bulunamadı.`,
          flags: ["Ephemeral"]
        });
      }

      const mutedRole = interaction.guild.roles.cache.get(config.roles.muted);
      if (!mutedRole) {
        return interaction.reply({
          content: `${config.emojis.cancel} Muted rolü bulunamadı.`,
          flags: ["Ephemeral"]
        });
      }

      if (!member.roles.cache.has(mutedRole.id)) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bu kullanıcı zaten susturulmuş değil.`,
          flags: ["Ephemeral"]
        });
      }

      await member.roles.remove(mutedRole);

      const muteRecord = await Sanction.findOneAndUpdate(
        { userId: user.id, guildId: interaction.guild.id, type: "Mute", active: true },
        { active: false }
      );

      const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
      if (userData) {
        userData.currentMute = { sanctionId: null, muteUntil: null };
        await userData.save();
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının susturması kaldırıldı.`)
        .addFields(
          { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
          { name: `${config.emojis.warning} Mute Kaydı`, value: muteRecord ? `\`#${muteRecord.sanctionId}\`` : "MongoDB kaydı bulunamadı", inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.reply({
        content: `${config.emojis.success} **${user.tag}** kullanıcısının susturması kaldırıldı.`,
        flags: ["Ephemeral"]
      });

      const logChannel = interaction.guild.channels.cache.get(config.logChannels.muteLog);
      if (logChannel) await logChannel.send({ embeds: [embed] });
    }
  }
};