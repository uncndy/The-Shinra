const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Sanction = require("../../models/Sanction");
const User = require("../../models/User");
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("yasak")
    .setDescription("Kullanıcıları yasaklama ve yasağını kaldırma işlemleri.")
    // Subcommand: ekle (ban)
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
    // Subcommand: kaldir (unban)
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
    // 1. Yetki kontrolü - flags kullanımına geçiş
    if (!interaction.member.roles.cache.has(config.roles.moderator) && interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]  // ephemeral yerine flags kullanımı
      });
    }
    if (interaction.options.getSubcommand() === "ekle") {
      const user = interaction.options.getUser("kullanıcı");
      const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

      // 2. Kullanıcı kontrolleri
      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendini banlayamazsın.`,
          flags: ["Ephemeral"]
        });
      }

      if (user.id === interaction.client.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Botu banlayamazsın.`,
          flags: ["Ephemeral"]
        });
      }

      try {
        // 3. Hedef kullanıcı rol kontrolü
        let targetMember;
        try {
          targetMember = await interaction.guild.members.fetch(user.id);
        } catch (e) {
          targetMember = null;
        }
        if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
          return interaction.reply({
            content: `${config.emojis.cancel} Bu kullanıcıyı banlayamazsın - rol hiyerarşisi`,
            flags: ["Ephemeral"]
          });
        }

        // Onay butonu oluşturma
        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_ban')
            .setLabel('Evet, Banla')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_ban')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary),
        );

        // Kullanıcıya onay mesajı gönder
        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısını \`${reason}\` sebebiyle banlamak istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"],
        });

        // Buton etkileşimlerini dinle
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000
        });

        collector.on('collect', async i => {
          if (i.customId === 'confirm_ban') {
            await i.update({ content: `${config.emojis.time} Kullanıcı banlanıyor...`, components: [] });

            // Discord'da ban at
            await interaction.guild.members.ban(user.id, { reason });

            // Son sanctionId'yi al ve 1 artır
            const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
            const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

            // MongoDB'ye kaydet
            const newBan = new Sanction({
              sanctionId: sanctionId,
              type: "Ban",
              guildId: interaction.guild.id,
              userId: user.id,
              moderatorId: interaction.user.id,
              reason: reason,
              active: true
            });
            await newBan.save();

            // User modelini güncelle
            let userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
            if (!userData) {
              userData = new User({ userId: user.id, guildId: interaction.guild.id });
            }
            userData.currentBan = {
              sanctionId: sanctionId,
              isBanned: true
            };
            await userData.save();

            // Embed hazırla
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

            // Ban atan kişiye geri bildir
            await i.editReply({ content: `${config.emojis.success} **@${user.username}** kullanıcısı başarıyla banlandı.`, components: [] });

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
            if (logChannel) logChannel.send({ embeds: [embed] });

          } else if (i.customId === 'cancel_ban') {
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              components: []
            });
          }
          collector.stop();
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            try {
              await interaction.editReply({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                components: []
              });
            } catch (err) {
              return; 
            }
          }
        });

      } catch (err) {
        // Silent fail for ban errors
        if (interaction.replied) {
          await interaction.followUp({
            content: `${config.emojis.cancel} Kullanıcı banlanamadı.`,
            flags: ["Ephemeral"]
          });
        } else {
          await interaction.reply({
            content: `${config.emojis.cancel} Kullanıcı banlanamadı.`,
            flags: ["Ephemeral"]
          });
        }
      }
    }

    if (interaction.options.getSubcommand() === "kaldir") {
      const user = interaction.options.getUser("kullanıcı");

      try {
        const bannedUsers = await interaction.guild.bans.fetch();
        const banEntry = bannedUsers.get(user.id);

        // Banlı kullanıcı kontrolü
        if (!banEntry) {
          return interaction.reply({
            content: `${config.emojis.cancel} Bu kullanıcı zaten banlı değil.`,
            flags: ["Ephemeral"]
          });
        }

        // Onay butonu oluşturma
        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_unban')
            .setLabel('Evet, Banı Kaldır')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_unban')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary),
        );

        // Kullanıcıya onay mesajı gönder
        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısının banını kaldırmak istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"]
        });

        // Buton etkileşimlerini dinle
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000
        });

        collector.on('collect', async i => {
          if (i.customId === 'confirm_unban') {
            await i.update({ content: `${config.emojis.time} Kullanıcının banı kaldırılıyor...`, components: [] });

            // Discord'dan ban kaldır
            await interaction.guild.members.unban(user.id);

            // MongoDB'deki active ban kaydını bul ve güncelle
            const banRecord = await Sanction.findOneAndUpdate(
              {
                userId: user.id,
                guildId: interaction.guild.id,
                type: "Ban",
                active: true
              },
              { active: false },
              { new: false }
            );

            // User modelini güncelle
            const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
            if (userData) {
              userData.currentBan = {
                sanctionId: null,
                isBanned: false
              };
              await userData.save();
            }

            // Embed hazırla
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

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.logChannels.banLog);
            if (logChannel) {
              await logChannel.send({ embeds: [embed] });
            }

            // Kullanıcıya geri bildir
            await i.editReply({
              content: `${config.emojis.success} **@${user.username}** kullanıcısının banı başarıyla kaldırıldı.`,
              components: []
            });

          } else if (i.customId === 'cancel_unban') {
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              components: []
            });
          }
          collector.stop();
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            try {
              await interaction.editReply({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                components: []
              });
            } catch (err) {
              return; 
            }
          }
        });

      } catch (err) {
        // Silent fail for unban errors
        await interaction.reply({
          content: `${config.emojis.cancel} Kullanıcının banı kaldırılamadı.`,
          flags: ["Ephemeral"]
        });
      }
    }
  }
};
