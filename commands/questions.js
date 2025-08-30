const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Question = require("../models/Question.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("questions")
    .setDescription("Veritabanındaki tüm soruları listeler (sayfalı)"),

  async execute(interaction) {
    try {
      const questions = await Question.find({ guildId: interaction.guild.id }).sort({ qId: 1 });
      if (!questions.length) {
        return interaction.reply({ content: "Veritabanında hiç soru yok.", ephemeral: true });
      }

      const pageSize = 5;
      let page = 0;
      const maxPage = Math.ceil(questions.length / pageSize) - 1;

      const generateEmbed = (page) => {
        const start = page * pageSize;
        const end = start + pageSize;
        const pageQuestions = questions.slice(start, end);

        return new EmbedBuilder()
          .setAuthor({ name: "Veritabanındaki Sorular", iconURL: interaction.guild.iconURL() })
          .setDescription(pageQuestions.map(q => `\`${q.qId}\` — ${q.text}`).join("\n"))
          .setFooter({ text: `Sayfa ${page + 1} / ${maxPage + 1} | Toplam ${questions.length} soru`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();
      };

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
          new ButtonBuilder().setCustomId("next").setLabel("➡️ İleri").setStyle(ButtonStyle.Primary).setDisabled(page === maxPage)
        );

      const msg = await interaction.reply({ embeds: [generateEmbed(page)], components: [row], fetchReply: true });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 }); // 2 dakika

      collector.on("collect", async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: "Bu butonu sen kullanamazsın.", ephemeral: true });
        }

        if (i.customId === "prev") page--;
        if (i.customId === "next") page++;

        await i.update({ embeds: [generateEmbed(page)], components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
              new ButtonBuilder().setCustomId("next").setLabel("İleri ▶️").setStyle(ButtonStyle.Primary).setDisabled(page === maxPage)
            )
        ]});
      });

      collector.on("end", async () => {
        // Süre dolunca butonları pasif yap
        await msg.edit({ components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Primary).setDisabled(true),
              new ButtonBuilder().setCustomId("next").setLabel("➡️ İleri").setStyle(ButtonStyle.Primary).setDisabled(true)
            )
        ]});
      });

    } catch (err) {
      console.error("Soruları listeleme hatası:", err);
      await interaction.reply({ content: "Sorular listelenirken bir hata oluştu.", ephemeral: true });
    }
  }
};
