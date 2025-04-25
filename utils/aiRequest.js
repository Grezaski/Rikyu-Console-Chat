const { GoogleGenerativeAI } = require("@google/generative-ai")

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/**
 * Get a reply from the Gemini API
 * @param {Array} chatHistory - The chat history
 * @param {String} botPersonality - The bot's personality description
 * @returns {Promise<String>} - The generated reply
 */
async function getGeminiReply(chatHistory, botPersonality) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in the .env file")
    }

    // Initialize the model (using Gemini Pro for text conversations)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Prepare the chat history for the API
    // We'll only send the last 10 messages to avoid token limits
    const recentHistory = chatHistory.slice(-10)

    // Format the history for Gemini and ensure it starts with a user message
    let formattedHistory = []

    // Filter and format the history to ensure it starts with a user message
    const userMessages = recentHistory.filter((entry) => entry.role === "user")
    const botMessages = recentHistory.filter((entry) => entry.role === "bot")

    if (userMessages.length > 0) {
      // If we have user messages, create a properly alternating history
      // Starting with the first user message
      const firstUserIndex = recentHistory.findIndex((entry) => entry.role === "user")

      // Only include messages from the first user message onwards
      const validHistory = recentHistory.slice(firstUserIndex)

      // Format the valid history
      formattedHistory = validHistory.map((entry) => ({
        role: entry.role === "user" ? "user" : "model",
        parts: [{ text: entry.message }],
      }))
    } else {
      // If no user messages exist yet, don't send any history
      formattedHistory = []
    }

    // If the history is empty or doesn't start with a user message, don't use history
    if (formattedHistory.length === 0 || formattedHistory[0].role !== "user") {
      // Don't use history for this request
      formattedHistory = []
    }

    // Create a chat session
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1000,
      },
    })

    // Add the personality as a system message
    const systemMessage = `${botPersonality}\nRespond to the user's latest message in character.`

    // Generate the response
    const result = await chat.sendMessage(systemMessage)
    const response = result.response.text()

    // Log the successful response (for debugging)
    // console.log("API response received successfully")

    return response
  } catch (error) {
    // Log the error for debugging
    console.error("Error in getGeminiReply:", error)

    // Return a friendly error message
    if (error.message.includes("API key")) {
      throw new Error("There seems to be an issue with the API key. Please check your .env file.")
    } else if (error.message.includes("network")) {
      throw new Error("Network error. Please check your internet connection.")
    } else {
      throw new Error("Could not generate a response. Please try again later.")
    }
  }
}

module.exports = { getGeminiReply }
