const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const muteModel = require('../models/Mute');
const Warn = require('../models/Warn');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Belirtilen kullanıcının susturmasını kaldırır')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Susturması kaldırılacak kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        // Yetki kontrolü
        if (!interaction.member.roles.cache.has(config.roles.moderator)) {
            return interaction.reply({ 
                content: "❌ Bu komutu kullanmak için Moderatör rolüne sahip olmalısın.", 
                flags: ["Ephemeral"] 
            });
        }

        try {
            const user = interaction.options.getUser('user');
            
            // Kendine işlem yapma kontrolü
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: "❌ Kendi susturmanı kaldıramazsın.",
                    flags: ["Ephemeral"]
                });
            }

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) {
                return interaction.reply({ 
                    content: "❌ Kullanıcı bulunamadı.", 
                    flags: ["Ephemeral"] 
                });
            }

            // Muted rolünü bul
            const mutedRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === config.roles.muted.toLowerCase()
            );
            
            if (!mutedRole) {
                return interaction.reply({ 
                    content: "❌ Muted rolü bulunamadı.", 
                    flags: ["Ephemeral"] 
                });
            }

            // Kullanıcıda rol varsa kaldır
            if (!member.roles.cache.has(mutedRole.id)) {
                return interaction.reply({ 
                    content: "❌ Bu kullanıcı zaten susturulmuş değil.", 
                    flags: ["Ephemeral"] 
                });
            }

            await member.roles.remove(mutedRole);

            // DB'den mute kaydını sil
            await muteModel.deleteOne({ guildId: interaction.guild.id, userId: user.id });

            // Warn tablosunda aktif olan mute'yi pasifleştir
            const muteRecord = await Warn.findOneAndUpdate(
                { userId: user.id, guildId: interaction.guild.id, type: "Mute", active: true },
                { active: false },
                { new: false }
            );

            // Embed oluştur
            const embed = new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL())
                .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının susturması kaldırıldı.`)
                .addFields(
                    { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "Mute Kaydı", value: muteRecord ? `\`#${muteRecord.warnId}\`` : "MongoDB kaydı bulunamadı", inline: true }
                )
                .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Kullanıcıya geri dönüş
            await interaction.reply({ 
                content: `✅ **@${user.username}** kullanıcısının susturması kaldırıldı.`, 
                flags: ["Ephemeral"] 
            });

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.channels.muteLog);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error('Unmute hatası:', err);
            await interaction.reply({ 
                content: "❌ Kullanıcının susturması kaldırılamadı.", 
                flags: ["Ephemeral"] 
            });
        }
    }
};