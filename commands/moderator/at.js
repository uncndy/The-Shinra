const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Sanction = require("../../models/Sanction");
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("at")
    .setDescription("Bir kullanıcıyı sunucudan atar ve kaydeder.")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("Atılacak kullanıcı")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("sebep")
        .setDescription("Kick sebebi")
        .setRequired(false)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }

    const user = interaction.options.getUser("kullanıcı");
    const reason = interaction.options.getString("sebep") || "Sebep belirtilmedi";

    // Kullanıcı kontrolleri
    if (user.id === interaction.user.id) {
      return interaction.reply({
        content: `${config.emojis.cancel} Kendini atamazsın.`,
        flags: ["Ephemeral"]
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.reply({
        content: `${config.emojis.cancel} Botu atamazsın.`,
        flags: ["Ephemeral"]
      });
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);

      // Rol hiyerarşisi kontrolü
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: `${config.emojis.cancel} Bu kullanıcıyı atamazsın - rol hiyerarşisi nedeniyle.`,
          flags: ["Ephemeral"]
        });
      }
      
      // Onay butonu oluşturma
      const confirmationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_kick')
          .setLabel('Evet, At')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_kick')
          .setLabel('Hayır, İptal Et')
          .setStyle(ButtonStyle.Secondary),
      );

      // Kullanıcıya onay mesajı gönderme
      const confirmationMessage = await interaction.reply({
        content: `${config.emojis.warning} **@${user.username}** kullanıcısını \`${reason}\` sebebiyle atmak istediğine emin misin?`,
        components: [confirmationRow],
        flags: ["Ephemeral"],
        withResponse: true
      });

      const collector = interaction.channel.createMessageComponentCollector({ 
          filter: i => i.user.id === interaction.user.id, 
          componentType: ComponentType.Button, 
          time: 30000 
      });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({ content: `${config.emojis.cancel} Bu butonu sen kullanamazsın.`, flags: ["Ephemeral"] });
        }

        if (i.customId === 'confirm_kick') {
          // Atma işlemini gerçekleştir
          await i.update({ content: `${config.emojis.time} Kullanıcı atılıyor...`, components: [] });

          await member.kick(reason);

          // Veritabanına kaydet
          const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
          const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;

          const newKick = new Sanction({
            sanctionId,
            type: "Kick",
            guildId: interaction.guild.id,
            userId: user.id,
            moderatorId: interaction.user.id,
            reason,
            active: false
          });
          await newKick.save();

          // Embed oluştur
          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı sunucudan atıldı.`)
            .addFields(
              { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
              { name: `${config.emojis.warning} Kick ID`, value: `\`#${sanctionId}\``, inline: true },
              { name: `${config.emojis.info} Sebep`, value: reason, inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

          // Log kanalına gönder
          const logChannel = interaction.guild.channels.cache.get(config.logChannels.kickLog);
          if (logChannel) logChannel.send({ embeds: [embed] });

          await i.editReply({ 
            content: `> ${config.emojis.success} **@${user.username}** kullanıcısı başarıyla atıldı.`, 
            components: [] 
          });

        } else if (i.customId === 'cancel_kick') {
          await i.update({
            content: `${config.emojis.cancel} İşlem iptal edildi.`,
            components: []
          });
        }
        collector.stop();
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          try {
            await confirmationMessage.edit({
              content: `${config.emojis.time} İşlem zaman aşımına uğradı.`,
              components: []
            });
          } catch (err) {
            return;
          }
        }
      });
      
    } catch (err) {
      // Silent fail for kick errors
      await interaction.editReply({
          content: `${config.emojis.cancel} Kullanıcı atılamadı.`,
          components: []
        });
    }
  }
};