const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserLevelAndXP, getLeaderboard } = require('../../utils/voiceLeveling'); // Assuming these functions exist in your voiceLeveling.js
const shiva = require('../../shiva');
const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;
const SECURITY_TOKEN = COMMAND_SECURITY_TOKEN;


module.exports = {
    securityToken: COMMAND_SECURITY_TOKEN,
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Checks your current voice activity level.'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        try {
            const userData = await getUserLevelAndXP(userId, guildId); // Fetch user level and XP

            if (!userData) {
                return interaction.reply({ content: 'You haven\'t gained any voice activity yet!', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${interaction.user.username}'s Voice Level`)
                .addFields(
                    { name: 'Level', value: `${userData.level}`, inline: true },
                    { name: 'Experience', value: `${userData.xp}`, inline: true }
                )
                .setTimestamp();

            // Optional: Add leaderboard functionality
            // const leaderboard = await getLeaderboard(guildId);
            // if (leaderboard && leaderboard.length > 0) {
            //     let leaderboardString = '';
            //     for (let i = 0; i < Math.min(leaderboard.length, 10); i++) { // Display top 10
            //         const member = await interaction.guild.members.fetch(leaderboard[i].userId);
            //         leaderboardString += `${i + 1}. ${member.user.username}: Level ${leaderboard[i].level} (${leaderboard[i].xp} XP)\n`;
            //     }
            //     embed.addFields({ name: 'Leaderboard', value: leaderboardString });
            // }


            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching user level:', error);
            await interaction.reply({ content: 'There was an error fetching your level.', ephemeral: true });
        }
    },
};