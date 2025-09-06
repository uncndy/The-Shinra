const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Question = require("../../models/Question");
const config = require("../../config.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("soru")
    .setDescription("Soru veritabanı ile ilgili komutlar.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("ekle")
        .setDescription("Veritabanına yeni bir soru ekler.")
        .addStringOption(option =>
          option.setName("metin")
            .setDescription("Eklenecek soru metni.")
            .setRequired(true)))
    // Alt komut: soru sil
    .addSubcommand(subcommand =>
      subcommand
        .setName("sil")
        .setDescription("Veritabanından bir soruyu siler.")
        .addIntegerOption(option =>
          option.setName("id")
            .setDescription("Silinecek sorunun ID'si (qId).")
            .setRequired(true)))
    // Alt komut: soruları listele
    .addSubcommand(subcommand =>
      subcommand
        .setName("listele")
        .setDescription("Veritabanındaki tüm soruları listeler (sayfalı).")),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }
    if (interaction.options.getSubcommand() === "ekle") {
      const text = interaction.options.getString("metin");
      try {
        const lastQuestion = await Question.findOne({ guildId: interaction.guild.id }).sort({ qId: -1 });
        const nextQId = lastQuestion && !isNaN(parseInt(lastQuestion.qId)) ? parseInt(lastQuestion.qId) + 1 : 1;

        const question = new Question({ text, qId: nextQId, guildId: interaction.guild.id });
        await question.save();

        return interaction.reply({ content: `${config.emojis.success} Soru eklendi: **${text}** (\`${nextQId}\`)`, flags: 1 << 6 });
      } catch (err) {
        // Silent fail for question add errors
        return interaction.reply({ content: `${config.emojis.cancel} Soru eklenirken bir hata oluştu.`, flags: ["Ephemeral"] });
      }
    }
    if (interaction.options.getSubcommand() === "sil") {
      const qId = interaction.options.getInteger("id"); // integer olarak alıyoruz
      try {
        const deleted = await Question.findOneAndDelete({ guildId: interaction.guild.id, qId });
        if (!deleted) {
          return interaction.reply({ content: `${config.emojis.cancel} Bu ID (${qId}) ile bir soru bulunamadı.`, flags: ["Ephemeral"] });
        }

        return interaction.reply({ content: `${config.emojis.success} \`${deleted.qId}\` "${deleted.text}" **silindi**.`, flags: ["Ephemeral"] });
      } catch (err) {
        // Silent fail for question delete errors
        return interaction.reply({ content: `${config.emojis.cancel} Soru silinirken bir hata oluştu.`, flags: ["Ephemeral"] });
      }
    }
    if (interaction.options.getSubcommand() === "listele") {
      try {
        const questions = await Question.find({ guildId: interaction.guild.id }).sort({ qId: 1 });
        if (!questions.length) {
          return interaction.reply({ content: `${config.emojis.cancel} Veritabanında hiç soru yok.`, flags: ["Ephemeral"] });
        }

        const pageSize = 5;
        let page = 0;
        const maxPage = Math.ceil(questions.length / pageSize) - 1;

        const generateEmbed = (page) => {
          const start = page * pageSize;
          const end = start + pageSize;
          const pageQuestions = questions.slice(start, end);

          return new EmbedBuilder()
            .setAuthor({ name: `${interaction.guild.name} - sorular`, iconURL: interaction.guild.iconURL() })
            .setDescription(`${interaction.guild.name} (\`${interaction.guild.id}\`) sunucusuna ait veritabanındaki tüm sorular.`)
            .addFields({ name: `${config.emojis.question} Sorular`, value: pageQuestions.map(q => `\`${q.qId}\` — ${q.text}`).join("\n"), inline: true })
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({ text: `Sayfa ${page + 1} / ${maxPage + 1} | Toplam ${questions.length} soru`, iconURL: interaction.guild.iconURL() })
            .setTimestamp();
        };

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId("next").setLabel("İleri ▶️").setStyle(ButtonStyle.Secondary).setDisabled(page === maxPage)
          );

        const msg = await interaction.reply({ embeds: [generateEmbed(page)], components: [row], withResponse: true });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 }); // 2 dakika

        collector.on("collect", async i => {
          if (i.user.id !== interaction.user.id) {
            return i.reply({ content: `${config.emojis.cancel} Bu butonu sen kullanamazsın.`, flags: ["Ephemeral"] });
          }

          if (i.customId === "prev") page--;
          if (i.customId === "next") page++;

          await i.update({
            embeds: [generateEmbed(page)], components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                  new ButtonBuilder().setCustomId("next").setLabel("İleri ▶️").setStyle(ButtonStyle.Primary).setDisabled(page === maxPage)
                )
            ]
          });
        });

        collector.on("end", async () => {
          // Süre dolunca butonları pasif yap
          await msg.edit({
            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder().setCustomId("prev").setLabel("⬅️ Geri").setStyle(ButtonStyle.Primary).setDisabled(true),
                  new ButtonBuilder().setCustomId("next").setLabel("İleri ▶️").setStyle(ButtonStyle.Primary).setDisabled(true)
                )
            ]
          });
        });

      } catch (err) {
        // Silent fail for question list errors
        await interaction.reply({ content: `${config.emojis.cancel} Sorular listelenirken bir hata oluştu.`, flags: ["Ephemeral"] });
      }
    }
  }
};
