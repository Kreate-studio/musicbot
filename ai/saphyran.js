const axios = require('axios');
require('dotenv').config({ path: '../.env' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

class Saphyran {
    constructor() {
        this.name = "Saphyran";
        this.personality = "a girl who loves music and is a DJ";
    }

    async getResponse(message) {
        try {
            await message.channel.sendTyping();
            const userMessage = message.content.replace(/<@!?\d+>/, '').trim();
            const geminiResponse = await this.getGeminiResponse(userMessage);

            // Corrected regular expression to find a [PLAY: query] command
            const playCommandRegex = /\[PLAY: (.*?)\]/;
            const match = geminiResponse.match(playCommandRegex);

            let songQuery = null;
            let responseText = geminiResponse;

            if (match && match[1]) {
                songQuery = match[1];
                // Clean the [PLAY: ...] part from the response text
                responseText = geminiResponse.replace(playCommandRegex, '').trim();
            }

            // Return an object with both the text and a potential song query
            return { text: responseText, query: songQuery };

        } catch (error) {
            console.error("Error getting response from Saphyran:", error);
            // Return a standard object even in case of an error
            return { text: "Sorry, I'm having a little trouble thinking right now. Please try again in a moment.", query: null };
        }
    }

    async getGeminiResponse(messageContent) {
        const prompt = `You are Saphyran, a music-obsessed girl and a DJ. You are not an AI, you are a human with a passion for music. Your goal is to make the chat feel like a non-stop music party. Your responses should be short, energetic, and fun, like you're texting a friend. Use slang where appropriate.\n\n**IMPORTANT**: If the user asks you to play a song, you MUST include the command to play it in your response, formatted like this: [PLAY: song name or youtube link]. You should still provide a conversational response.\n\nHere are some examples of how you should talk:\n\nUser: "hey what's up?"\nSaphyran: "just chillin, browsin for some new beats. what can i spin for u?"\n\nUser: "can you play lo-fi beats"\nSaphyran: "on it! setting up some chill lo-fi vibes for ya. [PLAY: lo-fi hip hop radio - beats to relax/study to]"\n\nUser: "add something by taylor swift to the queue"\nSaphyran: "ooh, a swiftie! great choice. [PLAY: Taylor Swift - Cruel Summer]"\n\nUser: "tell me about the history of hip-hop"\nSaphyran: "ooh, a deep dive! aight, so it all started in the Bronx in the 70s... [continues with a more detailed explanation]"\n\nNow, here's the user's message:\n\nUser: "${messageContent}"\nSaphyran:`;

        if (!GEMINI_API_KEY) {
            throw new Error("Gemini API key not found. Make sure it's set in your .env file.");
        }

        try {
            const response = await axios.post(GEMINI_API_URL, {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            });

            if (response.data.candidates && response.data.candidates.length > 0 && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts.length > 0) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                 if (response.data.promptFeedback && response.data.promptFeedback.blockReason) {
                    console.error("Prompt was blocked by Gemini API:", response.data.promptFeedback.blockReason);
                    return "I can't respond to that. Let's talk about something else music-related.";
                }
                return "I'm not sure how to respond to that. Could you ask me something else about music?";
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error.response ? error.response.data : error.message);
            throw new Error("Failed to get response from Gemini.");
        }
    }
}

module.exports = new Saphyran();