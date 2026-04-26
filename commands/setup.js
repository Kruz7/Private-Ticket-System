const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('privsetup')
        .setDescription('Sets up the ticket panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, client) {
        if (interaction.user.id !== process.env.SETUP_USER_ID) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Permission Error')
                .setDescription('You do not have permission to use this command.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(' Neverours Ticket System')
            .setDescription('To get information about our products, make a purchase, or contact us, please create a ticket.')
            .setColor(0xFF0000)
            .setFooter({ text: 'Neverours'});

const row = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('🎫 Create Ticket')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('clear_dm')
            .setLabel('🧹 Clear DM')
            .setStyle(ButtonStyle.Danger)
    );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        
        const successEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Success')
            .setDescription('Ticket panel has been set up successfully!')
            .setTimestamp();
            
        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }
};