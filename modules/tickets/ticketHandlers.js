const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { tickets, roles } = require('../../config/ids');
const {
  clearTicketCreator,
  createTicketThread,
  ensureTicketChannel,
  getNextTicketNumber,
  getTicketCreatorId,
  initializeTicketCounter,
  isThreadClaimed,
  isThreadClosed,
  parseThreadName,
  withThreadState,
} = require('./ticketThread');

const TICKET_EMBED_COLOR = 0xf9a602;
const CLAIM_EMBED_COLOR = 0xf1c40f;
const CLOSE_EMBED_COLOR = 0xed4245;
let handlersRegistered = false;
const LOG_PREFIX = 'Ticket:';

function buildClaimEmbed(userId) {
  return new EmbedBuilder()
    .setTitle('🟡 Ticket übernommen')
    .setDescription(
      `Das Ticket wurde vom Teammitglied <@${userId}> übernommen.`,
    )
    .setColor(CLAIM_EMBED_COLOR)
    .setTimestamp();
}

function buildCloseEmbed() {
  return new EmbedBuilder()
    .setTitle('🔴 Ticket geschlossen')
    .setDescription('Dieses Ticket wurde geschlossen und archiviert.')
    .setColor(CLOSE_EMBED_COLOR)
    .setTimestamp();
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
        'Teammitglieder können das Ticket mit **„Ticket claimen“** übernehmen.',
      ].join('\n'),
    )
    .setFooter({
      text: 'Nur der Ticket-Ersteller und das Team sehen dieses Ticket.',
    })
    .setTimestamp();
}

function buildTicketActionRow({ claimed = false } = {}) {
  const closeButton = new ButtonBuilder()
    .setCustomId(tickets.closeCustomId)
    .setLabel('Ticket schließen')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔴');

  const claimButton = new ButtonBuilder()
    .setCustomId(tickets.claimCustomId)
    .setLabel('Ticket claimen')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🟡')
    .setDisabled(Boolean(claimed));

  return [new ActionRowBuilder().addComponents(closeButton, claimButton)];
}

function rebuildActionRowsWithDisabledClaim(message) {
  if (!message?.components?.length) {
    return [];
  }

  return message.components.reduce((rows, row) => {
    try {
      const rowBuilder = ActionRowBuilder.from(row);
      const newRow = new ActionRowBuilder();

      rowBuilder.components.forEach((component) => {
        if (!component) {
          return;
        }

        if (component.customId !== tickets.claimCustomId) {
          newRow.addComponents(ButtonBuilder.from(component));
          return;
        }

        const disabledClaimButton =
          ButtonBuilder.from(component).setDisabled(true);
        newRow.addComponents(disabledClaimButton);
      });

      if (newRow.components.length > 0) {
        rows.push(newRow);
      }
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to rebuild action row for ticket message ${message.id}:`,
        error,
      );
    }

    return rows;
  }, []);
}

async function handleTicketSelection(interaction) {
  if (!interaction?.isStringSelectMenu?.()) {
    return;
  }

  if (!interaction.inGuild()) {
    try {
      await interaction.reply({
        content: 'Tickets können nur innerhalb des Servers erstellt werden.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket creation outside guild:`,
        error,
      );
    }
    return;
  }

  const selectedValue = interaction.values?.[0];
  if (!selectedValue) {
    try {
      await interaction.reply({
        content: 'Bitte wähle eine gültige Ticket-Kategorie.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for missing ticket selection value:`,
        error,
      );
    }
    return;
  }

  const option = tickets.options.find((entry) => entry.value === selectedValue);
  if (!option) {
    try {
      await interaction.reply({
        content: 'Die ausgewählte Ticket-Kategorie ist ungültig.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for invalid ticket option ${selectedValue}:`,
        error,
      );
    }
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to defer ticket selection reply:`,
      error,
    );
  }

  const guild = interaction.guild;

  try {
    await initializeTicketCounter(guild);
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to initialize ticket counter during ticket creation:`,
      error,
    );
  }

  let channel;
  try {
    channel = await ensureTicketChannel(guild, option);
  } catch (channelError) {
    console.error(
      `${LOG_PREFIX} Ticket channel could not be ensured for option ${option?.value} in guild ${guild?.id}:`,
      channelError,
    );

    const configErrorMessage =
      'Ticket-Konfiguration ist fehlerhaft. Bitte wende dich an das Team.';

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: configErrorMessage });
      } else {
        await interaction.reply({
          content: configErrorMessage,
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error(
        `${LOG_PREFIX} Failed to send ticket configuration error response:`,
        replyError,
      );
    }

    return;
  }

  const ticketNumber = getNextTicketNumber();

  try {
    const { thread } = await createTicketThread(
      channel,
      option,
      ticketNumber,
      interaction.user,
    );
    const embed = buildTicketEmbed(option, interaction.user.id, ticketNumber);
    const components = buildTicketActionRow();

    try {
      await thread.send({
        embeds: [embed],
        components,
        allowedMentions: { users: [interaction.user.id] },
      });
    } catch (threadSendError) {
      console.error(
        `${LOG_PREFIX} Failed to send initial ticket message in thread ${thread.id}:`,
        threadSendError,
      );
    }

    const responseContent = `Dein Ticket wurde erstellt: ${thread}`;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: responseContent });
      } else {
        await interaction.reply({ content: responseContent, ephemeral: true });
      }
    } catch (replyError) {
      console.error(
        `${LOG_PREFIX} Failed to confirm ticket creation for thread ${thread.id}:`,
        replyError,
      );
    }
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to create ticket thread in channel ${channel?.id ?? 'unknown'}:`,
      error,
    );

    const errorMessage =
      'Beim Erstellen deines Tickets ist ein Fehler aufgetreten. Bitte versuche es später erneut.';

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error(
        `${LOG_PREFIX} Failed to send ticket creation error response:`,
        replyError,
      );
    }
  }
}

async function handleTicketClaim(interaction) {
  if (!interaction?.isButton?.()) {
    return;
  }

  if (!interaction.inGuild()) {
    try {
      await interaction.reply({
        content: 'Diese Aktion ist hier nicht verfügbar.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket claim outside guild:`,
        error,
      );
    }
    return;
  }

  const member = interaction.member;
  const teamRoleId = roles?.teamRoleId;
  const hasTeamRole = Boolean(
    teamRoleId && member?.roles?.cache?.has(teamRoleId),
  );

  if (!hasTeamRole) {
    try {
      await interaction.reply({
        content: 'Nur Teammitglieder können Tickets claimen.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket claim without permission:`,
        error,
      );
    }
    return;
  }

  const thread = interaction.channel;
  if (!thread?.isThread?.() || thread.ownerId !== interaction.client.user.id) {
    try {
      await interaction.reply({
        content: 'Dieser Button kann nur in Ticket-Threads verwendet werden.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket claim outside thread:`,
        error,
      );
    }
    return;
  }

  if (isThreadClaimed(thread.name)) {
    try {
      await interaction.reply({
        content: 'Dieses Ticket wurde bereits übernommen.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for already claimed ticket ${thread.id}:`,
        error,
      );
    }
    return;
  }

  const parsed = parseThreadName(thread.name);
  if (!parsed) {
    try {
      await interaction.reply({
        content:
          'Dieses Ticket kann nicht geclaimt werden, da Metadaten fehlen.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket claim with missing metadata in ${thread.id}:`,
        error,
      );
    }
    return;
  }

  try {
    await interaction.deferUpdate();
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to defer update for ticket claim:`,
      error,
    );
    try {
      await interaction.reply({
        content: 'Aktion konnte nicht verarbeitet werden.',
        ephemeral: true,
      });
    } catch (replyError) {
      console.error(
        `${LOG_PREFIX} Failed to send fallback reply for ticket claim:`,
        replyError,
      );
    }
    return;
  }

  try {
    const updatedName = withThreadState(
      parsed.baseName || thread.name,
      'CLAIMED',
    );
    await thread.setName(updatedName);
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to rename thread ${thread.id} while claiming:`,
      error,
    );
  }

  try {
    const updatedComponents = rebuildActionRowsWithDisabledClaim(
      interaction.message,
    );
    await interaction.message.edit({ components: updatedComponents });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to disable claim button in thread ${thread.id}:`,
      error,
    );
  }

  const claimEmbed = buildClaimEmbed(interaction.user.id);

  try {
    await interaction.followUp({
      embeds: [claimEmbed],
      allowedMentions: { users: [interaction.user.id] },
    });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to send claim confirmation in thread ${thread.id}:`,
      error,
    );
  }
}

async function handleTicketClose(interaction) {
  if (!interaction?.isButton?.()) {
    return;
  }

  if (!interaction.inGuild()) {
    try {
      await interaction.reply({
        content: 'Diese Aktion ist hier nicht verfügbar.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket close outside guild:`,
        error,
      );
    }
    return;
  }

  const thread = interaction.channel;
  if (!thread?.isThread?.() || thread.ownerId !== interaction.client.user.id) {
    try {
      await interaction.reply({
        content: 'Dieser Button kann nur in Ticket-Threads verwendet werden.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket close outside thread:`,
        error,
      );
    }
    return;
  }

  const parsed = parseThreadName(thread.name);
  if (!parsed) {
    try {
      await interaction.reply({
        content: 'Ticketdaten konnten nicht gelesen werden.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket close with missing metadata in ${thread.id}:`,
        error,
      );
    }
    return;
  }

  const member = interaction.member;
  const teamRoleId = roles?.teamRoleId;
  const hasTeamRole = Boolean(
    teamRoleId && member?.roles?.cache?.has(teamRoleId),
  );
  const creatorId = await getTicketCreatorId(thread);
  const isCreator = Boolean(creatorId && interaction.user.id === creatorId);

  if (!hasTeamRole && !isCreator) {
    try {
      await interaction.reply({
        content:
          'Nur der Ticket-Ersteller oder das Team können dieses Ticket schließen.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for ticket close without permission in ${thread.id}:`,
        error,
      );
    }
    return;
  }

  if (isThreadClosed(thread.name)) {
    try {
      await interaction.reply({
        content: 'Dieses Ticket ist bereits geschlossen.',
        ephemeral: true,
      });
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Failed to reply for already closed ticket ${thread.id}:`,
        error,
      );
    }
    return;
  }

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to defer reply for ticket close:`,
      error,
    );
  }

  if (creatorId) {
    try {
      await thread.members.remove(creatorId);
    } catch (error) {
      if (error?.code !== 10007) {
        console.error(
          `${LOG_PREFIX} Failed to remove creator ${creatorId} from thread ${thread.id}:`,
          error,
        );
      }
    }
  }

  clearTicketCreator(thread.id);

  try {
    const closedName = withThreadState(
      parsed.baseName || thread.name,
      'CLOSED',
    );
    await thread.setName(closedName);
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to rename thread ${thread.id} on close:`,
      error,
    );
  }

  const closeEmbed = buildCloseEmbed();

  try {
    await thread.send({ embeds: [closeEmbed] });
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to send ticket close notification in thread ${thread.id}:`,
      error,
    );
  }

  try {
    await thread.setLocked(true, 'Ticket geschlossen');
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to lock thread ${thread.id}:`, error);
  }

  try {
    await thread.setArchived(true, 'Ticket geschlossen');
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to archive thread ${thread.id}:`,
      error,
    );
  }

  const confirmationMessage =
    'Ticket wurde geschlossen. Der Ersteller hat keinen Zugriff mehr.';
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: confirmationMessage });
    } else {
      await interaction.reply({
        content: confirmationMessage,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to send confirmation for closed ticket ${thread.id}:`,
      error,
    );
  }
}

function registerTicketInteractions(client) {
  if (handlersRegistered) {
    return;
  }

  if (!client) {
    throw new Error(
      'Discord client instance is required to register ticket interactions.',
    );
  }

  if (
    !tickets?.selectCustomId ||
    !tickets?.claimCustomId ||
    !tickets?.closeCustomId ||
    !Array.isArray(tickets?.options) ||
    tickets.options.length === 0
  ) {
    console.error(
      `${LOG_PREFIX} Ticket-Konfiguration in config/ids.js ist unvollständig. Interaktionen werden nicht registriert.`,
    );
    return;
  }

  client.on('interactionCreate', async (interaction) => {
    try {
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === tickets.selectCustomId
      ) {
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
      console.error(
        `${LOG_PREFIX} Unhandled error in ticket interaction handler:`,
        error,
      );

      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred
      ) {
        try {
          await interaction.reply({
            content:
              'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.',
            ephemeral: true,
          });
        } catch (replyError) {
          console.error(
            `${LOG_PREFIX} Failed to reply after ticket interaction error:`,
            replyError,
          );
        }
      }
    }
  });

  handlersRegistered = true;
}

module.exports = {
  registerTicketInteractions,
};
