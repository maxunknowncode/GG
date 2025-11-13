const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { einladungen } = require('../../config/ids');

const LOG_PREFIX = 'Invites:';

const INVITE_EMBED_COLOR = 0x5865f2;
const COPY_BUTTON_CUSTOM_ID = 'copy_invite';

function buildInvitationEmbed(inviteLink) {
  return new EmbedBuilder()
    .setTitle('📨 Server-Einladung')
    .setDescription(
      [
        'Willkommen auf unserem Server!',
        'Hier ist deine dauerhafte Einladung:',
        `🔗 **${inviteLink}**`,
        '',
        'Teile diesen Link mit Freunden oder neuen Mitgliedern, um sie einzuladen.',
      ].join('\n'),
    )
    .setColor(INVITE_EMBED_COLOR)
    .setFooter({ text: 'Offizielle Einladung des Servers' })
    .setTimestamp();
}

function buildInvitationComponents() {
  const copyButton = new ButtonBuilder()
    .setCustomId(COPY_BUTTON_CUSTOM_ID)
    .setLabel('Einladung kopieren')
    .setStyle(ButtonStyle.Primary);

  return [new ActionRowBuilder().addComponents(copyButton)];
}

async function ensureInvitationMessage(client) {
  if (!client) {
    throw new Error(
      'Discord client instance is required to ensure the invitation message.',
    );
  }

  if (!einladungen) {
    console.warn(
      `${LOG_PREFIX} Einladungs-Konfiguration fehlt in config/ids.js.`,
    );
    return null;
  }

  const { channelId, messageId, inviteLink } = einladungen;

  if (!channelId) {
    console.warn(`${LOG_PREFIX} Einladungs-Channel-ID fehlt in config/ids.js.`);
    return null;
  }

  const resolvedInviteLink = inviteLink || 'https://discord.gg';

  let channel = client.channels.cache.get(channelId);

  if (!channel) {
    try {
      channel = await client.channels.fetch(channelId);
    } catch (error) {
      console.warn(
        `${LOG_PREFIX} Einladungs-Channel ${channelId} konnte nicht abgerufen werden:`,
        error,
      );
      return null;
    }
  }

  if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
    console.warn(
      `${LOG_PREFIX} Einladungs-Channel ${channelId} unterstützt keine Textnachrichten.`,
    );
    return null;
  }

  const embed = buildInvitationEmbed(resolvedInviteLink);
  const components = buildInvitationComponents();

  if (messageId) {
    try {
      const existingMessage = await channel.messages.fetch(messageId);
      const updatedMessage = await existingMessage.edit({
        embeds: [embed],
        components,
      });
      console.info(
        `${LOG_PREFIX} Einladungs-Nachricht ${messageId} wurde aktualisiert.`,
      );
      return updatedMessage;
    } catch (error) {
      const isUnknownMessage =
        error?.code === 10008 || /Unknown Message/i.test(error?.message ?? '');

      if (!isUnknownMessage) {
        console.error(
          `${LOG_PREFIX} Aktualisierung der Einladungs-Nachricht ${messageId} fehlgeschlagen:`,
          error,
        );
        return null;
      }

      console.warn(
        `${LOG_PREFIX} Einladungs-Nachricht ${messageId} wurde nicht gefunden. Es wird eine neue Nachricht erstellt – bitte die neue ID in config/ids.js hinterlegen.`,
      );
    }
  }

  try {
    const createdMessage = await channel.send({ embeds: [embed], components });
    console.info(
      `${LOG_PREFIX} Neue Einladungs-Nachricht im Channel ${channelId} erstellt. Bitte die Message-ID ${createdMessage.id} in config/ids.js hinterlegen.`,
    );
    return createdMessage;
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Senden der Einladungs-Nachricht fehlgeschlagen:`,
      error,
    );
    return null;
  }
}

module.exports = {
  COPY_BUTTON_CUSTOM_ID,
  buildInvitationEmbed,
  buildInvitationComponents,
  ensureInvitationMessage,
};
