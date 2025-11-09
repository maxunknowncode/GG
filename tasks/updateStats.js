const CATEGORY_ID = '1437044994471886908';
const CHANNEL_CONFIG = [
  { id: '1437045028127117333', label: 'Mitglieder' },
  { id: '1437045058162528317', label: 'Online' },
  { id: '1437045090442022933', label: 'Boosts' },
];

const DEFAULT_INTERVAL_MS = 60_000;

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
  const nextName = `${label}: ${value}`;
  if (channel.name === nextName) {
    return;
  }

  try {
    await channel.setName(nextName);
  } catch (error) {
    console.error(`Failed to set channel name for ${channel.id}:`, error);
  }
}

async function computeStats(guild) {
  const members = await guild.members
    .fetch({ withPresences: true })
    .then(() => guild.memberCount)
    .catch((error) => {
      throw new Error(`Failed to fetch guild members: ${error.message}`);
    });

  const boosts = guild.premiumSubscriptionCount ?? 0;

  const onlineCount = guild.members.cache.filter((member) => {
    const status = member.presence?.status;
    return typeof status === 'string' && status !== 'offline';
  }).size;

  return {
    Mitglieder: members,
    Online: onlineCount,
    Boosts: boosts,
  };
}

async function updateGuildStats(client, guildId) {
  try {
    const guild = await fetchGuild(client, guildId);

    const stats = await computeStats(guild);

    await Promise.all(
      CHANNEL_CONFIG.map(async ({ id, label }) => {
        try {
          const channel = await resolveChannel(guild, id);
          if (!channel || channel.parentId !== CATEGORY_ID) {
            console.warn(`Channel ${id} not found or not in the expected category.`);
            return;
          }

          await updateVoiceChannelName(channel, label, stats[label]);
        } catch (error) {
          console.error(`Failed to update channel ${id}:`, error);
        }
      }),
    );
  } catch (error) {
    console.error('Failed to update guild stats:', error);
  }
}

function startStatsUpdater(client, options = {}) {
  const guildId = process.env.GUILD_ID;
  const interval = Number(options.interval ?? process.env.STATS_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);

  const runUpdate = () => updateGuildStats(client, guildId);

  runUpdate();
  return setInterval(runUpdate, interval);
}

module.exports = {
  startStatsUpdater,
};
