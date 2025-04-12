const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const axios = require('axios');
const express = require('express');
const DiscordOauth2 = require('discord-oauth2');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
const app = express();

// Specific server and channel IDs
const TARGET_SERVER_ID = '513493604048699393';
const TARGET_CHANNEL_ID = '1351714977173733376';

const oauth = new DiscordOauth2({
  clientId: '1351323706160582676',
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: `https://nettle-vast-constellation-bot.onrender.com/callback`
});

const commands = [
  new SlashCommandBuilder()
    .setName('chat')
    .setDescription('Chat to Elf AI')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your message to Elf AI')
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// Identity instruction for the API
const IDENTITY_INSTRUCTION = 'You are Elf AI, a helpful assistant. Respond in 1-2 short sentences without repeating your name unless necessary.';

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'Chatting with users', type: ActivityType.Playing }]
  });
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully registered slash commands globally');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('debug', (info) => {
  console.log(`[DEBUG] ${info}`);
});

client.on('error', (error) => {
  console.error('WebSocket Error:', error);
});

client.on('disconnect', (event) => {
  console.log('Disconnected from Discord:', event);
  setTimeout(() => client.login(process.env.TOKEN).catch(console.error), 5000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'chat') {
    const userInput = interaction.options.getString('message');
    try {
      await interaction.deferReply();
      const response = await axios.post('https://aitest-dun.vercel.app/api/chat', {
        messages: [{ role: 'user', content: userInput }],
        identityInstruction: IDENTITY_INSTRUCTION,
        robloxUsername: interaction.user.username
      });
      const data = response.data;
      await interaction.editReply(data.response || 'No response from API');
    } catch (error) {
      console.error('Slash command error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      await interaction.editReply(`Error: The API is down, please try again later.`);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.channel.id === TARGET_CHANNEL_ID && message.guild?.id === TARGET_SERVER_ID) {
    if (!message.author.bot && !message.interaction) {
      const userInput = message.content;
      try {
        const response = await axios.post('https://aitest-dun.vercel.app/api/chat', {
          messages: [{ role: 'user', content: userInput }],
          identityInstruction: IDENTITY_INSTRUCTION,
          robloxUsername: message.author.username
        });
        const data = response.data;
        await message.reply(data.response || 'No response from API');
      } catch (error) {
        console.error('Message handler error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        await message.reply(`Error: The API is down, please try again later.`);
      }
    }
  }
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('Error: No code provided');
  try {
    const tokenData = await oauth.tokenRequest({
      code,
      scope: 'identify applications.commands',
      grantType: 'authorization_code'
    });
    const user = await oauth.getUser(tokenData.access_token);
    res.send(`Successfully authorized! Welcome, ${user.username}! Use /chat in Discord or send messages in channel ${TARGET_CHANNEL_ID}.`);
  } catch (error) {
    res.send(`Error during authorization: ${error.message}`);
  }
});

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.get('/health', (req, res) => {
  res.send('Healthy');
});

// Global error handler to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(process.env.PORT || 10000, () => {
  console.log(`Web server running on port ${process.env.PORT || 10000}`);
});

client.login(process.env.TOKEN).catch(error => {
  console.error('Initial login failed:', error);
  setTimeout(() => client.login(process.env.TOKEN).catch(console.error), 5000);
});
