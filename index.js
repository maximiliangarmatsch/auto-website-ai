/*
Discord module.
*/
import { Client, IntentsBitField } from "discord.js";
import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Import module
import { main_login } from "./src/utils/login_main_function.js";
import { main_response } from "./src/utils/main_function_response_generation.js";
import { logoutGmail } from "./src/utils/helper_functions.js";

// Create OpenAI object
const openai = new OpenAI({ apiKey: process.env.API_KEY });

// Create Client Instance
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});
// intialize variables
let login_status = false;
let result = "";
let page = null;
let browser = null;
// Display message when bot is ready
client.on("ready", () => {
  console.log("The bot is online!");
});

// Trigger on new message
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  // if (message.content.startsWith('!')) return;

  // Send typing indicator initially
  const sendTypingInterval = setInterval(() => {
    message.channel.sendTyping();
  }, 4000);

  // Intialize list to save conversation history
  let conversationLog = [];

  try {
    // Fetch last 15 messages as history.
    let prevMessages = await message.channel.messages.fetch({ limit: 15 });
    prevMessages.reverse();

    // loop over each message
    prevMessages.forEach((msg) => {
      if (msg.author.id !== client.user.id && message.author.bot) return;

      // Check if the Message Author is the Bot
      if (msg.author.id == client.user.id) {
        conversationLog.push({
          role: "assistant",
          content: msg.content,
          name: msg.author.username
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, ""),
        });
      }

      // Check if the Message Author is the User who Sent the Original Message
      if (msg.author.id == message.author.id) {
        conversationLog.push({
          role: "user",
          content: msg.content,
          name: message.author.username
            .replace(/\s+/g, "_")
            .replace(/[^\w\s]/gi, ""),
        });
      }
    });

    console.log(conversationLog);

    // Trim the user message
    const content = message.content.trim();

    // Check user message strat with !history
    if (content.startsWith("!history")) {
      const userQuery = content.slice("!history".length).trim();
      const result = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationLog,
        max_tokens: 2000, // limit token usage
      });
      message.reply(result.choices[0].message.content);
    }

    // Check user message strat with !logout
    else if (content.startsWith("!logout")) {
      // Logout google account
      if (login_status) {
        console.log("logout from Google account");

        // Call the logout function
        const logout_reponse = await logoutGmail(page);

        // Check logout response true or false
        if (logout_reponse) {
          message.reply("Successfully logged out.");
          // close the browser
          await browser.close();
        } else {
          message.reply("Failed to log out.");
        }
      }
    } else {
      let user_name = message.author.username;
      console.log(user_name);
      if (login_status) {
        [result, page, login_status, browser] = await main_response(
          message.content + " Action:email",
          page,
          browser
        );
      } else {
        [result, page, login_status, browser] = await main_login(
          message.content + " Action:email"
        );
      }
      message.reply(result);
    }

    //clear interval created for Typing
    clearInterval(sendTypingInterval);
  } catch (error) {
    console.log(`ERR: ${error}`);
  }
});
client.login(process.env.DISCORD_TOKEN);
