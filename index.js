const { Client, GatewayIntentBits } = require('discord.js');
const { startStatsUpdater } = require('./tasks/updateStats');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  retryLimit: 2,
});

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  startStatsUpdater(client);
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('shardError', (error) => {
  console.error('Shard error:', error);
});

client.on('shardDisconnect', (event, shardId) => {
  console.warn(`Shard ${shardId} disconnected:`, event?.reason ?? 'unknown reason');
});

client.on('shardReconnecting', (shardId) => {
  console.info(`Shard ${shardId} versucht die Verbindung erneut.`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

client.login(process.env.TOKEN).catch((error) => {
  console.error('Fehler beim Login:', error);
  process.exit(1);
});
