const cooldowns = new Map();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // COOLDOWN KONTROLÜ
    if (command.cooldown) {
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(command.data.name);
      const cooldownAmount = command.cooldown;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {
          const kalan = expirationTime - now;
          const saat = Math.floor(kalan / 3600000);
          const dakika = Math.floor((kalan % 3600000) / 60000);
          try {
            return await interaction.reply({
              content: `⏳ Bu komutu tekrar kullanabilmek için **${saat} saat ${dakika} dakika** beklemelisin.`,
              flags: ["Ephemeral"]
            });
          } catch (replyError) {
            // Silent fail for cooldown reply errors
            return;
          }
        }
      }
      timestamps.set(interaction.user.id, now);
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
        } else {
          await interaction.reply({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
        }
      } catch (replyError) {
        // Silent fail for reply errors
        console.error('Interaction reply error:', replyError.message);
      }
    }
  }
};