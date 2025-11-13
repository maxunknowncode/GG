const { ChannelType } = require('discord.js');
const { tickets } = require('../../config/ids');

const LOG_PREFIX = 'Ticket:';
const THREAD_STATE_REGEX = /^\[(?<state>[^\]]+)]\s*/i;
const THREAD_STATUS_EMOJI_REGEX = /^(?<emoji>🟢|🟡|🔴)\s*/;
const THREAD_NAME_REGEX = /^(?<type>[a-z0-9-]+)-(?<number>\d{3,})$/i;
const LEGACY_THREAD_NAME_REGEX =
  /^(?<channel>[a-z0-9-]+)-(?<number>\d+)-u(?<userId>\d{17,})$/i;

const THREAD_STATUS_EMOJIS = {
  OPEN: '🟢',
  CLAIMED: '🟡',
  CLOSED: '🔴',
};

let ticketCounter = 0;
let counterInitialized = false;
const ticketCreators = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractThreadState(name = '') {
  const emojiMatch = name.match(THREAD_STATUS_EMOJI_REGEX);
  if (emojiMatch?.groups?.emoji) {
    const emoji = emojiMatch.groups.emoji;
    const stateEntry = Object.entries(THREAD_STATUS_EMOJIS).find(
      ([, value]) => value === emoji,
    );
    if (stateEntry) {
      return stateEntry[0];
    }
  }

  const legacyMatch = name.match(THREAD_STATE_REGEX);
  return legacyMatch?.groups?.state?.toUpperCase?.() ?? null;
}

function extractBaseThreadName(name = '') {
  return name
    .replace(THREAD_STATUS_EMOJI_REGEX, '')
    .replace(THREAD_STATE_REGEX, '')
    .trim();
}

function parseThreadName(name = '') {
  const baseName = extractBaseThreadName(name);
  const modernMatch = baseName.match(THREAD_NAME_REGEX);

  if (modernMatch) {
    const { type, number } = modernMatch.groups;
    const typeKey = type.toLowerCase();
    return {
      baseName,
      typeKey,
      channelKey: typeKey,
      ticketNumber: Number.parseInt(number, 10),
      creatorId: null,
      state: extractThreadState(name),
    };
  }

  const legacyMatch = baseName.match(LEGACY_THREAD_NAME_REGEX);
  if (!legacyMatch) {
    return null;
  }

  const { channel, number, userId } = legacyMatch.groups;
  const typeKey = channel.toLowerCase();
  return {
    baseName,
    typeKey,
    channelKey: typeKey,
    ticketNumber: Number.parseInt(number, 10),
    creatorId: userId,
    state: extractThreadState(name),
  };
}

function formatBaseThreadName(typeKey, ticketNumber) {
  const paddedNumber = ticketNumber.toString().padStart(3, '0');
  return `${typeKey}-${paddedNumber}`;
}

function resolveStateEmoji(state) {
  if (!state) {
    return THREAD_STATUS_EMOJIS.OPEN;
  }

  const upperState = state.toUpperCase();
  return THREAD_STATUS_EMOJIS[upperState] ?? THREAD_STATUS_EMOJIS.OPEN;
}

function withThreadState(baseName, state = 'OPEN') {
  const cleanedBaseName = extractBaseThreadName(baseName) || baseName;
  const emoji = resolveStateEmoji(state);
  return `${emoji} ${cleanedBaseName}`.trim();
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

function buildThreadNameWithEmoji(currentName, emoji, fallbackBaseName) {
  if (!emoji) {
    return currentName;
  }

  if (THREAD_STATUS_EMOJI_REGEX.test(currentName)) {
    return currentName.replace(THREAD_STATUS_EMOJI_REGEX, `${emoji} `).trim();
  }

  const cleanedName =
    extractBaseThreadName(currentName) || fallbackBaseName || 'ticket';
  return `${emoji} ${cleanedName}`.trim();
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
    console.error(
      `${LOG_PREFIX} Failed to fetch active threads for ${channel.id}:`,
      error,
    );
  }

  let before;
  let hasMore = true;
  while (hasMore) {
    try {
      const archived = await channel.threads.fetchArchived({
        type: 'private',
        before,
      });
      archived.threads.forEach((thread) => {
        const parsed = parseThreadName(thread.name);
        if (parsed?.ticketNumber && parsed.ticketNumber > highest) {
          highest = parsed.ticketNumber;
        }
      });

      hasMore = archived.hasMore;
      before = archived.threads.last()?.id;
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to fetch archived threads for ${channel.id}:`,
        error,
      );
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
    console.error(
      `${LOG_PREFIX} Failed to fetch guild channels while initializing ticket counter:`,
      error,
    );
  }

  const channels = guild.channels.cache.filter(
    (channel) =>
      channel.parentId === tickets.openCategoryId &&
      channel.type === ChannelType.GuildText,
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

  let channel = null;

  if (option.channelId) {
    channel = guild.channels.cache.get(option.channelId) ?? null;

    if (!channel) {
      try {
        channel = (await guild.channels.fetch(option.channelId)) ?? null;
      } catch (error) {
        console.warn(
          `${LOG_PREFIX} Configured ticket channel ${option.channelId} for ${option.key} could not be fetched:`,
          error,
        );
      }
    }
  }

  if (channel && channel.type !== ChannelType.GuildText) {
    console.error(
      `${LOG_PREFIX} Configured ticket channel ${channel.id} for ${option.key} is not a text channel. A fallback channel will be used.`,
    );
    channel = null;
  }

  if (!channel) {
    channel = guild.channels.cache.find(
      (existingChannel) =>
        existingChannel.type === ChannelType.GuildText &&
        existingChannel.name === option.channelName,
    );
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error(
      `Ticket channel for ${option.key} could not be located or is not a text channel.`,
    );
  }

  return channel;
}

async function createTicketThread(channel, option, ticketNumber, creator) {
  const rawTypeKey = option?.key ?? option?.channelName ?? 'ticket';
  const sanitizedTypeKey = rawTypeKey.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const normalizedTypeKey =
    sanitizedTypeKey.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'ticket';
  const baseName = formatBaseThreadName(normalizedTypeKey, ticketNumber);
  const threadName = withThreadState(baseName, 'OPEN');

  try {
    const thread = await channel.threads.create({
      name: threadName,
      autoArchiveDuration: 1440,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Ticket erstellt von ${creator.tag} (${creator.id}) für ${option.key}`,
    });

    await delay(350);

    try {
      await thread.members.add(creator.id);
    } catch (memberError) {
      console.error(
        `${LOG_PREFIX} Failed to add creator ${creator.id} to thread ${thread.id}:`,
        memberError,
      );
    }

    ticketCreators.set(thread.id, creator.id);

    return { thread, baseName };
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to create ticket thread in ${channel.id}:`,
      error,
    );
    throw error;
  }
}

function extractUserIdFromString(text = '') {
  const match = text.match(/<@(?<id>\d{17,})>/);
  return match?.groups?.id ?? null;
}

function clearTicketCreator(threadId) {
  if (!threadId) {
    return;
  }

  ticketCreators.delete(threadId);
}

async function getTicketCreatorId(thread) {
  if (!thread) {
    return null;
  }

  if (ticketCreators.has(thread.id)) {
    return ticketCreators.get(thread.id) ?? null;
  }

  const parsed = parseThreadName(thread.name);
  if (parsed?.creatorId) {
    ticketCreators.set(thread.id, parsed.creatorId);
    return parsed.creatorId;
  }

  try {
    const starterMessage = await thread.fetchStarterMessage();
    const starterContentId = extractUserIdFromString(
      starterMessage?.content ?? '',
    );
    if (starterContentId) {
      ticketCreators.set(thread.id, starterContentId);
      return starterContentId;
    }

    const starterEmbedId = starterMessage?.embeds
      ?.map((embed) => extractUserIdFromString(embed?.description ?? ''))
      .find(Boolean);
    if (starterEmbedId) {
      ticketCreators.set(thread.id, starterEmbedId);
      return starterEmbedId;
    }
  } catch (error) {
    if (error?.code !== 10008) {
      console.error(
        `${LOG_PREFIX} Failed to fetch starter message for thread ${thread.id}:`,
        error,
      );
    }
  }

  try {
    let before;
    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const messages = await thread.messages.fetch({ limit: 100, before });
      if (!messages?.size) {
        break;
      }

      const sortedMessages = [...messages.values()].sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp,
      );

      for (const message of sortedMessages) {
        const contentId = extractUserIdFromString(message?.content ?? '');
        if (contentId) {
          ticketCreators.set(thread.id, contentId);
          return contentId;
        }

        const embedId = message?.embeds
          ?.map((embed) => extractUserIdFromString(embed?.description ?? ''))
          .find(Boolean);
        if (embedId) {
          ticketCreators.set(thread.id, embedId);
          return embedId;
        }
      }

      if (messages.size < 100) {
        break;
      }

      before = sortedMessages[0]?.id;
      if (!before) {
        break;
      }
    }
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to fetch messages for thread ${thread.id} to determine creator:`,
      error,
    );
  }

  return null;
}

module.exports = {
  buildThreadNameWithEmoji,
  clearTicketCreator,
  createTicketThread,
  ensureTicketChannel,
  formatBaseThreadName,
  getNextTicketNumber,
  getThreadState,
  getTicketCreatorId,
  initializeTicketCounter,
  isThreadClaimed,
  isThreadClosed,
  parseThreadName,
  withThreadState,
};
