const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");
const axios = require('axios');
const rateLimiter = require('../../utils/rateLimiter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorgu")
    .setDescription("Kullanıcı sicil bilgilerini sorgular")
    .addUserOption(option =>
      option.setName("kullanıcı")
        .setDescription("Sorgulanacak kullanıcı")
        .setRequired(true)
    ),

  async execute(interaction) {
    // Yetki kontrolü
    if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && !interaction.member.roles.cache.has(config.roles.juniorStaff) && interaction.user.id !== config.roles.ownerUserID) {
      return interaction.reply({
        content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff, Junior Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
        flags: ["Ephemeral"]
      });
    }

    // Rate limiting kontrolü
    const rateLimit = rateLimiter.checkLimit(interaction.user.id, 'findcord');
    if (!rateLimit.allowed) {
      const resetTime = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      return interaction.reply({
        content: `${config.emojis.time} Rate limit aşıldı! ${resetTime} saniye sonra tekrar deneyin.`,
        flags: ["Ephemeral"]
      });
    }

    try {
      const apiKey = process.env.FINDCORD_API;
      if (!apiKey) {
        return interaction.reply({
          content: `${config.emojis.cancel} FindCord API key'i ayarlanmamış. Lütfen .env dosyasında FINDCORD_API değerini ayarlayın.`,
          flags: ["Ephemeral"]
        });
      }

      await interaction.deferReply({ flags: ["Ephemeral"] });

      const user = interaction.options.getUser("kullanıcı");
      
      try {
        const response = await axios.get(`https://app.findcord.com/api/sorgu/${user.id}`, {
            headers: {
                'Authorization': apiKey
            }
        });

        // Record API call for monitoring
        if (interaction.client.performanceMonitor) {
          interaction.client.performanceMonitor.recordApiCall('findcord');
        }

        const data = response.data;

        // Cache'e kaydet (5 dakika)
        if (!interaction.client.sicilCache) interaction.client.sicilCache = new Map();
        interaction.client.sicilCache.set(user.id, data);
        setTimeout(() => interaction.client.sicilCache?.delete(user.id), 5 * 60 * 1000);

        // Sorgu API verilerini çıkar
        const sicil = data.Sicil || [];
        const memberInfo = data.MemberInfo || {};
        const topName = memberInfo.TopName || "Bilinmiyor";
        const topAge = memberInfo.TopAge || "Bilinmiyor";
        const topSex = memberInfo.TopSex || "Bilinmiyor";

        // Discord kullanıcısının avatarını al
        let userAvatar = null;
        let discordUser = null;
        try {
          discordUser = await interaction.client.users.fetch(user.id);
          userAvatar = discordUser.displayAvatarURL({ dynamic: true, size: 256 });
        } catch (error) {
        }

        // Tek embed: Tüm bilgiler
        const embed = new EmbedBuilder()
          .setAuthor({ 
            name: `${discordUser ? discordUser.tag : 'Bilinmeyen Kullanıcı'} - ${user.tag} Sicil Sorgusu`, 
            iconURL: userAvatar || interaction.guild.iconURL() 
          })
          .setDescription(`**Kullanıcı ID:** \`${user.id}\``)
          .addFields(
            {
              name: `${config.emojis.member} Kimlik Bilgileri`,
              value: `**İsim:** \`${topName}\`\n**Yaş:** \`${topAge}\`\n**Cinsiyet:** \`${topSex}\``,
              inline: true
            },
            {
              name: `${config.emojis.stats} Sicil İstatistikleri`,
              value: `**Toplam Sicil Kaydı:** \`${sicil.length}\`\n**Son Kayıt:** \`${sicil.length > 0 ? sicil[0].Type : "Yok"}\``,
              inline: true
            }
          )
          .setThumbnail(userAvatar || interaction.guild.iconURL())
          .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        // Sicil kayıtlarını ekle
        if (sicil.length > 0) {
          const sicilText = sicil.map((record, index) => 
            `${index + 1}. **${record.GuildName}** | **${record.Type || "Bilinmiyor"}** - <t:${Math.floor(record.Date / 1000)}:R>\n> ${record.Reason || "Sebep belirtilmemiş"}`
          ).join('\n');

          embed.addFields({
            name: `${config.emojis.edit} Sicil Kayıtları`,
            value: sicilText.length > 1024 ? sicilText.substring(0, 1020) + "..." : sicilText,
            inline: false
          });
        } else {
          embed.addFields({
            name: `${config.emojis.edit} Sicil Kayıtları`,
            value: "Sicil kaydı bulunamadı",
            inline: false
          });
        }

        // Tek embed'i gönder
        await interaction.editReply({
          embeds: [embed]
        });

      } catch (apiError) {
        return await interaction.editReply({
          content: `${config.emojis.cancel} Sorgu API isteği başarısız: ${apiError.response?.status || 'Bilinmeyen hata'}`
        });
      }

    } catch (err) {
      try {
        await interaction.editReply({
          content: `${config.emojis.cancel} API sorgusu sırasında bir hata oluştu: ${err.message}`
        });
      } catch (replyError) {
        // Silent fail for reply errors
      }
    }
  }
};
