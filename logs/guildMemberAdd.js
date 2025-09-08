// logs/guildMemberAdd.js
const { EmbedBuilder, Events } = require("discord.js");
const config = require("../config");
const User = require('../models/User');
const axios = require('axios');
const rateLimiter = require('../utils/rateLimiter');
const AntiRaidSystem = require('../utils/antiRaid');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      if (!member.guild) return;

      // Anti-raid kontrolü
      if (member.client.antiRaid) {
        await member.client.antiRaid.checkRaid(member);
      }

      // Yeni kullanıcıyı veritabanına ekle (önce kontrol et)
      try {
        // Önce kullanıcının veritabanında olup olmadığını kontrol et
        const existingUser = await User.findOne({ 
          userId: member.id, 
          guildId: member.guild.id 
        });

        if (!existingUser) {
          // Kullanıcı yoksa yeni oluştur
          const newUser = new User({
            userId: member.id,
            guildId: member.guild.id,
            joinDate: new Date(),
            level: 1,
            xp: 0,
            roles: [],
            booster: {
              isBooster: member.premiumSince !== null,
              boostCount: member.premiumSince !== null ? 1 : 0,
              firstBoostDate: member.premiumSince || null,
              lastBoostDate: member.premiumSince || null,
              totalBoostDuration: 0
            }
          });
          await newUser.save();
        } else {
          // Kullanıcı varsa joinDate'i güncelle ve rolleri geri ver
          existingUser.joinDate = new Date();
          
          // Booster durumunu güncelle
          if (member.premiumSince !== null && !existingUser.booster.isBooster) {
            existingUser.booster.isBooster = true;
            existingUser.booster.boostCount += 1;
            existingUser.booster.lastBoostDate = new Date();
            
            if (!existingUser.booster.firstBoostDate) {
              existingUser.booster.firstBoostDate = new Date();
            }
          }
          
          await existingUser.save();
          
          // Veritabanındaki rolleri kullanıcıya geri ver
          if (existingUser.roles && existingUser.roles.length > 0) {
            for (const roleId of existingUser.roles) {
              try {
                const role = member.guild.roles.cache.get(roleId);
                if (role && role.id !== member.guild.id) { // @everyone rolü değilse
                  await member.roles.add(role);
                }
              } catch (err) {
                // Rol verilemezse sessizce geç
              }
            }
          }
        }
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

      // 1. BASIT LOG EMBED - Her zaman gönderilir
      const logChannel = member.guild.channels.cache.get(config.logChannels.memberJoin);
      if (!logChannel) {
        return;
      }

      // Basit embed
      const simpleEmbed = new EmbedBuilder()
        .setDescription(`${config.emojis.join} ${member.user.tag} (\`${member.id}\`) sunucuya katıldı.`)
        .addFields(
          {name: `${config.emojis.member} Katılım Tarihi`, value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`, inline: true},
          {name: `${config.emojis.member} Discord'a Katılma Tarihi`, value: `<t:${Math.floor(member.user.createdAt.getTime() / 1000)}:F>`, inline: true},
          {name: `${config.emojis.member} Davet linki`, value: `\`https://discord.gg/${member.guild.vanityURLCode || 'N/A'}\``, inline: true},
        )
        .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: member.guild.iconURL() })
        .setTimestamp()

      await logChannel.send({ embeds: [simpleEmbed] });

      // 2. FINDCORD API EMBED - API varsa gönderilir
      try {
        const apiKey = process.env.FINDCORD_API;
        if (!apiKey) {
          return;
        }

        // Rate limiting kontrolü
        const rateLimit = rateLimiter.checkLimit(`auto_${member.id}`, 'findcord');
        if (!rateLimit.allowed) {
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

        // FindCord API embed'i
        const apiEmbed = new EmbedBuilder()
          .setAuthor({ 
            name: `${member.user.tag} - Sicil Sorgusu`, 
            iconURL: member.user.displayAvatarURL() 
          })
          .setDescription(`**Kullanıcı:** ${member.user} (\`${member.id}\`)\n**Katılım Tarihi:** <t:${Math.floor(Date.now() / 1000)}:F>`)
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
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: member.guild.iconURL() })
          .setTimestamp();

        // Sicil kayıtlarını ekle
        if (sicil.length > 0) {
          const sicilText = sicil.map((record, index) => 
            `${index + 1}. **${record.GuildName}** | **${record.Type || "Bilinmiyor"}** - <t:${Math.floor(record.Date / 1000)}:R>\n> ${record.Reason || "Sebep belirtilmemiş"}`
          ).join('\n');

          apiEmbed.addFields({
            name: `${config.emojis.edit} Sicil Kayıtları`,
            value: sicilText.length > 1024 ? sicilText.substring(0, 1020) + "..." : sicilText,
            inline: false
          });
        } else {
          apiEmbed.addFields({
            name: `${config.emojis.edit} Sicil Kayıtları`,
            value: "Sicil kaydı bulunamadı",
            inline: false
          });
        }

        // FindCord API embed'ini gönder
        await logChannel.send({ embeds: [apiEmbed] });

      } catch (error) {
      }

    } catch (err) {
    }
  },
};
