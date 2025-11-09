const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { tickets, roles } = require('../../config/ids');
const {
  createTicketThread,
  ensureTicketChannel,
  getNextTicketNumber,
  initializeTicketCounter,
  isThreadClaimed,
  isThreadClosed,
  parseThreadName,
  withThreadState,
} = require('./ticketThread');

const TICKET_EMBED_COLOR = 0xf9a602;
const STATUS_EMBED_COLORS = {
  claim: 0x57f287,
  close: 0xed4245,
};
let handlersRegistered = false;

function buildStatusEmbed(color, description) {
  return new EmbedBuilder().setColor(color).setDescription(description).setTimestamp();
}

function buildTicketEmbed(option, userId, ticketNumber) {
  const ticketId = `T-${ticketNumber.toString().padStart(4, '0')}`;

  return new EmbedBuilder()
    .setTitle(`🎫 Ticket – ${option.categoryName}`)
    .setColor(TICKET_EMBED_COLOR)
    .setDescription(
      [
        `**Ticket für:** <@${userId}>`,
        `**Ticket-ID:** \`${ticketId}\``,
        '',
        'Bitte schildere dein Anliegen so genau wie möglich.',
        'Screenshots, IDs oder weitere Details helfen bei der Bearbeitung.',
        '',
        'Ein Teammitglied meldet sich hier schnellstmöglich.',
        'Teammitglieder können das Ticket mit **„Claim Ticket“** übernehmen.',
      ].join('\n'),
    )
    .setFooter({ text: 'Nur der Ticket-Ersteller und das Team sehen dieses Ticket.' })
    .setTimestamp();
}

function buildTicketActionRow({ claimed = false } = {}) {
  const closeButton = new ButtonBuilder()
    .setCustomId(tickets.closeCustomId)
    .setLabel('Ticket schließen')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️');

  const claimButton = new ButtonBuilder()
    .setCustomId(tickets.claimCustomId)
    .setLabel('Claim Ticket')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🛡️')
    .setDisabled(Boolean(claimed));

  return [new ActionRowBuilder().addComponents(closeButton, claimButton)];
}

function rebuildActionRowsWithDisabledClaim(message) {
  return message.components.map((row) => {
    const newRow = new ActionRowBuilder();

    row.components.forEach((component) => {
      if (component.customId !== tickets.claimCustomId) {
        newRow.addComponents(ButtonBuilder.from(component));
        return;
      }

      const disabledClaimButton = ButtonBuilder.from(component).setDisabled(true);
      newRow.addComponents(disabledClaimButton);
    });

    return newRow;
  });
}

async function handleTicketSelection(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Tickets können nur innerhalb des Servers erstellt werden.',
      ephemeral: true,
    });
    return;
  }

  const selectedValue = interaction.values?.[0];
  if (!selectedValue) {
    await interaction.reply({ content: 'Bitte wähle eine gültige Ticket-Kategorie.', ephemeral: true });
    return;
  }

  const option = tickets.options.find((entry) => entry.value === selectedValue);
  if (!option) {
    await interaction.reply({ content: 'Die ausgewählte Ticket-Kategorie ist ungültig.', ephemeral: true });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (error) {
    console.error('Failed to defer ticket selection reply:', error);
  }

  const guild = interaction.guild;

  try {
    await initializeTicketCounter(guild);
    const channel = await ensureTicketChannel(guild, option);
    const ticketNumber = getNextTicketNumber();
    const { thread } = await createTicketThread(channel, option, ticketNumber, interaction.user);
    const embed = buildTicketEmbed(option, interaction.user.id, ticketNumber);
    const components = buildTicketActionRow();

    await thread.send({
      embeds: [embed],
      components,
      allowedMentions: { users: [interaction.user.id] },
    });

    const responseContent = `Dein Ticket wurde erstellt: ${thread}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: responseContent });
    } else {
      await interaction.reply({ content: responseContent, ephemeral: true });
    }
  } catch (error) {
    console.error('Failed to create ticket thread:', error);

    const errorMessage =
      'Beim Erstellen deines Tickets ist ein Fehler aufgetreten. Bitte versuche es später erneut.';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

async function handleTicketClaim(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Diese Aktion ist hier nicht verfügbar.', ephemeral: true });
    return;
  }

  const member = interaction.member;
  const teamRoleId = roles?.team;
  const hasTeamRole = Boolean(teamRoleId && member?.roles?.cache?.has(teamRoleId));

  if (!hasTeamRole) {
    await interaction.reply({ content: 'Nur Teammitglieder können Tickets claimen.', ephemeral: true });
    return;
  }

  const thread = interaction.channel;
  if (!thread?.isThread?.() || thread.ownerId !== interaction.client.user.id) {
    await interaction.reply({ content: 'Dieser Button kann nur in Ticket-Threads verwendet werden.', ephemeral: true });
    return;
  }

  if (isThreadClaimed(thread.name)) {
    await interaction.reply({ content: 'Dieses Ticket wurde bereits übernommen.', ephemeral: true });
    return;
  }

  const parsed = parseThreadName(thread.name);
  if (!parsed) {
    await interaction.reply({
      content: 'Dieses Ticket kann nicht geclaimt werden, da Metadaten fehlen.',
      ephemeral: true,
    });
    return;
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    console.error('Failed to defer update for ticket claim:', error);
    try {
      await interaction.reply({ content: 'Aktion konnte nicht verarbeitet werden.', ephemeral: true });
    } catch (replyError) {
      console.error('Failed to send fallback reply for ticket claim:', replyError);
    }
    return;
  }

  const updatedName = withThreadState(parsed.baseName, 'CLAIMED');

  try {
    await thread.setName(updatedName);
  } catch (error) {
    console.error(`Failed to rename thread ${thread.id} while claiming:`, error);
  }

  try {
    const updatedComponents = rebuildActionRowsWithDisabledClaim(interaction.message);
    await interaction.message.edit({ components: updatedComponents });
  } catch (error) {
    console.error(`Failed to disable claim button in thread ${thread.id}:`, error);
  }

  const claimEmbed = buildStatusEmbed(
    STATUS_EMBED_COLORS.claim,
    `Ticket wurde von <@${interaction.user.id}> übernommen.`,
  );

  try {
    await interaction.followUp({
      embeds: [claimEmbed],
      allowedMentions: { users: [interaction.user.id] },
    });
  } catch (error) {
    console.error(`Failed to send claim confirmation in thread ${thread.id}:`, error);
  }
}

async function handleTicketClose(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'Diese Aktion ist hier nicht verfügbar.', ephemeral: true });
    return;
  }

  const thread = interaction.channel;
  if (!thread?.isThread?.() || thread.ownerId !== interaction.client.user.id) {
    await interaction.reply({ content: 'Dieser Button kann nur in Ticket-Threads verwendet werden.', ephemeral: true });
    return;
  }

  const parsed = parseThreadName(thread.name);
  if (!parsed) {
    await interaction.reply({ content: 'Ticketdaten konnten nicht gelesen werden.', ephemeral: true });
    return;
  }

  const member = interaction.member;
  const teamRoleId = roles?.team;
  const hasTeamRole = Boolean(teamRoleId && member?.roles?.cache?.has(teamRoleId));
  const isCreator = interaction.user.id === parsed.creatorId;

  if (!hasTeamRole && !isCreator) {
    await interaction.reply({
      content: 'Nur der Ticket-Ersteller oder das Team können dieses Ticket schließen.',
      ephemeral: true,
    });
    return;
  }

  if (isThreadClosed(thread.name)) {
    await interaction.reply({ content: 'Dieses Ticket ist bereits geschlossen.', ephemeral: true });
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (error) {
    console.error('Failed to defer reply for ticket close:', error);
  }

  const closeEmbed = buildStatusEmbed(
    STATUS_EMBED_COLORS.close,
    `Ticket wurde von <@${interaction.user.id}> geschlossen.`,
  );

  try {
    await thread.send({
      embeds: [closeEmbed],
      allowedMentions: { users: [interaction.user.id] },
    });
  } catch (error) {
    console.error(`Failed to send ticket close notification in thread ${thread.id}:`, error);
  }

  try {
    await thread.members.remove(parsed.creatorId);
  } catch (error) {
    if (error?.code !== 10007) {
      console.error(`Failed to remove creator ${parsed.creatorId} from thread ${thread.id}:`, error);
    }
  }

  const closedName = withThreadState(parsed.baseName, 'CLOSED');

  try {
    await thread.setName(closedName);
  } catch (error) {
    console.error(`Failed to rename thread ${thread.id} on close:`, error);
  }

  try {
    await thread.setLocked(true, 'Ticket geschlossen');
  } catch (error) {
    console.error(`Failed to lock thread ${thread.id}:`, error);
  }

  try {
    await thread.setArchived(true, 'Ticket geschlossen');
  } catch (error) {
    console.error(`Failed to archive thread ${thread.id}:`, error);
  }

  const confirmationMessage = 'Ticket wurde geschlossen. Der Ersteller hat keinen Zugriff mehr.';
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: confirmationMessage });
  } else {
    await interaction.reply({ content: confirmationMessage, ephemeral: true });
  }
}

function registerTicketInteractions(client) {
  if (handlersRegistered) {
    return;
  }

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isStringSelectMenu() && interaction.customId === tickets.selectCustomId) {
        await handleTicketSelection(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId === tickets.claimCustomId) {
          await handleTicketClaim(interaction);
          return;
        }

        if (interaction.customId === tickets.closeCustomId) {
          await handleTicketClose(interaction);
        }
      }
    } catch (error) {
      console.error('Unhandled error in ticket interaction handler:', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.',
            ephemeral: true,
          });
        } catch (replyError) {
          console.error('Failed to reply after ticket interaction error:', replyError);
        }
      }
    }
  });

  handlersRegistered = true;
}

module.exports = {
  registerTicketInteractions,
};
