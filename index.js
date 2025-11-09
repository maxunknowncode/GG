const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error('Fehler beim Login:', error);
  process.exit(1);
});
