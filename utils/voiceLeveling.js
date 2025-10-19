// Assume you have a database connection and a user schema/model available
const User = require('../models/User'); // Your User model with fields like discordId, xp, level

// Function to update user experience based on time spent in voice (Placeholder - requires voice state tracking)
async function updateUserVoiceXP(userId, durationInSeconds) {
  const xpEarned = calculateXP(durationInSeconds); // Implement calculateXP based on your desired rate

  try {
    let user = await User.findOne({ discordId: userId });

    if (!user) {
      // Create new user if not found
      user = new User({
        discordId: userId,
        xp: xpEarned,
        level: 1, // Start at level 1
      });
    } else {
      user.xp += xpEarned;
      const oldLevel = user.level;
      user.level = calculateLevel(user.xp); // Implement calculateLevel

      if (user.level > oldLevel) {
        // User leveled up, send notification
        notifyLevelUp(userId, user.level);
      }
    }

    await user.save();
    return user;

  } catch (error) {
    console.error(`Error updating voice XP for user ${userId}:`, error);
  }
}

// Function to calculate XP based on duration

function calculateXP(durationInSeconds) {
  // Implement your XP calculation logic here
  // For example, 1 XP per minute:
  return Math.floor(durationInSeconds / 3);
}

// Function to calculate level based on XP

function calculateLevel(xp) {
  // Implement your level calculation logic here
  // This is a simple example, you might want a more complex formula
  return Math.floor(0.1 * Math.sqrt(xp)) + 1; // Example: logarithmic scaling
}

// Function to notify user of level up (implementation depends on your bot framework)
function notifyLevelUp(userId, newLevel) {
  // This is a placeholder. You would use your bot's client to send a message to the user
  // For example, using discord.js:
  // client.users.cache.get(userId).send(`Congratulations! You've reached level ${newLevel}!`);
  console.log(`User ${userId} leveled up to ${newLevel}!`);
}

// Function to create a level-up embed
function createLevelUpEmbed(member, newLevel) {
  const { EmbedBuilder } = require('discord.js');
  return new EmbedBuilder()
    .setColor('#00ff00')
    .setDescription(`🎉 Congratulations ${member.user.username}! You leveled up to level **${newLevel}**!`)
    .setTimestamp();
}

// --- Example Usage in a Discord Bot Context ---

// You would need to integrate this system into your bot's event handlers.
// For example, in your 'voiceStateUpdate' event:

/*
client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = oldState.member.id;
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // User joined a voice channel
  if (!oldChannel && newChannel) {
    // Store join time (you'll need a mechanism to track this for each user)
    // Example: using a Map or storing in your user data
    // userVoiceJoinTimes.set(userId, Date.now());
  }

  // User left a voice channel
  if (oldChannel && !newChannel) {
    // Calculate duration and update XP
    // const joinTime = userVoiceJoinTimes.get(userId);
    // if (joinTime) {
    //   const durationInSeconds = (Date.now() - joinTime) / 1000;
    //   await updateUserVoiceXP(userId, durationInSeconds);
    //   userVoiceJoinTimes.delete(userId); // Clean up
    // }
  }

  // User moved to a different channel (optional: track time in old channel before starting in new)
  if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
     // Similar logic as leaving and joining
  }
});
*/

// Function to get a user's level and XP
async function getUserLevelAndXP(userId, guildId) {
  try {
    // For now, we'll use discordId as the primary key
    const user = await User.findOne({ discordId: userId });

    if (!user) {
      return null; // User not found
    }

    return {
      level: user.level,
      xp: user.xp,
    };
  } catch (error) {
    console.error(`Error getting level and XP for user ${userId}:`, error);
    return null; // Return null on error
  }
}

// Function to get leaderboard data (Placeholder - requires implementation)
async function getLeaderboard(guildId, limit = 10) {
  // Implement logic to fetch and sort users by level/XP for the leaderboard
  try {
    const leaderboard = await User.find().sort({ level: -1, xp: -1 }).limit(limit);
    return leaderboard;
  } catch (error) {
    console.error(`Error fetching leaderboard for guild ${guildId}:`, error);
    return [];
  }
}

module.exports = {
  updateUserVoiceXP,
  getUserLevelAndXP,
  getLeaderboard,
  createLevelUpEmbed,
  calculateXP,
  calculateLevel
};
// Remember to implement the `User` model and integrate the event handling within your bot's main file.