const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    content: 'This command is not available!',
                    ephemeral: true
                });
            }

            try {
                await command.execute(interaction, client);

            } catch (error) {
                console.error('Error executing slash command:', error);

                const reply = {
                    content: 'There was an error executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    try {
                        await interaction.reply(reply);
                    } catch (replyError) {
                        console.error('Error sending error reply:', replyError);
                    }
                }
            }
        }
        


        else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'ai_personality_modal') {
                await handleAIPersonalityModal(interaction, client);
            } else if (interaction.customId === 'ai_key_modal') {
                await handleAIKeyModal(interaction, client);
            } else if (interaction.customId === 'ai_favorites_modal') {
                await handleAIFavoritesModal(interaction, client);
            }
        }
    }
};

async function handleSecureMusicButton(interaction, client) {
    if (interaction.customId === 'music_support') return;
    
    const ConditionChecker = require('../utils/checks');
    const checker = new ConditionChecker(client);
    
    try {
        const conditions = await checker.checkMusicConditions(
            interaction.guild.id,
            interaction.user.id,
            interaction.member.voice?.channelId,
            true 
        );

        if (!conditions.hasActivePlayer) {
            return interaction.reply({
                content: '❌ No music is currently playing!',
                ephemeral: true
            });
        }

        if (!conditions.userInVoice) {
            return interaction.reply({
                content: '❌ You need to be in a voice channel to control music!',
                ephemeral: true
            });
        }

        if (!conditions.sameVoiceChannel) {
            const botChannelName = interaction.guild.channels.cache.get(conditions.botVoiceChannel)?.name || 'Unknown';
            return interaction.reply({
                content: `❌ You need to be in **${botChannelName}** voice channel to control music!`,
                ephemeral: true
            });
        }


        const canUseMusic = await checker.canUseMusic(interaction.guild.id, interaction.user.id);
        if (!canUseMusic) {
            return interaction.reply({
                content: '❌ You need DJ permissions to control music!',
                ephemeral: true
            });
        }


        const player = conditions.player;
        const action = interaction.customId.replace('music_', '');
        const CentralEmbedHandler = require('../utils/centralEmbed');
        const centralHandler = new CentralEmbedHandler(client);
        
        switch (action) {
            case 'pause':
                player.pause(true);
                await interaction.reply({
                    content: '⏸️ Music paused',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'resume':
                player.pause(false);
                await interaction.reply({
                    content: '▶️ Music resumed',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'skip':
                const currentTrack = player.current?.info?.title || 'Unknown';
                player.stop();
                await interaction.reply({
                    content: `⏭️ Skipped: \`${currentTrack}\``,
                    ephemeral: true
                });
                break;
                
            case 'stop':
                player.destroy();
                await interaction.reply({
                    content: '🛑 Music stopped and disconnected',
                    ephemeral: true
                });
                break;
                
            case 'clear':
                const clearedCount = player.queue.size;
                player.queue.clear();
                await interaction.reply({
                    content: `🗑️ Cleared ${clearedCount} songs from queue`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'loop':
                const currentLoop = player.loop || 'none';
                let newLoop;
                
                switch (currentLoop) {
                    case 'none': newLoop = 'track'; break;
                    case 'track': newLoop = 'queue'; break;
                    case 'queue': newLoop = 'none'; break;
                    default: newLoop = 'track';
                }
                
                player.setLoop(newLoop);
                const loopEmojis = { none: '➡️', track: '🔂', queue: '🔁' };
                await interaction.reply({
                    content: `${loopEmojis[newLoop]} Loop mode: **${newLoop}**`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_up':
                const newVolumeUp = Math.min(player.volume + 10, 100);
                player.setVolume(newVolumeUp);
                await interaction.reply({
                    content: `🔊 Volume increased to ${newVolumeUp}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_down':
                const newVolumeDown = Math.max(player.volume - 10, 1);
                player.setVolume(newVolumeDown);
                await interaction.reply({
                    content: `🔉 Volume decreased to ${newVolumeDown}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'queue':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '📜 Queue is empty',
                        ephemeral: true
                    });
                }
                
                const queueList = player.queue.map((track, index) => 
                    `\`${index + 1}.\` ${track.info.title.substring(0, 40)}${track.info.title.length > 40 ? '...' : ''}`
                ).slice(0, 10).join('\n');
                
                const moreText = player.queue.size > 10 ? `\n... and ${player.queue.size - 10} more songs` : '';
                
                await interaction.reply({
                    content: `📜 **Queue (${player.queue.size} songs)**\n${queueList}${moreText}`,
                    ephemeral: true
                });
                break;
                
            case 'shuffle':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '❌ Queue is empty, nothing to shuffle!',
                        ephemeral: true
                    });
                }
                
                player.queue.shuffle();
                await interaction.reply({
                    content: `🔀 Shuffled ${player.queue.size} songs in queue`,
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    content: '❌ Unknown button action',
                    ephemeral: true
                });
        }


        async function updateCentralEmbed() {
            if (player && player.current) {
                const playerInfo = {
                    title: player.current.info.title,
                    author: player.current.info.author,
                    duration: player.current.info.length,
                    thumbnail: player.current.info.thumbnail,
                    requester: player.current.info.requester,
                    paused: player.paused,
                    volume: player.volume,
                    loop: player.loop,
                    queueLength: player.queue.size
                };
                await centralHandler.updateCentralEmbed(interaction.guild.id, playerInfo);
            }
        }

    } catch (error) {
        console.error('Error handling secure music button:', error);
        await interaction.reply({
            content: '❌ An error occurred while processing your request',
            ephemeral: true
        }).catch(() => {});
    }
}

async function handleAIPersonalityModal(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const Server = require('../models/Server');
        const server = await Server.findById(interaction.guild.id) || new Server({ _id: interaction.guild.id });

        const bio = interaction.fields.getTextInputValue('bio');
        const personality = interaction.fields.getTextInputValue('personality');
        const hierarchy = interaction.fields.getTextInputValue('hierarchy');
        const lore = interaction.fields.getTextInputValue('lore');
        const customPrompt = interaction.fields.getTextInputValue('custom_prompt');

        server.aiPersonality = {
            bio: bio || server.aiPersonality?.bio || '',
            personality: personality || server.aiPersonality?.personality || '',
            serverHierarchy: hierarchy || server.aiPersonality?.serverHierarchy || '',
            serverLore: lore || server.aiPersonality?.serverLore || '',
            customPrompt: customPrompt || server.aiPersonality?.customPrompt || '',
            favorites: server.aiPersonality?.favorites || []
        };

        await server.save();

        const favoritesList = server.aiPersonality?.favorites?.length > 0
            ? server.aiPersonality.favorites.map(f => `${f.name} (${f.type})`).join('\n')
            : 'None';

        const embed = new EmbedBuilder()
            .setTitle('🤖 AI Personality Updated')
            .setDescription('The AI personality has been successfully updated for this server!')
            .setColor('#00FF00')
            .addFields(
                { name: 'Bio', value: bio || 'Not set', inline: false },
                { name: 'Personality', value: personality || 'Not set', inline: false },
                { name: 'Server Hierarchy', value: hierarchy || 'Not set', inline: false },
                { name: 'Server Lore', value: lore || 'Not set', inline: false },
                { name: 'Custom Prompt', value: customPrompt || 'Not set', inline: false },
                { name: 'Favorite Music', value: favoritesList, inline: false }
            );

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error handling AI personality modal:', error);
        const embed = new EmbedBuilder()
            .setDescription('❌ An error occurred while updating AI personality!')
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleAIKeyModal(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const Server = require('../models/Server');
        const server = await Server.findById(interaction.guild.id) || new Server({ _id: interaction.guild.id });

        const apiKey = interaction.fields.getTextInputValue('api_key');
        const model = interaction.fields.getTextInputValue('model');

        // Test the API key and model before saving
        const testEmbed = new EmbedBuilder()
            .setTitle('🔄 Testing AI Configuration')
            .setDescription('Testing your API key and model configuration...')
            .setColor('#FFFF00');

        await interaction.editReply({ embeds: [testEmbed] });

        try {
            // Test the API key with a simple request
            const axios = require('axios');
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: model,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.data && response.data.choices) {
                // Test successful, save the settings
                server.aiSettings = {
                    apiKey: apiKey,
                    model: model
                };

                await server.save();

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ AI Configuration Updated')
                    .setDescription('Your AI API key and model have been successfully tested and saved!')
                    .setColor('#00FF00')
                    .addFields(
                        { name: 'Model', value: model, inline: true },
                        { name: 'Status', value: '✅ Valid and working', inline: true }
                    );

                await interaction.editReply({ embeds: [successEmbed] });
            } else {
                throw new Error('Invalid API response');
            }

        } catch (testError) {
            console.error('AI configuration test failed:', testError);

            let errorMessage = '❌ Failed to validate API key and model. ';
            if (testError.response) {
                if (testError.response.status === 401) {
                    errorMessage += 'Invalid API key.';
                } else if (testError.response.status === 400) {
                    errorMessage += 'Invalid model or request format.';
                } else {
                    errorMessage += `API error: ${testError.response.status}`;
                }
            } else if (testError.code === 'ECONNABORTED') {
                errorMessage += 'Request timed out. Please try again.';
            } else {
                errorMessage += 'Please check your API key and model.';
            }

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ AI Configuration Failed')
                .setDescription(errorMessage)
                .setColor('#FF0000');

            await interaction.editReply({ embeds: [errorEmbed] });
        }

    } catch (error) {
        console.error('Error handling AI key modal:', error);
        const embed = new EmbedBuilder()
            .setDescription('❌ An error occurred while updating AI configuration!')
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleAIFavoritesModal(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const Server = require('../models/Server');
        const server = await Server.findById(interaction.guild.id) || new Server({ _id: interaction.guild.id });

        const favoritesInput = interaction.fields.getTextInputValue('favorites');
        const favorites = [];

        if (favoritesInput.trim()) {
            const lines = favoritesInput.split('\n').filter(line => line.trim());
            for (const line of lines) {
                const parts = line.split('|').map(part => part.trim());
                if (parts.length === 3) {
                    const [name, url, type] = parts;
                    if (type === 'song' || type === 'playlist') {
                        favorites.push({ name, url, type });
                    }
                }
            }
        }

        server.aiPersonality = server.aiPersonality || {};
        server.aiPersonality.favorites = favorites;

        await server.save();

        const favoritesList = favorites.length > 0
            ? favorites.map(f => `${f.name} (${f.type})`).join('\n')
            : 'None';

        const embed = new EmbedBuilder()
            .setTitle('🎵 AI Favorite Music Updated')
            .setDescription('The AI favorite music has been successfully updated for this server!')
            .setColor('#00FF00')
            .addFields(
                { name: 'Favorite Music', value: favoritesList, inline: false }
            );

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error handling AI favorites modal:', error);
        const embed = new EmbedBuilder()
            .setDescription('❌ An error occurred while updating AI favorite music!')
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}
