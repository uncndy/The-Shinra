const { SlashCommandBuilder } = require("discord.js");
const Question = require("../models/Question.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("delquestion")
    .setDescription("Soru siler (Admin)")
    .addIntegerOption(option =>
      option.setName("id")
        .setDescription("Silinecek sorunun ID'si (qId)")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Admin kontrolü
    if (!interaction.member.permissions.has("ManageGuild")) {
      return interaction.reply({ content: "Bu komutu kullanamazsınız.", ephemeral: true });
    }

    const qId = interaction.options.getInteger("id"); // integer olarak alıyoruz
    try {
      const deleted = await Question.findOneAndDelete({ guildId: interaction.guild.id, qId });
      if (!deleted) {
        return interaction.reply({ content: `❌ Bu ID (${qId}) ile bir soru bulunamadı.`, ephemeral: true });
      }

      return interaction.reply({ content: `✅ Soru silindi: "${deleted.text}" (ID: ${deleted.qId})`, ephemeral: true });
    } catch (err) {
      console.error("Soru silme hatası:", err);
      return interaction.reply({ content: "❌ Soru silinirken bir hata oluştu.", ephemeral: true });
    }
  }
};
