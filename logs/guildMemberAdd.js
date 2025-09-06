// logs/guildMemberAdd.js
const { EmbedBuilder, Events } = require("discord.js");
const config = require("../config");
const User = require('../models/User');
const axios = require('axios');
const rateLimiter = require('../utils/rateLimiter');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      if (!member.guild) return;

      // Yeni kullanıcıyı veritabanına ekle
      try {
        const newUser = new User({
          userId: member.id,
          guildId: member.guild.id,
          joinDate: new Date(),
          level: 1,
          xp: 0,
          roles: []
        });
        await newUser.save();
        console.log(`✅ Yeni kullanıcı eklendi: ${member.user.tag}`);
      } catch (err) {
        // Silent fail for user creation errors
      }

      // Hoş geldin mesajı
      const channel = member.guild.channels.cache.get(config.channels.generalChat);
      if (channel) {
        const embed = new EmbedBuilder()
          .setDescription(`${config.emojis.join} Hoş geldin ${member}! The Shinra'ya katıldın ve artık topluluğumuzun bir parçasısın! Anime, manga, oyun ve sohbet dolu bu evrende keyifli vakit geçir, etkinliklere katıl ve yeni arkadaşlıklar kur! ✨🚀`)
          .setColor(65484);
        channel.send({ content: `<@${member.id}>`, embeds: [embed] });
      }

      // FindCord API ile sicil sorgusu
      try {
        const apiKey = process.env.FINDCORD_API;
        if (!apiKey) {
          return;
        }

        // Rate limiting kontrolü (otomatik join için daha gevşek)
        const rateLimit = rateLimiter.checkLimit(`auto_${member.id}`, 'findcord');
        if (!rateLimit.allowed) {
          console.log(`⚠️ Rate limit: ${member.user.tag} için sicil sorgusu atlandı`);
          return;
        }

        const response = await axios.get(`https://app.findcord.com/api/sorgu/${member.id}`, {
          headers: { 'Authorization': apiKey }
        });

        // Record API call for monitoring
        if (member.client.performanceMonitor) {
          member.client.performanceMonitor.recordApiCall('findcord');
        }

        const data = response.data;
        const sicil = data.Sicil || [];
        const memberInfo = data.MemberInfo || {};
        const topName = memberInfo.TopName || "Bilinmiyor";
        const topAge = memberInfo.TopAge || "Bilinmiyor";
        const topSex = memberInfo.TopSex || "Bilinmiyor";

        // Log kanalına sicil bilgilerini gönder
        const logChannel = member.guild.channels.cache.get(config.logChannels.memberJoin);
        if (!logChannel) return;

        // Tek embed: Tüm bilgiler
        const embed = new EmbedBuilder()
          .setAuthor({ 
            name: `${member.user.tag} - Sicil Sorgusu`, 
            iconURL: member.user.displayAvatarURL() 
          })
          .setDescription(`**Kullanıcı:** ${member.user} (\`${member.id}\`)\n**Katılım Tarihi:** <t:${Math.floor(Date.now() / 1000)}:F>`)
          .addFields(
            {
              name: "👤 Kimlik Bilgileri",
              value: `**İsim:** \`${topName}\`\n**Yaş:** \`${topAge}\`\n**Cinsiyet:** \`${topSex}\``,
              inline: true
            },
            {
              name: "📊 Sicil İstatistikleri",
              value: `**Toplam Sicil Kaydı:** \`${sicil.length}\`\n**Son Kayıt:** \`${sicil.length > 0 ? sicil[0].Type : "Yok"}\``,
              inline: true
            }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: member.guild.iconURL() })
          .setTimestamp();

        // Sicil kayıtlarını ekle
        if (sicil.length > 0) {
          const sicilText = sicil.map((record, index) => 
            `${index + 1}. **${record.GuildName}** | **${record.Type || "Bilinmiyor"}** - <t:${Math.floor(record.Date / 1000)}:R>\n> ${record.Reason || "Sebep belirtilmemiş"}`
          ).join('\n');

          embed.addFields({
            name: "📋 Sicil Kayıtları",
            value: sicilText.length > 1024 ? sicilText.substring(0, 1020) + "..." : sicilText,
            inline: false
          });
        } else {
          embed.addFields({
            name: "📋 Sicil Kayıtları",
            value: "Sicil kaydı bulunamadı",
            inline: false
          });
        }

        // Tek embed'i gönder
        await logChannel.send({ embeds: [embed] });

        console.log(`✅ ${member.user.tag} için sicil sorgusu log kanalına gönderildi.`);

      } catch (error) {
        return;
      }

    } catch (err) {
      // Silent fail for guild member add errors
    }
  },
};
