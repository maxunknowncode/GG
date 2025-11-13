const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { tickets } = require('../../config/ids');

const LOG_PREFIX = 'Ticket:';

function buildTicketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎟️ Ticket-Center')
    .setColor(0xf9a602)
    .setDescription(
      [
        'Willkommen im Ticket-Center! Bitte wähle die Kategorie, die am besten zu deinem Anliegen passt.',
        'Unser Team meldet sich schnellstmöglich bei dir. Missbrauch führt zu Sanktionen.',
      ].join('\n'),
    )
    .setFooter({ text: 'Tickets werden als private Threads erstellt.' })
    .setTimestamp();
}

function buildTicketPanelComponents() {
  if (!tickets?.selectCustomId || !Array.isArray(tickets?.options) || tickets.options.length === 0) {
    throw new Error('Ticket: Ticket panel configuration is incomplete.');
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(tickets.selectCustomId)
    .setPlaceholder('Wähle eine Ticket-Kategorie')
    .setMinValues(1)
    .setMaxValues(1);

  tickets.options.forEach((option) => {
    selectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(option.label)
        .setValue(option.value)
        .setDescription(option.description)
        .setEmoji(option.emoji),
    );
  });

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

async function ensureTicketPanel(client) {
  if (!tickets) {
    console.error(`${LOG_PREFIX} Ticket-Konfiguration fehlt in config/ids.js.`);
    return null;
  }

  if (!Array.isArray(tickets.options) || tickets.options.length === 0) {
    console.error(`${LOG_PREFIX} Ticket-Optionen sind nicht konfiguriert.`);
    return null;
  }

  if (!tickets.panelChannelId) {
    console.error(`${LOG_PREFIX} Ticket panel channel ID is missing in the configuration.`);
    return null;
  }

  const channelId = tickets.panelChannelId;
  let channel = client.channels.cache.get(channelId);

  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to fetch ticket panel channel ${channelId}:`, error);
      return null;
    }
  }

  if (!channel?.isTextBased?.()) {
    console.error(`${LOG_PREFIX} Configured ticket panel channel ${channelId} is not text-based.`);
    return null;
  }

  if (tickets.panelCategoryId && channel.parentId !== tickets.panelCategoryId) {
    console.warn(
      `${LOG_PREFIX} Ticket panel channel ${channelId} is not located in the expected category ${tickets.panelCategoryId}.`,
    );
  }

  const embed = buildTicketPanelEmbed();
  let components;

  try {
    components = buildTicketPanelComponents();
  } catch (componentError) {
    console.error(`${LOG_PREFIX} ${componentError.message}`);
    return null;
  }

  try {
    const fetchedMessages = await channel.messages.fetch({ limit: 50 });
    const panelMessages = fetchedMessages.filter((message) => {
      if (message.author.id !== client.user.id || message.components.length === 0) {
        return false;
      }

      return message.components.some((row) =>
        row.components.some((component) => component.customId === tickets.selectCustomId),
      );
    });

    if (panelMessages.size === 0) {
      try {
        const sentMessage = await channel.send({
          embeds: [embed],
          components,
          allowedMentions: { parse: [] },
        });

        return sentMessage;
      } catch (sendError) {
        console.error(`${LOG_PREFIX} Failed to send ticket panel message in ${channelId}:`, sendError);
        return null;
      }
    }

    const sorted = panelMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const keepMessage = sorted.last() ?? panelMessages.first();

    if (keepMessage) {
      try {
        await keepMessage.edit({ embeds: [embed], components, allowedMentions: { parse: [] } });
      } catch (editError) {
        console.error(`${LOG_PREFIX} Failed to edit ticket panel message ${keepMessage.id}:`, editError);
      }
    }

    for (const [messageId, message] of panelMessages) {
      if (keepMessage && messageId === keepMessage.id) {
        continue;
      }

      try {
        await message.delete();
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to delete outdated ticket panel message ${messageId}:`, error);
      }
    }

    return keepMessage;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to ensure ticket panel message:`, error);
    return null;
  }
}

module.exports = {
  buildTicketPanelComponents,
  buildTicketPanelEmbed,
  ensureTicketPanel,
};
