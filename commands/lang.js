const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lang")
    .setDescription("get server lang"),
  
  async execute(interaction) {

    return interaction.reply(
        content = `${interaction.guild.preferredLocale}`
    )
    }
};