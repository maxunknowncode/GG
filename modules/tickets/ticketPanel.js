const {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { tickets } = require('../../config/ids');

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
  if (!tickets?.panelChannelId) {
    console.error('Ticket panel channel ID is missing in the configuration.');
    return null;
  }

  const channelId = tickets.panelChannelId;
  let channel = client.channels.cache.get(channelId);

  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (error) {
      console.error(`Failed to fetch ticket panel channel ${channelId}:`, error);
      return null;
    }
  }

  if (!channel?.isTextBased?.()) {
    console.error(`Configured ticket panel channel ${channelId} is not text-based.`);
    return null;
  }

  if (tickets.panelCategoryId && channel.parentId !== tickets.panelCategoryId) {
    console.warn(
      `Ticket panel channel ${channelId} is not located in the expected category ${tickets.panelCategoryId}.`,
    );
  }

  const embed = buildTicketPanelEmbed();
  const components = buildTicketPanelComponents();

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
      const sentMessage = await channel.send({
        embeds: [embed],
        components,
        allowedMentions: { parse: [] },
      });

      return sentMessage;
    }

    const sorted = panelMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const keepMessage = sorted.last() ?? panelMessages.first();

    if (keepMessage) {
      await keepMessage.edit({ embeds: [embed], components, allowedMentions: { parse: [] } });
    }

    for (const [messageId, message] of panelMessages) {
      if (keepMessage && messageId === keepMessage.id) {
        continue;
      }

      try {
        await message.delete();
      } catch (error) {
        console.error(`Failed to delete outdated ticket panel message ${messageId}:`, error);
      }
    }

    return keepMessage;
  } catch (error) {
    console.error('Failed to ensure ticket panel message:', error);
    return null;
  }
}

module.exports = {
  buildTicketPanelComponents,
  buildTicketPanelEmbed,
  ensureTicketPanel,
};
