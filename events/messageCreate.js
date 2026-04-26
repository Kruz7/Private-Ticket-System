const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        if (message.channel.type === 1 && message.content.startsWith('/')) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Command Blocked')
                .setDescription('Commands cannot be used in DM!')
                .setTimestamp();
                
            await message.reply({ embeds: [embed] });
            return;
        }

        if (message.channel.type === 1) {
            await handleDMMessage(message, client);
        }

        if (message.channel.type === 0) {
            await handleTicketChannelMessage(message, client);
        }
    }
};

async function handleDMMessage(message, client) {
    const userTicket = Array.from(client.ticketUsers.entries())
        .find(([userId, ticketData]) => ticketData.dmChannel === message.channel.id);

    if (userTicket) {
        const [userId, ticketData] = userTicket;
        
        try {
            const ticketChannel = await client.channels.fetch(ticketData.ticketChannel);
            
            if (ticketChannel) {
                const formattedMessage = `**${message.author.tag}**: ${message.content}`;

                const sentMessage = await ticketChannel.send(formattedMessage);

                try {
                    await message.react('✅');
                } catch (error) {
                    console.log('Could not react to DM message:', error);
                }

                if (message.attachments.size > 0) {
                    for (const attachment of message.attachments.values()) {
                        await ticketChannel.send(`**${message.author.tag}** sent a file: ${attachment.url}`);
                    }
                }

                if (!ticketData.messages) ticketData.messages = [];
                ticketData.messages.push({
                    user: userId,
                    content: message.content,
                    timestamp: Date.now(),
                    type: 'user_to_support'
                });
            }
        } catch (error) {
            console.error('Could not send message to ticket channel:', error);
            await message.channel.send('❌ Your message could not be delivered. Please try again later.');
        }
    } else {
        await message.channel.send('❌ You do not have an active ticket. Please create one from the panel in the server first.');
    }
}

async function handleTicketChannelMessage(message, client) {
    const userTicket = Array.from(client.ticketUsers.entries())
        .find(([userId, ticketData]) => ticketData.ticketChannel === message.channel.id);

    if (userTicket) {
        const [userId, ticketData] = userTicket;
        
        try {
            const user = await client.users.fetch(userId);
            const dmChannel = await user.createDM();

            const formattedMessage = `**${message.author.tag}**: ${message.content}`;

            await dmChannel.send(formattedMessage);

            await message.react('✅');

            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    await dmChannel.send(`**${message.author.tag}** sent a file: ${attachment.url}`);
                }
            }

            if (!ticketData.messages) ticketData.messages = [];
            ticketData.messages.push({
                user: message.author.id,
                content: message.content,
                timestamp: Date.now(),
                type: 'support_to_user'
            });

        } catch (error) {
            console.error('Could not send DM to user:', error);
            await message.channel.send('❌ Message could not be delivered to user. Check DM settings.');
        }
    }
}