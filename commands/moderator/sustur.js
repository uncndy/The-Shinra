const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Sanction = require('../../models/Sanction');
const User = require('../../models/User');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sustur')
        .setDescription('Kullanıcıları susturur veya susturmasını kaldırır.')
        // Alt komut: ekle (mute)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Belirtilen kullanıcıyı susturur.')
                .addUserOption(option =>
                    option
                        .setName('kullanıcı')
                        .setDescription('Susturulacak kullanıcı')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('dakika')
                        .setDescription('Susturma süresi (dakika)')
                        .setRequired(true))
        )
        // Alt komut: kaldır (unmute)
        .addSubcommand(subcommand =>
            subcommand
                .setName('kaldır')
                .setDescription('Belirtilen kullanıcının susturmasını kaldırır.')
                .addUserOption(option =>
                    option
                        .setName('kullanıcı')
                        .setDescription('Susturması kaldırılacak kullanıcı')
                        .setRequired(true))
        ),

    async execute(interaction) {
        // Yetki kontrolü
        if (!interaction.member.roles.cache.has(config.roles.moderator) && !interaction.member.roles.cache.has(config.roles.staff) && interaction.user.id !== config.roles.ownerUserID) {
            return interaction.reply({
                content: `${config.emojis.cancel} Bu komutu kullanmak için Moderatör, Staff rolüne sahip olmalısın veya bot sahibi olmalısın.`,
                flags: ["Ephemeral"]
            });
        }
        if (interaction.options.getSubcommand() === 'ekle') {
            const user = interaction.options.getUser('kullanıcı');
            const minutes = interaction.options.getInteger('dakika');

            // Kullanıcı kontrolleri
            if (user.id === interaction.user.id) {
                return interaction.reply({
                    content: `${config.emojis.cancel} Kendini susturamazsın.`,
                    flags: ["Ephemeral"]
                });
            }

            if (user.id === interaction.client.user.id) {
                return interaction.reply({
                    content: `${config.emojis.cancel} Botu susturamazsın.`,
                    flags: ["Ephemeral"]
                });
            }

            try {
                const member = await interaction.guild.members.fetch(user.id);

                // Rol hiyerarşisi kontrolü
                if (member.roles.highest.position >= interaction.member.roles.highest.position) {
                    return interaction.reply({
                        content: `${config.emojis.cancel} Bu kullanıcıyı susturamazsın - rol hiyerarşisi`,
                        flags: ["Ephemeral"]
                    });
                }

                // Onay butonu oluşturma
                const confirmationRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_mute')
                        .setLabel('Evet, Sustur')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_mute')
                        .setLabel('Hayır, İptal Et')
                        .setStyle(ButtonStyle.Secondary),
                );

                // Kullanıcıya onay mesajı gönderme
                const confirmationMessage = await interaction.reply({
                    content: `**@${user.username}** kullanıcısını **${minutes} dakika** susturmak istediğine emin misin?`,
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
                    // Sadece komutu kullananın etkileşimini işle
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({ content: `${config.emojis.cancel} Bu butonu sen kullanamazsın.`, flags: ["Ephemeral"] });
                    }

                    if (i.customId === 'confirm_mute') {
                        // Onaylandı, mute işlemini gerçekleştir
                        await i.update({ content: `${config.emojis.time} Kullanıcı susturuluyor...`, components: [] });

                        const mutedRole = interaction.guild.roles.cache.get(config.roles.muted);
                        if (!mutedRole) {
                            return i.editReply({
                                content: `${config.emojis.cancel} Muted rolü bulunamadı!`,
                                components: []
                            });
                        }
                        await member.roles.add(mutedRole);

                        const lastSanction = await Sanction.findOne({ guildId: interaction.guild.id }).sort({ sanctionId: -1 });
                        const sanctionId = lastSanction ? lastSanction.sanctionId + 1 : 1;
                        const newMute = new Sanction({
                            sanctionId: sanctionId,
                            type: "Mute",
                            guildId: interaction.guild.id,
                            userId: user.id,
                            moderatorId: interaction.user.id,
                            reason: `Mute (${minutes} dakika)`,
                            duration: minutes * 60 * 1000,
                            active: true
                        });
                        await newMute.save();

                        // User modelini güncelle
                        let userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
                        if (!userData) {
                            userData = new User({ userId: user.id, guildId: interaction.guild.id });
                        }
                        userData.currentMute = {
                            sanctionId: sanctionId,
                            muteUntil: new Date(Date.now() + minutes * 60 * 1000)
                        };
                        await userData.save();

                        const embed = new EmbedBuilder()
                            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                            .setThumbnail(user.displayAvatarURL())
                            .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısı \`${minutes}\` dakika boyunca susturuldu.`)
                            .addFields(
                                { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
                                { name: `${config.emojis.warning} Mute ID`, value: `\`#${sanctionId}\``, inline: true },
                                { name: `${config.emojis.info} Süre`, value: `\`${minutes}\` dakika`, inline: true }
                            )
                            .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
                            .setTimestamp();

                        const logChannel = interaction.guild.channels.cache.get(config.logChannels.muteLog);
                        if (logChannel) {
                            await logChannel.send({ embeds: [embed] });
                        }

                        await i.editReply({
                            content: `> ${config.emojis.success} **@${user.username}** \`${minutes}\` dakika boyunca susturuldu.`,
                            components: []
                        });
                    } else if (i.customId === 'cancel_mute') {
                        // İşlem iptal edildi
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
                if (interaction.replied) {
                    await interaction.followUp({
                        content: `${config.emojis.cancel} Kullanıcıya mute atılamadı.`,
                        flags: ["Ephemeral"]
                    });
                } else {
                    await interaction.reply({
                        content: `${config.emojis.cancel} Kullanıcıya mute atılamadı.`,
                        flags: ["Ephemeral"]
                    });
                }
            }
        }
        if (interaction.options.getSubcommand() === 'kaldır') {
            try {
                const user = interaction.options.getUser('kullanıcı');

                // Kendine işlem yapma kontrolü
                if (user.id === interaction.user.id) {
                    return interaction.reply({
                        content: `${config.emojis.cancel} Kendi susturmanı kaldıramazsın.`,
                        flags: ["Ephemeral"]
                    });
                }

                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) {
                    return interaction.reply({
                        content: `${config.emojis.cancel} Kullanıcı bulunamadı.`,
                        flags: ["Ephemeral"]
                    });
                }

                // Muted rolünü bul
                const mutedRole = interaction.guild.roles.cache.get(config.roles.muted);

                if (!mutedRole) {
                    return interaction.reply({
                        content: `${config.emojis.cancel} Muted rolü bulunamadı.`,
                        flags: ["Ephemeral"]
                    });
                }

                // Kullanıcıda rol varsa kaldır
                if (!member.roles.cache.has(mutedRole.id)) {
                    return interaction.reply({
                        content: `${config.emojis.cancel} Bu kullanıcı zaten susturulmuş değil.`,
                        flags: ["Ephemeral"]
                    });
                }

                await member.roles.remove(mutedRole);

                // Sanction tablosunda aktif olan mute'yi pasifleştir
                const muteRecord = await Sanction.findOneAndUpdate(
                    { userId: user.id, guildId: interaction.guild.id, type: "Mute", active: true },
                    { active: false },
                    { new: false }
                );

                // User modelini güncelle
                const userData = await User.findOne({ userId: user.id, guildId: interaction.guild.id });
                if (userData) {
                    userData.currentMute = {
                        sanctionId: null,
                        muteUntil: null
                    };
                    await userData.save();
                }

                // Embed oluştur
                const embed = new EmbedBuilder()
                    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                    .setThumbnail(user.displayAvatarURL())
                    .setDescription(`${user.tag} (\`${user.id}\`) kullanıcısının susturması kaldırıldı.`)
                    .addFields(
                        { name: `${config.emojis.moderator} Sorumlu Moderator`, value: `<@${interaction.user.id}>`, inline: true },
                        { name: `${config.emojis.warning} Mute Kaydı`, value: muteRecord ? `\`#${muteRecord.sanctionId}\`` : "MongoDB kaydı bulunamadı", inline: true }
                    )
                    .setFooter({ text: "The Shinra | Ateşin Efsanesi", iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                // Kullanıcıya geri dönüş
                await interaction.reply({
                    content: `${config.emojis.success} **@${user.username}** kullanıcısının susturması kaldırıldı.`,
                    flags: ["Ephemeral"]
                });

                // Log kanalına gönder
                const logChannel = interaction.guild.channels.cache.get(config.logChannels.muteLog);
                if (logChannel) {
                    await logChannel.send({ embeds: [embed] });
                }

            } catch (err) {
                await interaction.reply({
                    content: `${config.emojis.cancel} Kullanıcının susturması kaldırılamadı.`,
                    flags: ["Ephemeral"]
                });
            }
        }
    }
};