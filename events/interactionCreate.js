const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error);
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ System Error')
                    .setDescription('An unexpected error occurred while running the command.')
                    .setTimestamp();
                    
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                } else {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId === 'create_ticket') {
                await handleCreateTicket(interaction, client);
            } else if (interaction.customId === 'clear_dm') {
                await handleClearDM(interaction, client);
            } else if (interaction.customId === 'close_ticket') {
                await handleCloseTicket(interaction, client);
            }
        }
    }
};

async function handleCreateTicket(interaction, client) {
    if (client.cooldowns.has(interaction.user.id)) {
        const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⏳ Please Wait')
            .setDescription('Please wait a moment before trying again!')
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (client.ticketUsers.has(interaction.user.id)) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Ticket Already Open')
            .setDescription('You already have an open ticket!')
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    client.cooldowns.set(interaction.user.id, true);
    setTimeout(() => client.cooldowns.delete(interaction.user.id), 30000);

    try {
        const processingEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⏳ Processing')
            .setDescription('Your ticket is being created...')
            .setTimestamp();
            
        await interaction.reply({ embeds: [processingEmbed], ephemeral: true });

        const ticketGuild = await client.guilds.fetch(process.env.TICKET_GUILD_ID);
        const category = await ticketGuild.channels.fetch(process.env.CATEGORY_ID);
        
        const ticketChannel = await ticketGuild.channels.create({
            name: `ticket-${interaction.user.username}-${Date.now().toString().slice(-4)}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: ticketGuild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                },
                {
                    id: process.env.SUPPORT_ROLE_ID,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                }
            ]
        });

        client.ticketUsers.set(interaction.user.id, {
            ticketChannel: ticketChannel.id,
            dmChannel: null,
            createdAt: Date.now(),
            createdBy: interaction.user.id
        });

        const user = interaction.user;
        const accountAge = Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24));
        const createdAt = Math.floor(user.createdTimestamp / 1000);
        const ticketCreatedAt = Math.floor(Date.now() / 1000);

        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 NEW TICKET')
            .setColor(0x0099FF)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { 
                    name: '👤 USER INFORMATION', 
                    value: `**• User:** ${user.tag}\n**• ID:** \`${user.id}\``,
                    inline: false 
                },
                { 
                    name: '📅 ACCOUNT INFORMATION', 
                    value: `**• Created:** <t:${createdAt}:D>\n**• Account Age:** ${accountAge} days`,
                    inline: true 
                },
                { 
                    name: '🕒 TICKET INFORMATION', 
                    value: `**• Opened:** <t:${ticketCreatedAt}:R>\n**• Channel:** <#${ticketChannel.id}>`,
                    inline: true 
                },
                { 
                    name: '🔗 PROFILE LINK', 
                    value: `[Go to User Profile](https://discord.com/users/${user.id})`,
                    inline: false 
                }
            )
            .setFooter({ 
                text: `Neverours Support System • Ticket ID: ${ticketChannel.id.slice(-6)}`, 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ 
            content: `\n<@${interaction.user.id}> <@&${process.env.SUPPORT_ROLE_ID}>`,
            embeds: [ticketEmbed], 
            components: [buttons] 
        });

        const dmChannel = await user.createDM();
        const dmEmbed = new EmbedBuilder()
            .setTitle('🎫 Ticket Opened')
            .setDescription('All messages you send here will be forwarded to the support team.\n\n')
            .setColor(0x00FF00)
            .setFooter({ text: 'Neverours Ticket System' })
            .setTimestamp();

        await dmChannel.send({ embeds: [dmEmbed] });
        client.ticketUsers.get(user.id).dmChannel = dmChannel.id;

        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Ticket Created')
            .setDescription('Your ticket was created successfully! You can now chat through DM.')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });

        await logAction(client, 'TICKET OPENED', 
            `**User:** ${user.tag} (\`${user.id}\`)\n**Ticket:** ${ticketChannel.name}\n**Time:** <t:${ticketCreatedAt}:R>`, 
            0x00FF00
        );

    } catch (error) {
        console.error('Ticket creation error:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ System Error')
            .setDescription('An unexpected error occurred while creating the ticket! Please try again later.')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handleCloseTicket(interaction, client) {
    if (!interaction.member.roles.cache.has(process.env.SUPPORT_ROLE_ID)) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Permission Error')
            .setDescription('You do not have permission to perform this action.')
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
        const ticketEntry = Array.from(client.ticketUsers.entries())
            .find(([userId, ticketData]) => ticketData.ticketChannel === interaction.channel.id);

        if (!ticketEntry) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Ticket Not Found')
                .setDescription('No valid ticket was found for this channel!')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const [userId, ticketData] = ticketEntry;
        const user = await client.users.fetch(userId);
        const ticketDuration = Math.floor((Date.now() - ticketData.createdAt) / (1000 * 60));

        // Send close notification to the user
        const closeEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription('Your ticket has been closed by a staff member.\n\n💡 **Note:** This message will be deleted after 5 seconds.')
            .setColor(0xFF0000)
            .setFooter({ text: 'Neverours Ticket System' })
            .setTimestamp();

        try {
            const dmChannel = await user.createDM();
            const closeMsg = await dmChannel.send({ embeds: [closeEmbed] });
            
            // Delete after 5 seconds
            setTimeout(async () => {
                try {
                    await closeMsg.delete();
                } catch (error) {
                    console.log('Close message was already deleted.');
                }
            }, 5000);
        } catch (dmError) {
            console.log('Could not send DM to user:', dmError);
        }

        const closeInfoEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Ticket Closed')
            .setDescription('Ticket closed successfully. Channel will be deleted in 3 seconds.')
            .addFields(
                { name: '👤 User', value: `${user.tag}`, inline: true },
                { name: '⏱️ Duration', value: `${ticketDuration} minutes`, inline: true },
                { name: '👮 Staff', value: `${interaction.user.tag}`, inline: true }
            )
            .setTimestamp();
            
        await interaction.reply({ embeds: [closeInfoEmbed] });

        await logAction(client, 'TICKET CLOSED', 
            `**Staff:** ${interaction.user.tag}\n**User:** ${user.tag} (\`${user.id}\`)\n**Ticket:** ${interaction.channel.name}\n**Duration:** ${ticketDuration} minutes`, 
            0xFF0000
        );

        client.ticketUsers.delete(userId);

        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket closed');
            } catch (deleteError) {
                console.log('Channel could not be deleted:', deleteError);
            }
        }, 3000);

    } catch (error) {
        console.error('Ticket close error:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ System Error')
            .setDescription('An unexpected error occurred while closing the ticket!')
            .setTimestamp();
            
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleClearDM(interaction, client) {
    try {
        const processingEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⏳ Processing')
            .setDescription('Cleaning your DM messages...')
            .setTimestamp();
            
        await interaction.reply({ embeds: [processingEmbed], ephemeral: true });

        const dmChannel = await interaction.user.createDM();
        const messages = await dmChannel.messages.fetch({ limit: 50 });
        const botMessages = messages.filter(msg => msg.author.id === client.user.id);

        let deletedCount = 0;
        for (const message of botMessages.values()) {
            try {
                await message.delete();
                deletedCount++;
                if (deletedCount % 5 === 0) await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.log('Message could not be deleted:', error);
            }
        }

        const warningMsg = await dmChannel.send('Please delete your own messages in the ticket manually.');
        
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ DM Cleared')
            .setDescription(`Successfully deleted **${deletedCount}** messages.`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [successEmbed] });

        setTimeout(async () => {
            try {
                await warningMsg.delete();
            } catch (error) {
                console.log('Warning message was already deleted.');
            }
        }, 5000);

        await logAction(client, 'DM CLEARED', 
            `**User:** ${interaction.user.tag}\n**Deleted Messages:** ${deletedCount}`, 
            0x00FF00
        );

    } catch (error) {
        console.error('Clear DM error:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ System Error')
            .setDescription('An unexpected error occurred while clearing DM!')
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function logAction(client, action, description, color) {
    try {
        const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
        const logEmbed = new EmbedBuilder()
            .setTitle(`📝 ${action}`)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
            
        await logChannel.send({ embeds: [logEmbed] });
    } catch (error) {
        console.error('Log could not be sent:', error);
    }
}