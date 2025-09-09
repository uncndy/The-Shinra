const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const Sanction = require("../../models/Sanction");
const config = require("../../config");
const {components, texts} = require('../../components')

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uyarı")
    .setDescription("Uyarı sistemi komutları.")
    // Alt komut: ekle (warn)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ekle")
        .setDescription("Bir kullanıcıya uyarı verir.")
        .addUserOption((option) =>
          option
            .setName("kullanıcı")
            .setDescription("Uyarılacak kullanıcı.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("sebep")
            .setDescription("Uyarı nedeni.")
            .setRequired(true)
        )
    )
    // Alt komut: sil (removewarn)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sil")
        .setDescription("Belirtilen uyarıyı siler.")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Silinecek uyarı ID'si.")
            .setRequired(true)
        )
    )
    // Alt komut: temizle (clearwarns)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("temizle")
        .setDescription("Bir kullanıcının tüm uyarılarını siler.")
        .addUserOption((option) =>
          option
            .setName("kullanıcı")
            .setDescription("Uyarıları temizlenecek kullanıcı.")
            .setRequired(true)
        )
    )
    // Alt komut: bilgi (warninfo)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bilgi")
        .setDescription("Belirli bir uyarı kaydını gösterir.")
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("Görüntülenecek uyarı ID'si.")
            .setRequired(true)
        )
    )
    // Alt komut: listele (warnings)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("listele")
        .setDescription("Bir kullanıcının tüm uyarılarını listeler.")
        .addUserOption((option) =>
          option
            .setName("kullanıcı")
            .setDescription("Uyarılarını görmek istediğin kullanıcı.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (
      !interaction.member.roles.cache.has(config.roles.moderator) &&
      !interaction.member.roles.cache.has(config.roles.staff) &&
      !interaction.member.roles.cache.has(config.roles.juniorStaff) &&
      interaction.user.id !== config.owners.sphinx
    ) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        components: [texts.tr.modOrStaffOrJrStaffControlText, components.separator]
      });
    }

    // === EKLE ===
    if (interaction.options.getSubcommand() === "ekle") {
      const user = interaction.options.getUser("kullanıcı");
      const reason = interaction.options.getString("sebep");

      if (user.id === interaction.user.id)
        return interaction.reply({
          content: `${config.emojis.cancel} Kendine uyarı veremezsin.`,
          flags: ["Ephemeral"],
        });

      if (user.id === interaction.client.user.id)
        return interaction.reply({
          content: `${config.emojis.cancel} Bota uyarı veremezsin.`,
          flags: ["Ephemeral"],
        });

      try {
        const member = await interaction.guild.members.fetch(user.id);
        if (
          member &&
          member.roles.highest.position >=
            interaction.member.roles.highest.position
        ) {
          return interaction.reply({
            content: `${config.emojis.cancel} Bu kullanıcıya uyarı veremezsin (rol hiyerarşisi).`,
            flags: ["Ephemeral"],
          });
        }

        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_warn")
            .setLabel("Evet, Uyar")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_warn")
            .setLabel("Hayır, İptal Et")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısına \`${reason}\` sebebiyle uyarı vermek istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"],
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.customId === "confirm_warn") {
            await i.update({
              content: `${config.emojis.time} Kullanıcı uyarılıyor...`,
              components: [],
            });

            const lastSanction = await Sanction.findOne({
              guildId: interaction.guild.id,
            }).sort({ sanctionId: -1 });
            const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

            const newWarn = new Sanction({
              sanctionId,
              type: "Warning",
              guildId: interaction.guild.id,
              userId: user.id,
              moderatorId: interaction.user.id,
              reason,
              active: true,
            });
            await newWarn.save();

            const embed = new EmbedBuilder()
              .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
              })
              .setDescription(
                `${user.tag} (\`${user.id}\`) kullanıcısına uyarı verildi.`
              )
              .addFields(
                {
                  name: `${config.emojis.moderator} Moderator`,
                  value: `<@${interaction.user.id}>`,
                  inline: true,
                },
                {
                  name: `${config.emojis.warning} Uyarı ID`,
                  value: `\`#${sanctionId}\``,
                  inline: true,
                },
                {
                  name: `${config.emojis.info} Sebep`,
                  value: reason,
                  inline: true,
                }
              )
              .setThumbnail(user.displayAvatarURL())
              .setFooter({
                text: "The Shinra | Ateşin Efsanesi",
                iconURL: interaction.guild.iconURL(),
              })
              .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get(
              config.logChannels.warnLog
            );
            if (logChannel) await logChannel.send({ embeds: [embed] });

            await i.editReply({
              content: `${config.emojis.success} **@${user.username}** kullanıcısı \`#${sanctionId}\` ID ile uyarıldı!`,
            });
          } else if (i.customId === "cancel_warn") {
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              components: [],
            });
          }
          collector.stop();
        });

        collector.on("end", async (collected) => {
          if (collected.size === 0) {
            await interaction
              .editReply({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                components: [],
              })
              .catch(() => {});
          }
        });
      } catch {
        return interaction.reply({
          content: `${config.emojis.cancel} Uyarı eklenirken hata oluştu.`,
          flags: ["Ephemeral"],
        });
      }
    }
    // === SİL ===
    if (interaction.options.getSubcommand() === "sil") {
      const warnId = interaction.options.getInteger("id");

      try {
        // Uyarıyı bul
        const warn = await Sanction.findOne({
          sanctionId: warnId,
          guildId: interaction.guild.id,
          type: "Warning",
        });

        if (!warn) {
          return interaction.reply({
            content: `${config.emojis.cancel} \`#${warnId}\` ID'li uyarı bulunamadı veya türü 'Warning' değil.`,
            flags: ["Ephemeral"],
          });
        }

        // Kullanıcı bilgisi
        let user;
        try {
          user = await interaction.client.users.fetch(warn.userId);
        } catch {
          user = {
            username: "Bilinmiyor",
            tag: warn.userId,
            displayAvatarURL: () => null,
          };
        }

        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_removewarn")
            .setLabel("Evet, Sil")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_removewarn")
            .setLabel("Hayır, İptal Et")
            .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
          .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
          .setDescription(
            `${user.tag} (\`${user.id}\`) kullanıcısının \`#${warn.sanctionId}\` ID'li uyarısını silmek istediğine emin misin?`
          )
          .addFields({
            name: `${config.emojis.warning} Uyarı`,
            value: `${
              warn.active ? config.emojis.success : config.emojis.cancel
            } | \`#${warn.sanctionId}\` ${warn.type} - <t:${Math.floor(
              warn.timestamp.getTime() / 1000
            )}:R>\n> **Moderatör:** <@${warn.moderatorId}>\n> **Sebep:** ${
              warn.reason || "Sebep belirtilmemiş"
            }`,
          })
          .setThumbnail(user.displayAvatarURL())
          .setFooter({
            text: "The Shinra | Ateşin Efsanesi",
            iconURL: interaction.guild.iconURL(),
          })
          .setTimestamp();

        const confirmationMessage = await interaction.reply({
          embeds: [embed],
          components: [confirmationRow],
          flags: ["Ephemeral"],
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.customId === "confirm_removewarn") {
            await i.update({
              content: `${config.emojis.time} Uyarı siliniyor...`,
              embeds: [],
              components: [],
            });

            const deletedWarn = await Sanction.findOneAndDelete({
              sanctionId: warnId,
              guildId: interaction.guild.id,
              type: "Warning",
            });

            if (!deletedWarn) {
              return i.editReply({
                content: `${config.emojis.cancel} Uyarı zaten silinmiş veya bulunamadı.`,
                components: [],
              });
            }

            const logEmbed = new EmbedBuilder()
              .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
              })
              .setDescription(
                `${user.tag} (\`${user.id}\`) kullanıcısının \`#${warnId}\` ID'li uyarısı silindi.`
              )
              .addFields(
                {
                  name: `${config.emojis.moderator} Sorumlu Moderator`,
                  value: `<@${interaction.user.id}>`,
                  inline: true,
                },
                {
                  name: `${config.emojis.warning} Uyarı ID`,
                  value: `\`#${warnId}\``,
                  inline: true,
                }
              )
              .setThumbnail(user.displayAvatarURL())
              .setFooter({
                text: "The Shinra | Ateşin Efsanesi",
                iconURL: interaction.guild.iconURL(),
              })
              .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get(
              config.logChannels.warnLog
            );
            if (logChannel) await logChannel.send({ embeds: [logEmbed] });

            await i.editReply({
              content: `${config.emojis.success} \`#${warnId}\` ID'li uyarı başarıyla silindi!`,
              components: [],
            });
          } else if (i.customId === "cancel_removewarn") {
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              components: [],
            });
          }
          collector.stop();
        });

        collector.on("end", async (collected) => {
          if (collected.size === 0) {
            await confirmationMessage
              .edit({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                components: [],
              })
              .catch(() => {});
          }
        });
      } catch (err) {
        return interaction.reply({
          content: `${config.emojis.cancel} Uyarı silinirken bir hata oluştu: ${err.message}`,
          flags: ["Ephemeral"],
        });
      }
    }

    // === BİLGİ ===
    if (interaction.options.getSubcommand() === "bilgi") {
      const warnId = interaction.options.getInteger("id");

      try {
        // Uyarıyı veritabanından al
        const warn = await Sanction.findOne({
          guildId: interaction.guild.id,
          sanctionId: warnId,
        });

        if (!warn) {
          return interaction.reply({
            content: `${config.emojis.cancel} \`#${warnId}\` ID'li kayıt bulunamadı.`,
            flags: ["Ephemeral"],
          });
        }

        // Kullanıcı bilgisi
        let user;
        try {
          user = await interaction.client.users.fetch(warn.userId);
        } catch {
          user = {
            username: "Bilinmiyor",
            tag: warn.userId,
            displayAvatarURL: () => null,
          };
        }

        const embed = new EmbedBuilder()
          .setAuthor({
            name: `${warn.type} Bilgisi - #${warn.sanctionId}`,
            iconURL: user.displayAvatarURL(),
          })
          .setDescription(
            `**${user.tag}** (\`${warn.userId}\`) kullanıcısına verilen \`#${
              warn.sanctionId
            }\` ID'li ${warn.type.toLowerCase()} kaydı:`
          )
          .setThumbnail(user.displayAvatarURL())
          .addFields({
            name: `${config.emojis.warning} Uyarı`,
            value: `${
              warn.active ? config.emojis.success : config.emojis.cancel
            } | \`#${warn.sanctionId}\` ${warn.type} - <t:${Math.floor(
              warn.timestamp.getTime() / 1000
            )}:R>\n> **Moderatör:** <@${warn.moderatorId}>\n> **Sebep:** ${
              warn.reason || "Sebep belirtilmemiş"
            }`,
          })
          .setFooter({
            text: "The Shinra | Ateşin Efsanesi",
            iconURL: interaction.guild.iconURL(),
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          flags: ["Ephemeral"],
        });
      } catch (err) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kayıt görüntülenirken bir hata oluştu: ${err.message}`,
          flags: ["Ephemeral"],
        });
      }
    }
    // === LİSTELE ===
    if (interaction.options.getSubcommand() === "listele") {
      try {
        const user = interaction.options.getUser("kullanıcı");
        const warns = await Sanction.find({
          userId: user.id,
          guildId: interaction.guild.id,
        }).sort({ timestamp: -1 });

        if (warns.length === 0) {
          return interaction.reply({
            content: `${config.emojis.cancel} **@${user.username}** için hiç uyarı bulunmuyor.`,
            flags: ["Ephemeral"],
          });
        }

        let page = 0;
        const perPage = 5;
        const totalPages = Math.ceil(warns.length / perPage);

        const generateEmbed = (page) => {
          const start = page * perPage;
          const currentWarns = warns.slice(start, start + perPage);

          return new EmbedBuilder()
            .setAuthor({
              name: `${user.username} - Uyarı Kayıtları`,
              iconURL: user.displayAvatarURL(),
            })
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setDescription(
              `${user.tag} (\`${user.id}\`) kullanıcısına ait uyarılar:`
            )
            .addFields({
              name: `${config.emojis.warning} Son Uyarılar`,
              value: currentWarns
                .map((w) => {
                  return `${config.emojis.info} ${
                    w.active ? config.emojis.success : config.emojis.cancel
                  } | \`#${w.sanctionId}\` ${w.type} - <t:${Math.floor(
                    w.timestamp.getTime() / 1000
                  )}:R>\n> **Moderatör:** <@${w.moderatorId}>\n> **Sebep:** ${
                    w.reason || "Sebep belirtilmemiş"
                  }\n`;
                })
                .join("\n"),
            })
            .setFooter({
              text: `Sayfa ${page + 1}/${totalPages} • Toplam ${
                warns.length
              } uyarı • The Shinra`,
              iconURL: interaction.guild.iconURL(),
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
          flags: ["Ephemeral"],
        });

        const collector = message.createMessageComponentCollector({
          time: 300000, // 5 dakika
        });

        collector.on("collect", async (i) => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({
              content: `${config.emojis.cancel} Bu menü sana ait değil.`,
              flags: ["Ephemeral"],
            });
          }

          if (i.customId === "prev" && page > 0) page--;
          else if (i.customId === "next" && page < totalPages - 1) page++;

          await i.update({
            embeds: [generateEmbed(page)],
            components: [getButtons(page)],
          });
        });

        collector.on("end", () => {
          if (message) {
            message
              .edit({
                components: [],
                content: `${config.emojis.time} Menü zaman aşımına uğradı.`,
              })
              .catch(() => {});
          }
        });
      } catch (err) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kayıtlar görüntülenirken bir hata oluştu: ${err.message}`,
          flags: ["Ephemeral"],
        });
      }
    }
    // === TEMİZLE ===
    if (interaction.options.getSubcommand() === "temizle") {
      const user = interaction.options.getUser("kullanıcı");

      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: `${config.emojis.cancel} Kendi uyarılarını temizleyemezsin.`,
          flags: ["Ephemeral"],
        });
      }

      try {
        const warnCount = await Sanction.countDocuments({
          userId: user.id,
          guildId: interaction.guild.id,
          type: "Warning",
        });

        if (warnCount === 0) {
          return interaction.reply({
            content: `${config.emojis.cancel} **@${user.username}** için hiç uyarı bulunamadı.`,
            flags: ["Ephemeral"],
          });
        }

        const confirmationRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_clearwarns")
            .setLabel(`Evet, ${warnCount} uyarıyı sil`)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_clearwarns")
            .setLabel("Hayır, iptal et")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: `${config.emojis.warning} **@${user.username}** kullanıcısının \`${warnCount}\` adet uyarısını temizlemek istediğine emin misin?`,
          components: [confirmationRow],
          flags: ["Ephemeral"],
        });

        const filter = (i) => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          componentType: ComponentType.Button,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.customId === "confirm_clearwarns") {
            await i.update({
              content: `${config.emojis.time} Uyarılar temizleniyor...`,
              components: [],
            });

            const result = await Sanction.deleteMany({
              userId: user.id,
              guildId: interaction.guild.id,
              type: "Warning",
            });

            const embed = new EmbedBuilder()
              .setAuthor({
                name: user.username,
                iconURL: user.displayAvatarURL(),
              })
              .setDescription(
                `${user.tag} (\`${user.id}\`) kullanıcısının tüm uyarıları temizlendi.`
              )
              .setThumbnail(user.displayAvatarURL())
              .addFields(
                {
                  name: `${config.emojis.moderator} Sorumlu Moderator`,
                  value: `<@${interaction.user.id}>`,
                  inline: true,
                },
                {
                  name: `${config.emojis.info} Silinen Uyarı Sayısı`,
                  value: `${result.deletedCount}`,
                  inline: true,
                }
              )
              .setFooter({
                text: "The Shinra | Ateşin Efsanesi",
                iconURL: interaction.guild.iconURL(),
              })
              .setTimestamp();

            const logChannel = interaction.guild.channels.cache.get(
              config.logChannels.warnLog
            );
            if (logChannel) await logChannel.send({ embeds: [embed] });

            await i.editReply({
              content: `${config.emojis.success} **@${user.username}** için tüm (\`${result.deletedCount}\`) uyarılar silindi.`,
              components: [],
            });
          } else if (i.customId === "cancel_clearwarns") {
            await i.update({
              content: `${config.emojis.cancel} İşlem iptal edildi.`,
              components: [],
            });
          }
          collector.stop();
        });

        collector.on("end", async (collected) => {
          if (collected.size === 0) {
            await interaction
              .editReply({
                content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
                components: [],
              })
              .catch(() => {});
          }
        });
      } catch (err) {
        return interaction.reply({
          content: `${config.emojis.cancel} Uyarılar silinirken bir hata oluştu: ${err.message}`,
          flags: ["Ephemeral"],
        });
      }
    }
  },
};
