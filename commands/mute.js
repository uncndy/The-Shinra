const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const muteModel = require('../models/Mute');
const Warn = require('../models/Warn');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Belirtilen kullanıcıyı susturur')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Susturulacak kullanıcı')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('minutes')
                .setDescription('Susturma süresi (dakika)')
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
            const minutes = interaction.options.getInteger('minutes');

            // Kullanıcı kontrolleri
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: "❌ Kendini susturamazsın.",
                    flags: ["Ephemeral"]
                });
            }

            if (user.id === interaction.client.user.id) {
                return interaction.reply({
                    content: "❌ Botu susturamazsın.",
                    flags: ["Ephemeral"]
                });
            }

            const member = await interaction.guild.members.fetch(user.id);

            // Rol hiyerarşisi kontrolü
            if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    content: "❌ Bu kullanıcıyı susturamazsın - rol hiyerarşisi",
                    flags: ["Ephemeral"]
                });
            }

            // Muted rolünü bul ve ver
            const mutedRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase() === config.roles.muted.toLowerCase()
            );

            if (!mutedRole) {
                return interaction.reply({ 
                    content: "❌ Muted rolü bulunamadı!", 
                    flags: ["Ephemeral"] 
                });
            }

            await member.roles.add(mutedRole);

            // Mute bitiş süresi hesapla
            const muteEnd = Date.now() + minutes * 60 * 1000;

            // DB kayıt
            await muteModel.create({
                guildId: interaction.guild.id,
                userId: user.id,
                muteEnd
            });

            const lastWarn = await Warn.findOne({ guildId: interaction.guild.id }).sort({ warnId: -1 });
            const warnId = lastWarn ? lastWarn.warnId + 1 : 1;

            // Warn DB'ye kaydet
            const newMute = new Warn({
                warnId: warnId,
                type: "Mute",
                guildId: interaction.guild.id,
                userId: user.id,
                moderatorId: interaction.user.id,
                reason: `Mute (${minutes} dakika)`,
                active: true
            });
            await newMute.save();

            // Embed oluştur
            const embed = new EmbedBuilder()
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setThumbnail(user.displayAvatarURL())
                .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı ${minutes} dakika boyunca susturuldu.`)
                .addFields(
                    { name: "Sorumlu Moderator", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "Mute Kaydı", value: `\`#${warnId}\``, inline: true },
                    { name: "Süre", value: `${minutes} dakika`, inline: true }
                )
                .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            // Kullanıcıya cevap
            await interaction.reply({ 
                content: `> **@${user.username}** ${minutes} dakika boyunca susturuldu.`, 
                flags: ["Ephemeral"] 
            });

            // Log kanalına gönder
            const logChannel = interaction.guild.channels.cache.get(config.channels.muteLog);
            if (logChannel) {
                await logChannel.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error('Mute hatası:', err);
            if (interaction.replied) {
                await interaction.followUp({ 
                    content: "❌ Kullanıcıya mute atılamadı.", 
                    flags: ["Ephemeral"] 
                });
            } else {
                await interaction.reply({ 
                    content: "❌ Kullanıcıya mute atılamadı.", 
                    flags: ["Ephemeral"] 
                });
            }
        }
    }
};