const { SlashCommandBuilder } = require("discord.js");
const Question = require("../models/Question.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addquestion")
    .setDescription("Yeni soru ekler (Admin)")
    .addStringOption(option =>
      option.setName("soru")
        .setDescription("Eklenecek soru")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has("ManageGuild")) {
      return interaction.reply({ content: "Bu komutu kullanamazsınız.", ephemeral: true });
    }

    const text = interaction.options.getString("soru");

    // En yüksek qId'yi bul ve güvenli bir şekilde bir arttır
    const lastQuestion = await Question.findOne({ guildId: interaction.guild.id }).sort({ qId: -1 });
    const nextQId = lastQuestion && !isNaN(parseInt(lastQuestion.qId)) ? parseInt(lastQuestion.qId) + 1 : 1;

    const question = new Question({ text, qId: nextQId, guildId: interaction.guild.id });
    await question.save();

    return interaction.reply({ content: `✅ Soru eklendi: "${text}" (ID: ${nextQId})`, ephemeral: true });
  }
};
