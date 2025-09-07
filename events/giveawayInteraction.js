const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config.js");

// endGiveaway fonksiyonunu import et
const cekilisModule = require("../commands/moderator/cekilis");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('cekilis_join_')) return;

    try {
      const giveawayId = interaction.customId.split('_')[2];
      const giveaway = interaction.client.giveaways?.get(giveawayId);

      if (!giveaway || !giveaway.active) {
        return await interaction.reply({
          content: `${config.emojis.cancel} Bu çekiliş artık aktif değil.`,
          flags: ["Ephemeral"]
        });
      }

      // Çekiliş süresi dolmuş mu kontrol et
      if (new Date() > giveaway.endTime) {
        // Süre dolmuş, çekilişi bitir
        await cekilisModule.endGiveaway(interaction.client, giveawayId);
        return await interaction.reply({
          content: `${config.emojis.cancel} Bu çekilişin süresi dolmuş.`,
          flags: ["Ephemeral"]
        });
      }

      // Zaten katılmış mı kontrol et
      if (giveaway.participants.includes(interaction.user.id)) {
        return await interaction.reply({
          content: `${config.emojis.warning} Zaten bu çekilişe katıldınız!`,
          flags: ["Ephemeral"]
        });
      }

      // Katılımcıyı ekle
      giveaway.participants.push(interaction.user.id);
      interaction.client.giveaways.set(giveawayId, giveaway);

      // Mesajı güncelle
      try {
        const channel = interaction.client.channels.cache.get(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        
        const embed = new EmbedBuilder()
          .setTitle(`${config.emojis.gift} Çekiliş Başladı!`)
          .setDescription(`**Ödül:** ${giveaway.prize}\n**Kazanan Sayısı:** ${giveaway.winnerCount}\n**Bitiş:** <t:${Math.floor(giveaway.endTime.getTime() / 1000)}:R>`)
          .addFields(
            { 
              name: `${config.emojis.member} Katılımcılar`, 
              value: giveaway.participants.length > 0 
                ? `${giveaway.participants.length} kişi katıldı` 
                : "Henüz kimse katılmadı", 
              inline: true 
            },
            { name: `${config.emojis.time} Durum`, value: "Aktif", inline: true }
          )
          .setFooter({ text: `The Shinra | Ateşin Efsanesi`, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`cekilis_join_${giveawayId}`)
              .setLabel("Katıl")
              .setStyle(ButtonStyle.Primary)
              .setEmoji("🎉")
          );

        await message.edit({ embeds: [embed], components: [row] });
      } catch (err) {
        // Mesaj güncellenemezse sessizce geç
      }

      await interaction.reply({
        content: `${config.emojis.success} Çekilişe başarıyla katıldınız!`,
        flags: ["Ephemeral"]
      });

    } catch (err) {
      await interaction.reply({
        content: `${config.emojis.cancel} Çekilişe katılırken bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};
