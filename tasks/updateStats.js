const { stats } = require('../config/ids');

const LOG_PREFIX = 'Stats:';

const CATEGORY_ID = stats?.categoryId;
const CHANNEL_CONFIG = Object.values(stats?.channels ?? {});

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_STATS = CHANNEL_CONFIG.reduce((accumulator, { label }) => {
  if (label) {
    accumulator[label] = 0;
  }
  return accumulator;
}, {});

let lastKnownStats = { ...DEFAULT_STATS };

async function fetchGuild(client, guildId) {
  if (!guildId) {
    throw new Error('GUILD_ID is not defined in environment variables.');
  }

  const cachedGuild = client.guilds.cache.get(guildId);
  if (cachedGuild) {
    return cachedGuild;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      throw new Error(`Guild with ID ${guildId} not found.`);
    }

    return guild;
  } catch (error) {
    throw new Error(`Failed to fetch guild: ${error.message}`);
  }
}

async function resolveChannel(guild, channelId) {
  if (!channelId) {
    throw new Error('Channel ID is missing in the stats configuration.');
  }

  const cachedChannel = guild.channels.cache.get(channelId);
  if (cachedChannel) {
    return cachedChannel;
  }

  try {
    return await guild.channels.fetch(channelId);
  } catch (error) {
    throw new Error(`Failed to fetch channel ${channelId}: ${error.message}`);
  }
}

async function updateVoiceChannelName(channel, label, value) {
  if (!channel || typeof channel.setName !== 'function') {
    return;
  }

  const nextName = `${label}: ${value}`;
  if (channel.name === nextName) {
    return;
  }

  try {
    await channel.setName(nextName);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to set channel name for ${channel?.id ?? 'unknown'}:`, error);
  }
}

async function computeStats(guild) {
  const stats = { ...lastKnownStats };

  try {
    await guild.members.fetch({ withPresences: true });
    if ('Mitglieder' in stats) {
      stats.Mitglieder = guild.memberCount;
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch guild members:`, error);
  }

  try {
    if ('Online' in stats) {
      const onlineCount = guild.members.cache.filter((member) => {
        const status = member.presence?.status;
        return typeof status === 'string' && status !== 'offline';
      }).size;

      stats.Online = onlineCount;
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to compute online members:`, error);
  }

  try {
    if ('Boosts' in stats) {
      stats.Boosts = guild.premiumSubscriptionCount ?? stats.Boosts;
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to determine boost count:`, error);
  }

  lastKnownStats = stats;
  return stats;
}

async function updateGuildStats(client, guildId) {
  if (!CATEGORY_ID || CHANNEL_CONFIG.length === 0) {
    console.warn(`${LOG_PREFIX} Stats configuration is incomplete. Skipping stats update.`);
    return;
  }

  try {
    const guild = await fetchGuild(client, guildId);

    const stats = await computeStats(guild);

    await Promise.all(
      CHANNEL_CONFIG.map(async ({ id, label }) => {
        if (!id || !label) {
          return;
        }

        try {
          const channel = await resolveChannel(guild, id);
          if (!channel || channel.parentId !== CATEGORY_ID) {
    console.warn(`${LOG_PREFIX} Channel ${id} not found or not in the expected category.`);
            return;
          }

          await updateVoiceChannelName(channel, label, stats[label]);
        } catch (error) {
          console.error(`${LOG_PREFIX} Failed to update channel ${id}:`, error);
        }
      }),
    );
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update guild stats:`, error);
  }
}

function startStatsUpdater(client, options = {}) {
  const guildId = process.env.GUILD_ID;
  const interval = Number(options.interval ?? process.env.STATS_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  const resolvedInterval = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_INTERVAL_MS;
  let isRunning = false;

  const runUpdate = async () => {
    if (isRunning) {
      console.warn(`${LOG_PREFIX} Stats update skipped because previous run is still in progress.`);
      return;
    }

    isRunning = true;
    try {
      await updateGuildStats(client, guildId);
    } catch (error) {
      console.error(`${LOG_PREFIX} Unexpected error during stats update:`, error);
    } finally {
      isRunning = false;
    }
  };

  runUpdate().catch((error) => {
    console.error(`${LOG_PREFIX} Initial stats update failed:`, error);
  });

  return setInterval(() => {
    runUpdate().catch((error) => {
      console.error(`${LOG_PREFIX} Scheduled stats update failed:`, error);
    });
  }, resolvedInterval);
}

module.exports = {
  startStatsUpdater,
};
