const {
  ChannelType,
  PermissionFlagsBits,
  ThreadAutoArchiveDuration,
} = require('discord.js');
const { tickets, roles } = require('../../config/ids');

const WAIT_AFTER_CHANNEL_MS = 500;
const THREAD_STATE_REGEX = /^\[(?<state>[^\]]+)]\s*/i;
const THREAD_NAME_REGEX = /^(?<channel>[a-z0-9-]+)-(?<number>\d+)-u(?<userId>\d{17,})$/i;

let ticketCounter = 0;
let counterInitialized = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractThreadState(name = '') {
  const match = name.match(THREAD_STATE_REGEX);
  return match?.groups?.state?.toUpperCase?.() ?? null;
}

function extractBaseThreadName(name = '') {
  return name.replace(THREAD_STATE_REGEX, '').trim();
}

function parseThreadName(name = '') {
  const baseName = extractBaseThreadName(name);
  const match = baseName.match(THREAD_NAME_REGEX);
  if (!match) {
    return null;
  }

  const { channel, number, userId } = match.groups;
  return {
    baseName,
    channelKey: channel.toLowerCase(),
    ticketNumber: Number.parseInt(number, 10),
    creatorId: userId,
    state: extractThreadState(name),
  };
}

function formatBaseThreadName(channelKey, ticketNumber, creatorId) {
  const paddedNumber = ticketNumber.toString().padStart(4, '0');
  return `${channelKey}-${paddedNumber}-u${creatorId}`;
}

function withThreadState(baseName, state) {
  if (!state) {
    return baseName;
  }

  const upperState = state.toUpperCase();
  return `[${upperState}] ${baseName}`;
}

function getThreadState(name = '') {
  return extractThreadState(name);
}

function isThreadClaimed(name = '') {
  return getThreadState(name) === 'CLAIMED';
}

function isThreadClosed(name = '') {
  return getThreadState(name) === 'CLOSED';
}

function getNextTicketNumber() {
  ticketCounter += 1;
  return ticketCounter;
}

async function computeChannelMaxTicketNumber(channel) {
  let highest = 0;

  try {
    const activeThreads = await channel.threads.fetchActive();
    activeThreads.threads.forEach((thread) => {
      const parsed = parseThreadName(thread.name);
      if (parsed?.ticketNumber && parsed.ticketNumber > highest) {
        highest = parsed.ticketNumber;
      }
    });
  } catch (error) {
    console.error(`Failed to fetch active threads for ${channel.id}:`, error);
  }

  let before;
  let hasMore = true;
  while (hasMore) {
    try {
      const archived = await channel.threads.fetchArchived({ type: 'private', before });
      archived.threads.forEach((thread) => {
        const parsed = parseThreadName(thread.name);
        if (parsed?.ticketNumber && parsed.ticketNumber > highest) {
          highest = parsed.ticketNumber;
        }
      });

      hasMore = archived.hasMore;
      before = archived.threads.last()?.id;
    } catch (error) {
      console.error(`Failed to fetch archived threads for ${channel.id}:`, error);
      break;
    }

    if (hasMore) {
      await delay(350);
    }
  }

  return highest;
}

async function initializeTicketCounter(guild) {
  if (counterInitialized) {
    return;
  }

  if (!guild || !tickets?.openCategoryId) {
    counterInitialized = true;
    ticketCounter = 0;
    return;
  }

  let highest = 0;
  try {
    await guild.channels.fetch();
  } catch (error) {
    console.error('Failed to fetch guild channels while initializing ticket counter:', error);
  }

  const channels = guild.channels.cache.filter(
    (channel) => channel.parentId === tickets.openCategoryId && channel.type === ChannelType.GuildText,
  );

  const channelIds = Array.from(channels.keys());

  for (const channelId of channelIds) {
    const channel = channels.get(channelId);
    if (!channel) {
      continue;
    }

    const maxNumber = await computeChannelMaxTicketNumber(channel);
    if (maxNumber > highest) {
      highest = maxNumber;
    }
  }

  ticketCounter = highest;
  counterInitialized = true;
}

async function ensureTicketChannel(guild, option) {
  if (!guild || !option) {
    throw new Error('Missing guild or ticket option to ensure ticket channel.');
  }

  const openCategoryId = tickets?.openCategoryId;
  if (!openCategoryId) {
    throw new Error('Open ticket category ID is not configured.');
  }

  const everyoneRole = guild.roles.everyone;
  const teamRoleId = roles?.team;
  const botMember = guild.members.me;

  if (!botMember) {
    throw new Error('Bot member is not available in the guild.');
  }

  let channel = null;

  if (option.channelId) {
    channel = guild.channels.cache.get(option.channelId) ?? null;

    if (!channel) {
      try {
        channel = (await guild.channels.fetch(option.channelId)) ?? null;
      } catch (error) {
        console.warn(
          `Configured ticket channel ${option.channelId} for ${option.key} could not be fetched:`,
          error,
        );
      }
    }
  }

  if (channel && channel.type !== ChannelType.GuildText) {
    console.error(
      `Configured ticket channel ${channel.id} for ${option.key} is not a text channel. A fallback channel will be used.`,
    );
    channel = null;
  }

  if (!channel) {
    channel = guild.channels.cache.find(
      (existingChannel) =>
        existingChannel.type === ChannelType.GuildText && existingChannel.name === option.channelName,
    );
  }

  if (!channel) {
    try {
      const overwrites = [
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ];

      if (teamRoleId) {
        overwrites.push({
          id: teamRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageThreads,
          ],
        });
      }

      overwrites.push({
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.ManageMessages,
        ],
      });

      channel = await guild.channels.create({
        name: option.channelName,
        type: ChannelType.GuildText,
        parent: openCategoryId,
        reason: `Ticket channel for ${option.key}`,
        permissionOverwrites: overwrites,
      });

      await delay(WAIT_AFTER_CHANNEL_MS);
    } catch (error) {
      console.error(`Failed to create ticket channel ${option.channelName}:`, error);
      throw error;
    }
  } else {
    const overwrites = [];

    if (channel.parentId !== openCategoryId) {
      try {
        await channel.setParent(openCategoryId, { lockPermissions: false });
      } catch (error) {
        console.error(`Failed to move channel ${channel.id} to open category:`, error);
      }
    }

    try {
      overwrites.push({
        id: everyoneRole.id,
        deny: [PermissionFlagsBits.ViewChannel],
      });

      if (teamRoleId) {
        overwrites.push({
          id: teamRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageThreads,
          ],
        });
      }

      overwrites.push({
        id: botMember.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.ManageMessages,
        ],
      });

      await channel.permissionOverwrites.set(overwrites);
    } catch (error) {
      console.error(`Failed to sync permission overwrites for ${channel.id}:`, error);
    }
  }

  return channel;
}

async function createTicketThread(channel, option, ticketNumber, creator) {
  const baseName = formatBaseThreadName(option.channelName, ticketNumber, creator.id);
  const threadName = withThreadState(baseName);

  try {
    const thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Ticket erstellt von ${creator.tag} (${creator.id}) für ${option.key}`,
    });

    await delay(350);

    try {
      await thread.members.add(creator.id);
    } catch (memberError) {
      console.error(`Failed to add creator ${creator.id} to thread ${thread.id}:`, memberError);
    }

    return { thread, baseName };
  } catch (error) {
    console.error(`Failed to create ticket thread in ${channel.id}:`, error);
    throw error;
  }
}

module.exports = {
  createTicketThread,
  ensureTicketChannel,
  formatBaseThreadName,
  getNextTicketNumber,
  getThreadState,
  initializeTicketCounter,
  isThreadClaimed,
  isThreadClosed,
  parseThreadName,
  withThreadState,
};
