const { EmbedBuilder } = require('discord.js');
const User = require('../models/User'); // Your User model
const Server = require('../models/Server'); // Import Server model
const { calculateXP, calculateLevel } = require('../utils/voiceLeveling'); // Your leveling functions
const { createLevelUpEmbed } = require('../utils/voiceLeveling'); // Import the embed creation function
// Store user join timestamps
const userJoinTimestamps = new Map();
 
module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const userId = oldState.member.id;
        const guildId = oldState.guild?.id; // Use optional chaining

        if (!guildId || oldState.member.user.bot) { // Ignore bots and DMs
 return;
        }

        // User joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            // Ignore bots and AFK channel joins
            if (newState.member.user.bot || newState.channelId === newState.guild?.afkChannelId) {
                console.log(`[Voice XP] Ignoring bot or AFK channel join for user ${newState.member.user.tag} in guild ${newState.guild?.name}`);
                return;
            }
            // Store the join timestamp for non-bot users
            userJoinTimestamps.set(userId, Date.now());
            console.log(`User ${oldState.member.user.tag} joined voice channel ${newState.channel.name} in guild ${oldState.guild.name}`);
        }

        // User left a voice channel
        if (oldState.channelId && !newState.channelId) {
            const joinTimestamp = userJoinTimestamps.get(userId);
            
            // If we have a join timestamp for this user and they are leaving
            if (joinTimestamp) {
                // Check if the channel left was the AFK channel. If so, just delete the timestamp and return.
                if (oldState.channelId === oldState.guild?.afkChannelId) {
                    console.log(`[Voice XP] User ${oldState.member.user.tag} left AFK channel in guild ${oldState.guild?.name}. Not awarding XP.`);
                    userJoinTimestamps.delete(userId);
                    return;
                }

                const durationInSeconds = Math.floor((Date.now() - joinTimestamp) / 1000);
                console.log(`User ${oldState.member.user.tag} left voice channel ${oldState.channel.name} after ${durationInSeconds} seconds in guild ${oldState.guild.name}`);
                console.log(`[Voice XP] User ${oldState.member.user.tag} in guild ${oldState.guild.name} was in voice for ${durationInSeconds} seconds.`);
                userJoinTimestamps.delete(userId);

                // Only award XP if the user was in the channel for a reasonable duration
                if (durationInSeconds >= 60) { // Award XP for duration >= 60 seconds (1 minute)
                    const xpGained = calculateXP(durationInSeconds);

                    try {
                        // Find or create the user in the database
                        let user = await User.findOne({ discordId: userId }); // Find by discordId

                        if (!user) {
                            user = new User({ discordId: userId });
                        } else {
                            // Ensure the user object has the necessary properties
                            if (user.xp === undefined) user.xp = 0;
                            if (user.level === undefined) user.level = 1;
                        }

                        const oldLevel = user.level;
                        user.xp += xpGained;
                        user.level = calculateLevel(user.xp);
                        console.log(`[Voice XP] User ${oldState.member.user.tag} gained ${xpGained} XP. New XP: ${user.xp}, New Level: ${user.level}`);

                        await user.save();

                        // Notify user if they leveled up
                        if (user.level > oldLevel && oldState.guild) { // Ensure guild is available
                            const member = await oldState.guild.members.fetch(userId);
                            const levelUpEmbed = createLevelUpEmbed(member, user.level);
                            
                            const serverSettings = await Server.findOne({ guildId: guildId });
                            let levelChannel = null;

                            if (serverSettings && serverSettings.levelingChannelId) {
                                levelChannel = oldState.guild.channels.cache.get(serverSettings.levelingChannelId);
                            }

                            const systemChannel = oldState.guild?.systemChannel;

                            if (levelChannel) {
                                console.log(`Sending level up message to configured channel for guild ${oldState.guild.name}`);
                                levelChannel.send({ embeds: [levelUpEmbed] }).catch(console.error);
                            } else if (systemChannel) {
                                systemChannel.send({ embeds: [levelUpEmbed] }).catch(console.error);
                            } else {
                                console.warn(`No channel found to send level up message for guild ${oldState.guild.name}`);
                            }
                        }

                    } catch (error) {
                        console.error('Error updating user voice level:', error);
                    }
                }
            }
        }
    },
};
module.exports.userJoinTimestamps = userJoinTimestamps;