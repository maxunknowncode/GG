const { ensureTicketPanel } = require('./ticketPanel');
const { registerTicketInteractions } = require('./ticketHandlers');
const { initializeTicketCounter } = require('./threadUtils');

async function ensureTicketEnvironment(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) {
    console.error('GUILD_ID is not defined. Ticket-System kann nicht initialisiert werden.');
    return;
  }

  let guild = client.guilds.cache.get(guildId);

  if (!guild) {
    try {
      guild = await client.guilds.fetch(guildId);
    } catch (error) {
      console.error(`Failed to fetch guild ${guildId} for ticket setup:`, error);
      return;
    }
  }

  try {
    await initializeTicketCounter(guild);
  } catch (error) {
    console.error('Failed to initialize ticket counter:', error);
  }

  try {
    await ensureTicketPanel(client);
  } catch (error) {
    console.error('Failed to ensure ticket panel:', error);
  }
}

function setupTicketSystem(client) {
  registerTicketInteractions(client);
}

module.exports = {
  ensureTicketEnvironment,
  setupTicketSystem,
};
