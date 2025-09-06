const cooldowns = new Map();
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");

// Moderasyon buton handler fonksiyonları
async function handleModConfirm(interaction, client) {
  // Moderasyon onay butonu
  await interaction.editReply({
    content: `${config.emojis.success} Moderasyon işlemi onaylandı.`,
    components: []
  });
}

async function handleModCancel(interaction, client) {
  // Moderasyon iptal butonu
  await interaction.editReply({
    content: `${config.emojis.cancel} Moderasyon işlemi iptal edildi.`,
    components: []
  });
}

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // Buton etkileşimi kontrolü
    if (interaction.isButton()) {
      // Moderasyon komutları butonları (30 saniye süreli)
      if (interaction.customId.startsWith('mod_')) {
        try {
          await interaction.deferUpdate();
          
          // Moderasyon buton işlemleri
          const modType = interaction.customId.split('_')[1];
          
          switch (modType) {
            case 'confirm':
              await handleModConfirm(interaction, client);
              break;
            case 'cancel':
              await handleModCancel(interaction, client);
              break;
            default:
              await interaction.editReply({
                content: `${config.emojis.cancel} Bilinmeyen moderasyon butonu.`,
                components: []
              });
          }
        } catch (error) {
          try {
            if (interaction.deferred) {
              await interaction.editReply({
                content: `${config.emojis.cancel} Moderasyon işlemi sırasında hata oluştu.`
              });
            }
          } catch (replyError) {
            // Silent fail for reply errors
          }
        }
        return;
      }
    }

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
          return await interaction.reply({
            content: `⏳ Bu komutu tekrar kullanabilmek için **${saat} saat ${dakika} dakika** beklemelisin.`,
            flags: ["Ephemeral"]
          });
        }
      }
      timestamps.set(interaction.user.id, now);
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
      } else {
        await interaction.reply({ content: "❌ Komut çalıştırılırken hata oluştu.", flags: ["Ephemeral"] });
      }
    }
  }
};