const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../utils/voiceLeveling'); // Assuming getLeaderboard exists and is exported
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    // Add securityToken property to the module.exports
    securityToken: COMMAND_SECURITY_TOKEN,
    // Add validateCore check before command execution
    validateCore: shiva.validateCore,
    // Add shiva reference
    shiva: shiva,
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the voice activity leaderboard.'),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply();

        try {
            const leaderboard = await getLeaderboard(interaction.guild.id); // Fetch leaderboard data

            if (!leaderboard || leaderboard.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFFF00')
                    .setDescription('📊 The leaderboard is currently empty!');
                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Voice Activity Leaderboard')
                .setDescription('Top users by voice activity level and XP:')
                .setTimestamp();

            const leaderboardString = await Promise.all(leaderboard.map(async (user, index) => {
                try {
                    const member = await interaction.guild.members.fetch(user.discordId);
                    return `${index + 1}. ${member.user.username}: Level ${user.level} (${user.xp} XP)`;
                } catch (error) {
                    console.error(`Could not fetch member for user ID ${user.discordId}:`, error);
                    return `${index + 1}. Unknown User: Level ${user.level} (${user.xp} XP)`;
                }
            }));

            embed.setDescription(embed.data.description + '\n\n' + leaderboardString.join('\n'));

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ An error occurred while fetching the leaderboard.');
            return interaction.editReply({ embeds: [embed] });
        }
    },
};