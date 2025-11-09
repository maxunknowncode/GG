const { Client, GatewayIntentBits } = require('discord.js');
const { startStatsUpdater } = require('./tasks/updateStats');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  startStatsUpdater(client);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error('Fehler beim Login:', error);
  process.exit(1);
});
