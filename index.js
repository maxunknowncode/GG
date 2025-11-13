const {
  Client,
  GatewayIntentBits,
  Partials,
} = require('discord.js');
const { startStatsUpdater } = require('./tasks/updateStats');
const { sendRegelwerk } = require('./tasks/sendRegelwerk');
const { ensureTicketEnvironment, setupTicketSystem } = require('./modules/tickets');
const { ensureInvitationMessage, setupInvitationModule } = require('./modules/invitations');
const { setupRegelwerkModule } = require('./modules/regelwerk');
const { setupJoin2CreateModule } = require('./modules/join2create');
const { setupWelcomeModule } = require('./modules/welcome');

const REQUIRED_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
];

const client = new Client({
  intents: REQUIRED_INTENTS,
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
  retryLimit: 2,
});

setupTicketSystem(client);
setupInvitationModule(client);
setupRegelwerkModule(client);
setupJoin2CreateModule(client);
setupWelcomeModule(client);

// Wartung 2024-05-16: Module für Tickets, Regelwerk, Einladungen, Welcome, Join2Create und Statistiken mit robusterer Fehlerbehandlung & Logging versehen.
client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  startStatsUpdater(client);

  try {
    await ensureTicketEnvironment(client);
    console.log('Ticket-System erfolgreich initialisiert.');
  } catch (error) {
    console.error('Ticket-System konnte nicht vollständig initialisiert werden:', error);
  }

  try {
    await sendRegelwerk(client, { replaceExisting: true });
    console.log('Regelwerk wurde erfolgreich gesendet.');
  } catch (error) {
    console.error('Senden des Regelwerks beim Start fehlgeschlagen:', error);
  }

  try {
    await ensureInvitationMessage(client);
    console.log('Einladungsnachricht wurde erfolgreich gesendet oder aktualisiert.');
  } catch (error) {
    console.error('Einladungsnachricht konnte nicht verarbeitet werden:', error);
  }
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

let loginInProgress = false;
let loginCompleted = false;

function shouldRetryLogin(error) {
  if (!error) {
    return true;
  }

  const fatalCodes = new Set(['TokenInvalid', 'TOKEN_INVALID']);
  if (fatalCodes.has(error.code) || error.httpStatus === 401) {
    return false;
  }

  const message = String(error.message ?? '').toUpperCase();
  if (message.includes('TOKEN INVALID') || message.includes('INVALID TOKEN')) {
    return false;
  }

  return true;
}

async function loginWithRetry(token, maxAttempts = 5) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      await client.login(token);
      loginCompleted = true;
      return;
    } catch (error) {
      lastError = error;
      console.error(`Login attempt ${attempt} failed:`, error);

      if (!shouldRetryLogin(error) || attempt >= maxAttempts) {
        throw error;
      }

      const waitTime = Math.min(30_000, 2 ** attempt * 1_000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  if (lastError) {
    throw lastError;
  }
}

async function ensureLoggedIn() {
  if (loginInProgress || loginCompleted) {
    return;
  }

  loginInProgress = true;

  const token = process.env.TOKEN;
  if (!token) {
    console.error('TOKEN is not defined in environment variables.');
    loginInProgress = false;
    return;
  }

  try {
    await loginWithRetry(token);
  } catch (error) {
    if (shouldRetryLogin(error)) {
      console.error('Login failed after multiple attempts. Retrying in 60 seconds.');
      setTimeout(() => {
        loginInProgress = false;
        ensureLoggedIn().catch((retryError) => {
          console.error('Retrying login failed:', retryError);
        });
      }, 60_000);
      return;
    }

    console.error('Login failed due to a fatal error. Please check the token configuration.');
  } finally {
    loginInProgress = false;
  }
}

ensureLoggedIn().catch((error) => {
  console.error('Failed to initiate login process:', error);
});
