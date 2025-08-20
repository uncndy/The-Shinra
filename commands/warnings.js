const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Warn = require("../models/Warn");
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Bir kullanıcının uyarılarını gösterir")
    .addUserOption(option =>
      option.setName("kullanici")
        .setDescription("Uyarılarını görmek istediğin kullanıcı")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator)) {
      return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.", 
        flags: ["Ephemeral"] 
      });
    }

    try {
      const user = interaction.options.getUser("kullanici");
      const warns = await Warn.find({ 
        userId: user.id, 
        guildId: interaction.guild.id 
      }).sort({ date: -1 });

      if (warns.length === 0) {
        return interaction.reply({ 
          content: `❌ **@${user.username}** için hiç kayıt bulunmuyor.`, 
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
          .setDescription(
            currentWarns.map(w =>
              `**ID:** \`#${w.warnId}\` | **Tip:** ${w.type} | **Durum:** ${w.active ? "🟢" : "🔴"}\n` +
              `**Yetkili:** <@${w.moderatorId}> | **Tarih:** <t:${Math.floor(w.date.getTime()/1000)}:R>\n` +
              `**Sebep:** ${w.reason || "Sebep belirtilmemiş"}\n`
            ).join("\n")
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
            .setLabel("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️")
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
            content: "❌ Bu menü sana ait değil.", 
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
            content: "⏰ Menü zaman aşımına uğradı."
          }).catch(() => {});
        }
      });

    } catch (err) {
      console.error("Warnings hatası:", err);
      await interaction.reply({ 
        content: "❌ Kayıtlar görüntülenirken bir hata oluştu.", 
        flags: ["Ephemeral"] 
      });
    }
  }
};