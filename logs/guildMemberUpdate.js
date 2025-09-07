// logs/guildMemberUpdate.js
const { EmbedBuilder, Events, AuditLogEvent } = require("discord.js");
const config = require("../config");
const User = require('../models/User');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    try {
      if (!oldMember.guild) return;

      // User verisini bul veya oluştur
      let userData = await User.findOne({ 
        userId: newMember.id, 
        guildId: newMember.guild.id 
      });

      if (!userData) {
        userData = new User({
          userId: newMember.id,
          guildId: newMember.guild.id,
          joinDate: newMember.joinedAt,
          level: 1,
          xp: 0,
          roles: [],
          previousNicknames: []
        });
      }

      let updated = false;

      // --- ROL DEĞİŞİKLİKLERİ ---
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
      const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

      // Audit log
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate,
      });
      const roleLog = fetchedLogs.entries.first();

      // Rol değişiklikleri varsa User modelini güncelle
      if (addedRoles.size > 0 || removedRoles.size > 0) {
        // User modelindeki rolleri güncelle (sadece @everyone hariç)
        userData.roles = newRoles
          .filter(role => role.id !== newMember.guild.id) // @everyone rolünü hariç tut
          .map(role => role.id);
        updated = true;
      }

      // Rol eklenmişse
      if (addedRoles.size > 0) {
        const logChannel = newMember.guild.channels.cache.get(config.logChannels.roleGived);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`${config.emojis.update} **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısına rol verildi.`)
            .addFields(
              { name: `${config.emojis.member} Kullanıcı`, value: `${newMember}`, inline: true },
              { name: `${config.emojis.update} Verilen Roller`, value: addedRoles.map(r => r.toString()).join("\n"), inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // Rol alınmışsa
      if (removedRoles.size > 0) {
        const logChannel = newMember.guild.channels.cache.get(config.logChannels.roleRemoved);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`${config.emojis.update} **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısından rol alındı.`)
            .addFields(
              { name: `${config.emojis.member} Kullanıcı`, value: `${newMember}`, inline: true },
              { name: `${config.emojis.update} Alınan Roller`, value: removedRoles.map(r => r.toString()).join("\n"), inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // --- NICKNAME DEĞİŞİKLİKLERİ ---
      const oldNickname = oldMember.nickname || oldMember.user.username;
      const newNickname = newMember.nickname || newMember.user.username;

      if (oldNickname !== newNickname && oldNickname) {
        // Eski nick'i previousNicknames'e ekle
        userData.previousNicknames.push({
          nickname: oldNickname,
          timestamp: new Date()
        });

        // Son 10 nick'i tut (eski kayıtları temizle)
        if (userData.previousNicknames.length > 10) {
          userData.previousNicknames = userData.previousNicknames.slice(-10);
        }

        updated = true;

        const logChannel = newMember.guild.channels.cache.get(config.logChannels.changedNick);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: newMember.user.username, iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`${config.emojis.update} **${newMember.user.tag}** (\`${newMember.id}\`) kullanıcısının takma adı değiştirildi.`)
            .addFields(
              { name: `${config.emojis.update} Eski Nick`, value: oldNickname || "Yok", inline: true },
              { name: `${config.emojis.update} Yeni Nick`, value: newNickname || "Yok", inline: true }
            )
            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: newMember.guild.iconURL() })
            .setTimestamp();
          await logChannel.send({ embeds: [embed] });
        }
      }

      // Eğer herhangi bir değişiklik varsa kaydet
      if (updated) {
        await userData.save();
      }

    } catch (err) {
      // Silent fail for guild member update errors
    }
  },
};
