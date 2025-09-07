const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const config = require("../../config.js");
const Giveaway = require("../../models/Giveaway");

// endGiveaway fonksiyonunu tanımla
async function endGiveaway(client, giveawayId) {
  const giveaway = client.giveaways?.get(giveawayId);
  if (!giveaway || !giveaway.active) return;

  giveaway.active = false;
  client.giveaways.set(giveawayId, giveaway);

  // Veritabanından da güncelle
  await Giveaway.findOneAndUpdate(
    { messageId: giveaway.messageId },
    { active: false }
  );

  try {
    const channel = client.channels.cache.get(giveaway.channelId);
    const message = await channel.messages.fetch(giveaway.messageId);
    
    if (giveaway.participants.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.gift} Çekiliş Bitti!`)
        .setDescription(`**Ödül:** ${giveaway.prize}\n**Kazanan Sayısı:** ${giveaway.winnerCount}`)
        .addFields(
          { name: `${config.emojis.member} Katılımcılar`, value: `Kimse katılmadı`, inline: true },
          { name: `${config.emojis.time} Durum`, value: `Bitti`, inline: true }
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: channel.guild.iconURL() })
        .setTimestamp();

      await message.edit({ embeds: [embed], components: [] });
      return;
    }

    // Kazananları seç
    const winners = [];
    const shuffled = [...giveaway.participants].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(giveaway.winnerCount, shuffled.length); i++) {
      winners.push(shuffled[i]);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis.gift} Çekiliş Bitti!`)
      .setDescription(`**Ödül:** ${giveaway.prize}\n**Kazanan Sayısı:** ${giveaway.winnerCount}`)
      .addFields(
        { name: `${config.emojis.member} Kazananlar`, value: winners.map(id => `<@${id}>`).join('\n'), inline: true },
        { name: `${config.emojis.stats} Toplam Katılımcı`, value: `${giveaway.participants.length} kişi`, inline: true },
        { name: `${config.emojis.time} Durum`, value: `Bitti`, inline: true }
      )
      .setFooter({ text: `The Shinra | Ateşin Efsanesi`, iconURL: channel.guild.iconURL() })
      .setTimestamp();

    await message.edit({ embeds: [embed], components: [] });
    
    // Kazananları etiketle
    await channel.send({
      content: `${config.emojis.success} **Tebrikler!** ${winners.map(id => `<@${id}>`).join(', ')} kazandı!`,
      allowedMentions: { users: winners }
    });

  } catch (err) {
    // Mesaj bulunamazsa sessizce geç
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cekilis")
    .setDescription("Çekiliş oluşturur veya yönetir")
    .addSubcommand(subcommand =>
      subcommand
        .setName("baslat")
        .setDescription("Yeni çekiliş başlatır")
        .addStringOption(option =>
          option
            .setName("odul")
            .setDescription("Çekiliş ödülü")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("kazanan_sayisi")
            .setDescription("Kaç kişi kazanacak")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10)
        )
        .addIntegerOption(option =>
          option
            .setName("sure")
            .setDescription("Çekiliş süresi (dakika)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080) // 1 hafta
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("bitir")
        .setDescription("Aktif çekilişi bitirir")
        .addStringOption(option =>
          option
            .setName("mesaj_id")
            .setDescription("Çekiliş mesaj ID'si")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("iptal")
        .setDescription("Aktif çekilişi iptal eder")
        .addStringOption(option =>
          option
            .setName("mesaj_id")
            .setDescription("Çekiliş mesaj ID'si")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      if (!interaction.member.roles.cache.has(config.roles.moderator) && interaction.user.id !== config.roles.ownerUserID) {
        return await interaction.reply({
          content: `${config.emojis.cancel} Bu komutu kullanmak için Moderator rolüne sahip olmalısınız.`,
          flags: ["Ephemeral"]
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "baslat") {
        await handleStart(interaction);
      } else if (subcommand === "bitir") {
        await handleEnd(interaction);
      } else if (subcommand === "iptal") {
        await handleCancel(interaction);
      }

    } catch (err) {
      await interaction.reply({
        content: `${config.emojis.cancel} Çekiliş işlemi sırasında bir hata oluştu.`,
        flags: ["Ephemeral"]
      });
    }
  }
};

async function handleStart(interaction) {
  const prize = interaction.options.getString("odul");
  const winnerCount = interaction.options.getInteger("kazanan_sayisi");
  const duration = interaction.options.getInteger("sure");
  
  // Config'den çekiliş kanalını al, bulunamazsa komut kullanılan kanalı kullan
  let channel = interaction.guild.channels.cache.get(config.channels.giveawayChannel);
  
  if (!channel) {
    channel = interaction.channel;
  }

  const endTime = new Date(Date.now() + duration * 60 * 1000);

  const embed = new EmbedBuilder()
    .setTitle(`${config.emojis.gift} Çekiliş Başladı!`)
    .setDescription(`**Ödül:** ${prize}\n**Kazanan Sayısı:** ${winnerCount}\n**Bitiş:** <t:${Math.floor(endTime.getTime() / 1000)}:R>`)
    .addFields(
      { name: `${config.emojis.member} Katılımcılar`, value: "Henüz kimse katılmadı", inline: true },
      { name: `${config.emojis.time} Durum`, value: `Aktif`, inline: true }
    )
    .setFooter({ text: `The Shinra | Ateşin Efsanesi`, iconURL: interaction.guild.iconURL() })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`cekilis_join_${interaction.id}`)
        .setLabel("Katıl")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎉")
    );

  const message = await channel.send({ 
    content: `<@&${config.roles.giveaway}>`,
    embeds: [embed], 
    components: [row] 
  });

  // Çekiliş verisini veritabanına kaydet
  const giveawayData = new Giveaway({
    messageId: message.id,
    channelId: channel.id,
    guildId: interaction.guild.id,
    prize: prize,
    winnerCount: winnerCount,
    endTime: endTime,
    participants: [],
    creator: interaction.user.id,
    active: true
  });

  await giveawayData.save();

  // RAM'e de ekle (hızlı erişim için)
  if (!interaction.client.giveaways) {
    interaction.client.giveaways = new Map();
  }

  interaction.client.giveaways.set(interaction.id, {
    messageId: message.id,
    channelId: channel.id,
    guildId: interaction.guild.id,
    prize: prize,
    winnerCount: winnerCount,
    endTime: endTime,
    participants: [],
    creator: interaction.user.id,
    active: true
  });

  // Otomatik bitiş için timeout
  setTimeout(async () => {
    await endGiveaway(interaction.client, interaction.id);
  }, duration * 60 * 1000);

  await interaction.reply({
    content: `${config.emojis.success} Çekiliş başarıyla oluşturuldu! [Mesaja git](${message.url})`,
    flags: ["Ephemeral"]
  });
}

async function handleEnd(interaction) {
  const messageId = interaction.options.getString("mesaj_id");
  
  // Çekilişi bul
  let giveaway = null;
  for (const [id, data] of interaction.client.giveaways) {
    if (data.messageId === messageId) {
      giveaway = { id, data };
      break;
    }
  }

  if (!giveaway || !giveaway.data.active) {
    return await interaction.reply({
      content: `${config.emojis.cancel} Geçerli bir çekiliş bulunamadı.`,
      flags: ["Ephemeral"]
    });
  }

  await endGiveaway(interaction.client, giveaway.id);
  await interaction.reply({
    content: `${config.emojis.success} Çekiliş başarıyla bitirildi!`,
    flags: ["Ephemeral"]
  });
}

async function handleCancel(interaction) {
  const messageId = interaction.options.getString("mesaj_id");
  
  // Çekilişi bul
  let giveaway = null;
  for (const [id, data] of interaction.client.giveaways) {
    if (data.messageId === messageId) {
      giveaway = { id, data };
      break;
    }
  }

  if (!giveaway || !giveaway.data.active) {
    return await interaction.reply({
      content: `${config.emojis.cancel} Geçerli bir çekiliş bulunamadı.`,
      flags: ["Ephemeral"]
    });
  }

  // Çekilişi iptal et
  giveaway.data.active = false;
  interaction.client.giveaways.set(giveaway.id, giveaway.data);

  // Mesajı güncelle
  try {
    const channel = interaction.client.channels.cache.get(giveaway.data.channelId);
    const message = await channel.messages.fetch(giveaway.data.messageId);
    
    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis.gift} Çekiliş İptal Edildi`)
      .setDescription(`**Ödül:** ${giveaway.data.prize}\n**Kazanan Sayısı:** ${giveaway.data.winnerCount}`)
      .addFields(
        { name: `${config.emojis.member} Katılımcılar`, value: `${giveaway.data.participants.length} kişi`, inline: true },
        { name: `${config.emojis.time} Durum`, value: `İptal Edildi`, inline: true }
      )
      .setFooter({ text: `The Shinra | Ateşin Efsanesi`, iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await message.edit({ embeds: [embed], components: [] });
  } catch (err) {
    // Mesaj bulunamazsa sessizce geç
  }

  await interaction.reply({
    content: `${config.emojis.success} Çekiliş başarıyla iptal edildi!`,
    flags: ["Ephemeral"]
  });
}

// endGiveaway fonksiyonunu export et
module.exports.endGiveaway = endGiveaway;

