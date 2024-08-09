"""
DBS main module
"""
import os
import discord
import requests
from typing import Final
from dotenv import load_dotenv
from discord import app_commands
from discord.ext import commands
from discord import Intents, Client, Message
from src.utils.pyautogui_gmail import login_via_bitwarden

# STEP 0: LOAD OUR DISCORD_TOKEN FROM .env FILE
load_dotenv()
upload_folder = "data"
os.makedirs(upload_folder, exist_ok=True)
DISCORD_TOKEN: Final[str] = os.getenv("DISCORD_TOKEN")

intents: Intents = Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="/", intents=discord.Intents.all())


@bot.event
async def on_ready():
    print("Bot is ready")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(str(e))

@bot.tree.command(name="email")
@app_commands.describe(query="Type email description here")
async def email(interaction: discord.Interaction, query: str):
    await interaction.response.defer()
    try:
        response = "Hello Email"
        await interaction.followup.send(f"{response}")
    except discord.errors.NotFound as e:
        print(f"Interaction error: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


async def send_message(message: discord.Message, user_message: str) -> None:
    if not user_message:
        print("(Message was empty because intents were not enabled probably)")
        return
    is_private = user_message[0] == "?"
    if is_private:
        user_message = user_message[1:]
    try:
        # Use the typing context manager to show typing indicator
        async with message.channel.typing():
            response: str = await login_via_bitwarden()
            chunks = [response[i : i + 2000] for i in range(0, len(response), 2000)]
            for chunk in chunks:
                if is_private:
                    await message.author.send(chunk)
                else:
                    await message.channel.send(chunk)
    except Exception as e:
        print(f"An error occurred while sending a message: {e}")

# STEP 4: HANDLING INCOMING MESSAGES
@bot.event
async def on_message(message: discord.Message) -> None:
    if message.author == bot.user:
        return
    user_message: str = message.content
    if not user_message.startswith("!crew"):
        return
    username: str = str(message.author)
    channel: str = str(message.channel)
    print(f'[{channel}] {username}: "{user_message}"')
    # Remove the prefix before sending the message to the processing function
    await send_message(message, user_message[len("!crew") :].strip())


# STEP 5: MAIN ENTRY POINT
def start_discord() -> None:
    bot.run(token=DISCORD_TOKEN)


if __name__ == "__main__":
    start_discord()
