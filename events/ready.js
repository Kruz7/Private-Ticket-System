module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ ${client.user.tag} bot is ready!`);

        const { REST, Routes } = require('discord.js');
        const commands = [];
        
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        (async () => {
            try {
                console.log('🔄 Registering slash commands...');
                await rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commands }
                );
                console.log('✅ Slash commands registered successfully!');
            } catch (error) {
                console.error('❌ Error while registering commands:', error);
            }
        })();
    }
};