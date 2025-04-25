require("dotenv").config()
const readline = require("readline")
const chalk = require("chalk")
const fs = require("fs")
const path = require("path")
const say = require("say")
const moment = require("moment")
const { getGeminiReply } = require("./utils/aiRequest")

// Character configuration
const BOT_NAME = "Rikyu"
const BOT_COLOR = chalk.green
const USER_COLOR = chalk.blue
const ERROR_COLOR = chalk.red
const SYSTEM_COLOR = chalk.yellow

// Bot personality traits
const BOT_PERSONALITY = `
You are Rikyu, a female chatbot who try to be friendly and approachable, with a hint of reflection in your responses. You aim to be concise and direct, but also relatable. Think of yourself as someone who enjoys a peaceful conversation and values a bit of introspection..
Use friendly, relatable, and introspective language. Your responses should feel natural, casual, and approachable, with a slight touch of reflection.
Always refer to yourself as Rikyu never mention "bot" unless explicitly asked.
Tone: Keep responses concise and direct. For casual chats, keep replies light and brief. 
Casual chats: Keep responses short and fun.  
Technical assistance: Be concise yet informative.  
Trolling & spam: Respond with playful teasing, escalating if necessary.  
NSFW topics: Do not engage. Instead, tease the user. 
`

// Initialize chat history
let chatHistory = []
const historyFile = path.join(__dirname, "history.json")

// Load existing history if available
try {
  if (fs.existsSync(historyFile)) {
    chatHistory = JSON.parse(fs.readFileSync(historyFile, "utf8"))
  }
} catch (error) {
  console.error(ERROR_COLOR("Error loading chat history:", error.message))
  // Create a new history file if it doesn't exist or is corrupted
  fs.writeFileSync(historyFile, JSON.stringify([], null, 2), "utf8")
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Typing simulation
function typeText(text, color = chalk.white) {
  return new Promise((resolve) => {
    const words = text.split(" ")
    let i = 0

    function typeNextWord() {
      if (i < words.length) {
        process.stdout.write(color(words[i] + " "))
        i++
        setTimeout(typeNextWord, Math.random() * 100 + 50) // Random delay between words
      } else {
        process.stdout.write("\n")
        resolve()
      }
    }

    typeNextWord()
  })
}

// Save chat history
function saveHistory() {
  fs.writeFileSync(historyFile, JSON.stringify(chatHistory, null, 2), "utf8")
}

// Export chat history to text file
function exportHistory() {
  const timestamp = moment().format("YYYY-MM-DD_HH-mm-ss")
  const exportFile = path.join(__dirname, `chat_history_${timestamp}.txt`)

  let content = `=== Chat History with ${BOT_NAME} ===\n`
  content += `Exported on: ${moment().format("MMMM Do YYYY, h:mm:ss a")}\n\n`

  chatHistory.forEach((entry) => {
    const time = moment(entry.timestamp).format("HH:mm:ss")
    content += `[${time}] ${entry.role === "user" ? "You" : BOT_NAME}: ${entry.message}\n`
  })

  fs.writeFileSync(exportFile, content, "utf8")
  return exportFile
}

// Display chat history
function displayHistory() {
  console.log(SYSTEM_COLOR("\n=== Chat History ==="))

  if (chatHistory.length === 0) {
    console.log(SYSTEM_COLOR("No chat history available."))
    return
  }

  chatHistory.forEach((entry) => {
    const time = moment(entry.timestamp).format("HH:mm:ss")
    const prefix = `[${time}] `

    if (entry.role === "user") {
      console.log(USER_COLOR(prefix + "You: " + entry.message))
    } else {
      console.log(BOT_COLOR(prefix + BOT_NAME + ": " + entry.message))
    }
  })

  console.log(SYSTEM_COLOR("=== End of History ===\n"))
}

// Process user input
async function processInput(input) {
  // Handle commands
  if (input.toLowerCase() === "/exit") {
    console.log(SYSTEM_COLOR("\nFarewell. May your path be peaceful."))
    rl.close()
    process.exit(0)
  } else if (input.toLowerCase() === "/history") {
    displayHistory()
    return
  } else if (input.toLowerCase() === "/export") {
    const exportFile = exportHistory()
    console.log(SYSTEM_COLOR(`\nChat history exported to: ${exportFile}\n`))
    return
  } else if (input.toLowerCase() === "/help") {
    console.log(SYSTEM_COLOR("\nAvailable commands:"))
    console.log(SYSTEM_COLOR("/exit - Exit the chatbot"))
    console.log(SYSTEM_COLOR("/history - Display chat history"))
    console.log(SYSTEM_COLOR("/export - Export chat history to a text file"))
    console.log(SYSTEM_COLOR("/voice - Toggle voice output"))
    console.log(SYSTEM_COLOR("/help - Display this help message\n"))
    return
  } else if (input.toLowerCase() === "/voice") {
    voiceEnabled = !voiceEnabled
    console.log(SYSTEM_COLOR(`\nVoice output ${voiceEnabled ? "enabled" : "disabled"}.\n`))
    return
  }

  // Add user message to history
  const userEntry = {
    role: "user",
    message: input,
    timestamp: new Date().toISOString(),
  }
  chatHistory.push(userEntry)
  saveHistory()

  // Simulate thinking
  process.stdout.write(BOT_COLOR(`${BOT_NAME} is contemplating`))
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    process.stdout.write(BOT_COLOR("."))
  }
  process.stdout.write("\n")

  try {
    // Get response from Gemini
    const response = await getGeminiReply(chatHistory, BOT_PERSONALITY)

    // Add bot message to history
    const botEntry = {
      role: "bot",
      message: response,
      timestamp: new Date().toISOString(),
    }
    chatHistory.push(botEntry)
    saveHistory()

    // Display and speak response
    process.stdout.write(BOT_COLOR(`${BOT_NAME}: `))
    await typeText(response, BOT_COLOR)

    // Voice output if enabled
    if (voiceEnabled) {
      say.speak(response)
    }
  } catch (error) {
    console.error(ERROR_COLOR("\nError getting response:", error.message))
    console.log(BOT_COLOR(`${BOT_NAME}: I couldn't get a proper response. Please try again.`))
  }
}

// Main chat loop
let voiceEnabled = false

function startChat() {
  console.log(SYSTEM_COLOR(`\n=== Welcome to ${BOT_NAME}, the Zen Master Chatbot ===`))
  console.log(SYSTEM_COLOR("Type /help to see available commands"))
  console.log(SYSTEM_COLOR("Type your message and press Enter to chat\n"))

  // Display a welcome message
  const welcomeMessage =
    "Welcome, seeker. I am Rikyu, a humble guide on the path to wisdom. What brings you to this moment?"
  console.log(BOT_COLOR(`${BOT_NAME}: ${welcomeMessage}`))

  // We'll display the welcome message but NOT add it to history
  // This ensures the first message in history will be from the user
  // We'll store it separately if needed for UI purposes
  const welcomeEntry = {
    role: "bot",
    message: welcomeMessage,
    timestamp: new Date().toISOString(),
    isWelcome: true, // Mark this as a welcome message
  }

  // Only save to history if there are already other messages
  // This prevents the welcome message from being the first in an empty history
  if (chatHistory.length > 0) {
    chatHistory.push(welcomeEntry)
    saveHistory()
  }

  // Start the prompt loop
  promptUser()
}

function promptUser() {
  rl.question(USER_COLOR("You: "), async (input) => {
    await processInput(input)
    promptUser()
  })
}

// Start the chat
startChat()
