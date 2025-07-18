import discord
import asyncio
import subprocess
import os

# --- Configuration ---
# Replace with your actual bot token from the Discord Developer Portal
BOT_TOKEN = "MTM5NTU0MDE4MzM2OTM4Mzk2OA.G4yCSD.-LUXTj81G9oCjNPspkcnWfH3gLZdJJWstpu1Hk" 
# The ID of the server the bot will operate in
SERVER_ID = 758474707187662901
# The ID of the channel the bot will listen to and post updates in
CHANNEL_ID = 1395539882713153666

# --- Bot Setup ---
intents = discord.Intents.default()
intents.messages = True
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    """
    This function is called when the bot has successfully connected to Discord.
    It will send a startup message to the specified channel.
    """
    print(f'We have logged in as {client.user}')
    await client.change_presence(activity=discord.Game(name="Awaiting Commands"))
    
    # Get the channel object to send the startup message
    channel = client.get_channel(CHANNEL_ID)
    if channel:
        await channel.send("✅ VPS Bot is online. Ready for output.")
    else:
        print(f"Error: Could not find channel with ID {CHANNEL_ID}")

@client.event
async def on_message(message):
    """
    This function is called every time a message is sent in a channel the bot can see.
    """
    # Ignore messages from the bot itself to prevent loops
    if message.author == client.user:
        return

    # Check if the message is in the correct server and channel
    if message.guild.id == SERVER_ID and message.channel.id == CHANNEL_ID:
        command = message.content
        
        await message.add_reaction('⏳')

        try:
            # Execute the command in a subprocess
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            output_message = await message.channel.send(f"```Running command:\n$ {command}\n\n[Output will appear here]```")
            
            last_output = ""
            while process.returncode is None:
                output_bytes, error_bytes = await asyncio.gather(
                    process.stdout.read(1024),
                    process.stderr.read(1024)
                )
                
                output = output_bytes.decode(errors='ignore')
                error = error_bytes.decode(errors='ignore')
                full_output = last_output + output + error

                if full_output != last_output:
                    display_output = "..." + full_output[-1900:] if len(full_output) > 1900 else full_output
                    await output_message.edit(content=f"```Running command:\n$ {command}\n\n{display_output}```")
                    last_output = full_output

                await asyncio.sleep(5)

            stdout, stderr = await process.communicate()
            final_output = stdout.decode() + stderr.decode()
            
            display_final = "..." + final_output[-1900:] if len(final_output) > 1900 else final_output
            
            await output_message.edit(content=f"```Command finished with exit code {process.returncode}:\n$ {command}\n\n{display_final}```")
            
            await message.add_reaction('✅')

        except Exception as e:
            await message.channel.send(f"An error occurred: {e}")
            await message.add_reaction('❌')
        finally:
            await message.remove_reaction('⏳', client.user)

# --- Run the bot ---
client.run(BOT_TOKEN)
