const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Sanction = require("../../models/Sanction");
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uyarı")
    .setDescription("Uyarı sistemi komutları.")
    // Alt komut: ekle (warn)
    .addSubcommand(subcommand =>
      subcommand
        .setName("ekle")
        .setDescription("Bir kullanıcıya uyarı verir.")
        .addUserOption(option =>
          option.setName("kullanıcı")
            .setDescription("Uyarılacak kullanıcı.")
            .setRequired(true))
        .addStringOption(option =>
          option.setName("sebep")
            .setDescription("Uyarı nedeni.")
            .setRequired(true)))
    // Alt komut: sil (removewarn)
    .addSubcommand(subcommand =>
      subcommand
        .setName("sil")
        .setDescription("Belirtilen uyarıyı siler.")
        .addIntegerOption(option =>
          option.setName("id")
            .setDescription("Silinecek uyarı ID'si.")
            .setRequired(true)))
    // Alt komut: temizle (clearwarns)
    .addSubcommand(subcommand =>
      subcommand
        .setName("temizle")
        .setDescription("Bir kullanıcının tüm uyarılarını siler.")
        .addUserOption(option =>
          option.setName("kullanıcı")
            .setDescription("Uyarıları temizlenecek kullanıcı.")
            .setRequired(true)))
    // Alt komut: bilgi (warninfo)
    .addSubcommand(subcommand =>
      subcommand
        .setName("bilgi")
        .setDescription("Belirli bir uyarı kaydını gösterir.")
        .addIntegerOption(option =>
          option.setName("id")
            .setDescription("Görüntülenecek uyarı ID'si.")
            .setRequired(true)))
    // Alt komut: listele (warnings)
    .addSubcommand(subcommand =>
      subcommand
        .setName("listele")
        .setDescription("Bir kullanıcının tüm uyarılarını listeler.")
        .addUserOption(option =>
          option.setName("kullanıcı")
            .setDescription("Uyarılarını görmek istediğin kullanıcı.")
            .setRequired(true))),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.roles.cache.has(config.roles.juniorStaff) && interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff, Junior Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }
    if (interaction.options.getSubcommand() === "ekle") {
      const user = interaction.options.getUser("kullanıcı");
      const reason = interaction.options.getString("sebep");

      // Kendine işlem yapma kontrolü
      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendine uyarı veremezsin.`,
          flags: ["Ephemeral"]
        });
      }

      if (user.id === interaction.client.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bota uyarı veremezsin.`,
          flags: ["Ephemeral"]
        });
      }

      try {
        // Rol hiyerarşisi kontrolü
        const member = await interaction.guild.members.fetch(user.id);
        if (member && member.roles.highest.position >= interaction.member.roles.highest.position) {
          return interaction.reply({
            content: `${config.emojis.cancel} Bu kullanıcıya uyarı veremezsin - rol hiyerarşisi`,
            flags: ["Ephemeral"]
          });
        }

        // Onay butonu oluşturma
        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_warn')
            .setLabel('Evet, Uyar')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_warn')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary),
        );

        // Kullanıcıya onay mesajı gönderme
        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısına \`${reason}\` sebebiyle uyarı vermek istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"],
        });

        // Buton etkileşimlerini dinle
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000 // 30 saniye
        });

        collector.on('collect', async i => {
          // Sadece komutu kullananın etkileşimini işle
          if (i.customId === 'confirm_warn') {
            await i.update({ content: `${config.emojis.time} Kullanıcı uyarılıyor...`, components: [] });

            // Son sanctionId'yi al ve 1 artır
            const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
            const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

            const newWarn = new Sanction({
              sanctionId: sanctionId,
              type: "Warning",
              guildId: interaction.guild.id,
              userId: user.id,
              moderatorId: interaction.user.id,
              reason: reason,
              active: true
            });
            await newWarn.save();

            const embed = new EmbedBuilder()
              .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
              .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısına uyarı verildi.`)
              .addFields(
                { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
                { name: `${config.emojis.warning} Uyarı ID`, value: `\`#${sanctionId}\``, inline: true },
                { name: `${config.emojis.info} Sebep`, value: reason, inline: true }
              )
              .setThumbnail(user.displayAvatarURL())
              .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
              .setTimestamp();

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
            if (logChannel) {
              await logChannel.send({ embeds: [embed] });
            }

            // Kullanıcıya geri bildirim
            await i.editReply({
              content: `${config.emojis.success} **@${user.username}** kullanıcısı \`#${sanctionId}\` ID ile uyarıldı!`,
              components: []
            });

          } else if (i.customId === 'cancel_warn') {
            // İşlem iptal edildi
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
        // Silent fail for warn errors
        if (interaction.replied) {
          await interaction.followUp({
            content: `${config.emojis.cancel} Uyarı eklenirken bir hata oluştu.`,
            flags: ["Ephemeral"]
          });
        } else {
          await interaction.reply({
            content: `${config.emojis.cancel} Uyarı eklenirken bir hata oluştu.`,
            flags: ["Ephemeral"]
          });
        }
      }
    }
    if (interaction.options.getSubcommand() === "sil") {
      const warnId = interaction.options.getInteger("id");

      try {
        // Uyarıyı bul
        const warn = await Sanction.findOne({
          sanctionId: warnId,
          guildId: interaction.guild.id,
          type: "Warning"
        });

        if (!warn) {
          return interaction.reply({
            content: `${config.emojis.cancel} \`#${warnId}\` ID'li uyarı bulunamadı veya type 'Warning' değil.`,
            flags: ["Ephemeral"]
          });
        }

        // Kullanıcı bilgisini al
        let user;
        try {
          user = await interaction.client.users.fetch(warn.userId);
        } catch (fetchError) {
          return interaction.reply({
            content: `${config.emojis.cancel} Kullanıcı bilgileri alınamadı.`,
            flags: ["Ephemeral"]
          });
        }

        // Onay butonu oluşturma
        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_removewarn')
            .setLabel('Evet, Sil')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_removewarn')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary),
        );

        // Uyarı bilgilerini içeren embed oluştur
        const embed = new EmbedBuilder()
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının **aşağıdaki uyarısını** silmek istediğine emin misin?`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: `${config.emojis.moderator} Yetkili`, value: `<@${warn.moderatorId}>`, inline: true },
            { name: `${config.emojis.info} Tarih`, value: `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: `${config.emojis.info} Sebep`, value: warn.reason, inline: true }
          )
          .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        // Kullanıcıya onay mesajını gönder
        const confirmationMessage = await interaction.reply({
          embeds: [embed],
          components: [confirmationRow],
          flags: ["Ephemeral"],
          withResponse: true
        });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000
        });

        collector.on('collect', async i => {
          // Sadece komutu kullananın etkileşimini işle
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: `${config.emojis.cancel} Bu butonu sen kullanamazsın.`, flags: ["Ephemeral"] });
          }

          if (i.customId === 'confirm_removewarn') {
            await i.update({ content: `${config.emojis.loading} Uyarı siliniyor...`, embeds: [], components: [] });

            // Uyarıyı veritabanından sil
            const deletedWarn = await Sanction.findOneAndDelete({ sanctionId: warnId, guildId: interaction.guild.id, type: "Warning" });

            if (!deletedWarn) {
              return i.editReply({
                content: `${config.emojis.cancel} Uyarı zaten silinmiş veya bulunamadı.`,
                components: []
              });
            }

            // Log için yeni bir embed oluştur
            const logEmbed = new EmbedBuilder()
              .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
              .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının \`#${warnId}\` ID'li uyarısı silindi.`)
              .setThumbnail(user.displayAvatarURL())
              .addFields(
                { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
                { name: `${config.emojis.warning} Uyarı ID`, value: `\`#${warnId}\``, inline: true }
              )
              .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
              .setTimestamp();

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
            if (logChannel) {
              await logChannel.send({ embeds: [logEmbed] });
            }

            await i.editReply({
              content: `${config.emojis.success} \`#${warnId}\` ID'li uyarı başarıyla silindi!`,
              components: []
            });

          } else if (i.customId === 'cancel_removewarn') {
            // İşlem iptal edildi
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              embeds: [],
              components: []
            });
          }
          collector.stop();
        });

        collector.on('end', async collected => {
          if (collected.size === 0) {
            try {
              await confirmationMessage.edit({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                embeds: [],
                components: []
              }).catch(() => { });
            } catch (err) {
              return;
            }
          }
        });

      } catch (err) {
        // Silent fail for remove warn errors
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: `${config.emojis.cancel} Uyarı silinirken bir hata oluştu: ${err.message}`,
            flags: ["Ephemeral"]
          });
        } else {
          await interaction.reply({
            content: `${config.emojis.cancel} Uyarı silinirken bir hata oluştu: ${err.message}`,
            flags: ["Ephemeral"]
          });
        }
      }
    }
    if (interaction.options.getSubcommand() === "temizle") {
      const user = interaction.options.getUser("kullanıcı");

      // Kendine işlem yapma kontrolü
      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendi uyarılarını temizleyemezsin.`,
          flags: ["Ephemeral"]
        });
      }

      try {
        // Silinecek uyarı sayısını kontrol et
        const warnCount = await Sanction.countDocuments({
          userId: user.id,
          guildId: interaction.guild.id,
          type: "Warning"
        });

        if (warnCount === 0) {
          return interaction.reply({
            content: `${config.emojis.cancel} **@${user.username}** için uyarı bulunamadı.`,
            flags: ["Ephemeral"]
          });
        }

        // Onay butonu oluşturma
        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_clearwarns')
            .setLabel(`Evet, ${warnCount} Uyarıyı Sil`)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_clearwarns')
            .setLabel('Hayır, İptal Et')
            .setStyle(ButtonStyle.Secondary),
        );

        // Kullanıcıya onay mesajı gönder
        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısının \`${warnCount}\` adet uyarısını temizlemek istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"]
        });

        // Buton etkileşimlerini dinle
        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000 // 30 saniye
        });

        collector.on('collect', async i => {
          if (i.customId === 'confirm_clearwarns') {
            await i.update({ content: `${config.emojis.time} Uyarılar temizleniyor...`, components: [] });

            // Uyarıları sil
            const result = await Sanction.deleteMany({
              userId: user.id,
              guildId: interaction.guild.id,
              type: "Warning"
            });

            // Başarılı silme işlemi için embed oluştur
            const embed = new EmbedBuilder()
              .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
              .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının tüm uyarıları temizlendi.`)
              .setThumbnail(user.displayAvatarURL())
              .addFields(
                { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
                { name: `${config.emojis.info} Silinen Uyarı Sayısı`, value: `${result.deletedCount}`, inline: true }
              )
              .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
              .setTimestamp();

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.logChannels.warnLog);
            if (logChannel) {
              await logChannel.send({ embeds: [embed] });
            }

            // Kullanıcıya bildir
            await i.editReply({
              content: `${config.emojis.success} **@${user.username}** için tüm (\`${result.deletedCount}\`) uyarılar silindi.`,
              components: []
            });

          } else if (i.customId === 'cancel_clearwarns') {
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
              }).catch(() => { });
            } catch (err) {
              return;
            }
          }
        });

      } catch (err) {
        // Silent fail for clear warns errors
        await interaction.reply({
          content: `${config.emojis.cancel} Uyarılar silinirken bir hata oluştu.`,
          flags: ["Ephemeral"]
        });
      }
    }
    if (interaction.options.getSubcommand() === "bilgi") {
      const warnId = interaction.options.getInteger("id");

      try {
        // Uyarıyı bul
        const warn = await Sanction.findOne({
          guildId: interaction.guild.id,
          sanctionId: warnId
        });

        if (!warn) {
          return interaction.reply({
            content: `${config.emojis.cancel} \`#${warnId}\` ID'li kayıt bulunamadı.`,
            flags: ["Ephemeral"]
          });
        }

        // Kullanıcı avatarını al
        let user;
        try {
          user = await interaction.client.users.fetch(warn.userId);
        } catch (err) {
          // Silent fail for user not found errors
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: `${warn.type} Bilgisi - #${warn.sanctionId}`,
            iconURL: user?.displayAvatarURL()
          })
          .setDescription(`**${user ? user.tag : warn.userId}** (\`${warn.userId}\`) kullanıcısına verilen ${warn.type.toLowerCase()} kaydı:`)
          .setThumbnail(user?.displayAvatarURL())
          .addFields(
            { name: `${config.emojis.info} Durum`, value: warn.active ? `${config.emojis.success} Aktif` : `${config.emojis.cancel} Pasif`, inline: true },
            { name: `${config.emojis.moderator} Yetkili`, value: `<@${warn.moderatorId}>`, inline: true },
            { name: `${config.emojis.info} Tarih`, value: `<t:${Math.floor(warn.timestamp.getTime() / 1000)}:F>`, inline: true },
            { name: `${config.emojis.info} Sebep`, value: warn.reason || "Sebep belirtilmemiş", inline: false }
          )
          .setFooter({
            text: "The Shinra | Ateşin Efsanesi",
            iconURL: interaction.guild.iconURL()
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          flags: ["Ephemeral"]
        });

      } catch (err) {
        // Silent fail for warn info errors
        await interaction.reply({
          content: `${config.emojis.cancel} Kayıt görüntülenirken bir hata oluştu.`,
          flags: ["Ephemeral"]
        });
      }
    }
    if (interaction.options.getSubcommand() === "listele") {
      try {
        const user = interaction.options.getUser("kullanıcı");
        const warns = await Sanction.find({
          userId: user.id,
          guildId: interaction.guild.id
        }).sort({ timestamp: -1 });

        if (warns.length === 0) {
          return interaction.reply({
            content: `${config.emojis.cancel} **@${user.username}** için hiç kayıt bulunmuyor.`,
            flags: ["Ephemeral"]
          });
        }

        let page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(warns.length / perPage);

        const generateEmbed = (page) => {
          const start = page * perPage;
          const currentWarns = warns.slice(start, start + perPage);

          return new EmbedBuilder()
            .setAuthor({ name: `${user.username} - Kayıtlar`, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısına ait kayıtlar.`)
            .addFields(
              {
                name: `${config.emojis.warning} Kayıtlar`,
                value: currentWarns.map(w =>
                  `${config.emojis.warning} **ID:** \`#${w.sanctionId}\` | **Tip:** ${w.type} | **Durum:** ${w.active ? `${config.emojis.success} Aktif` : `${config.emojis.cancel} Pasif`}\n` +
                  `${config.emojis.moderator} **Yetkili:** <@${w.moderatorId}> | **Tarih:** <t:${Math.floor(w.timestamp.getTime() / 1000)}:R>\n` +
                  `${config.emojis.info} **Sebep:** ${w.reason || "Sebep belirtilmemiş"}\n`
                ).join("\n")
              }
            )
            .setFooter({
              text: `Sayfa ${page + 1}/${totalPages} • Toplam ${warns.length} kayıt • The Shinra`,
              iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();
        };

        const getButtons = (page) => {
          return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("◀️ Geri")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("İleri ▶️")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === totalPages - 1)
          );
        };

        const message = await interaction.reply({
          embeds: [generateEmbed(page)],
          components: [getButtons(page)],
          flags: ["Ephemeral"]
        });

        const collector = message.createMessageComponentCollector({
          time: 300000 // 5 dakika
        });

        collector.on("collect", async i => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: `${config.emojis.cancel} Bu menü sana ait değil.`,
              flags: ["Ephemeral"]
            });
          }

          if (i.customId === "prev" && page > 0) page--;
          else if (i.customId === "next" && page < totalPages - 1) page++;

          await i.update({
            embeds: [generateEmbed(page)],
            components: [getButtons(page)]
          });
        });

        collector.on("end", () => {
          if (message) {
            message.edit({
              components: [],
              content: `${config.emojis.time} Menü zaman aşımına uğradı.`
            }).catch(() => { });
          }
        });

      } catch (err) {
        // Silent fail for warnings errors
        await interaction.reply({
          content: `${config.emojis.cancel} Kayıtlar görüntülenirken bir hata oluştu.`,
          flags: ["Ephemeral"]
        });
      }
    }
  }
};