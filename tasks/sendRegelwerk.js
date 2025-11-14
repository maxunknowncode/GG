const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { regelwerk } = require('../config/ids');

const LOG_PREFIX = 'Regelwerk:';
// [Setup] Tickets-Emojis, Regelwerk-Emoji und Paragraphen aktualisiert.

function getVerifyCustomId() {
  return regelwerk?.verifyCustomId ?? 'verify_user';
}

function getVerifyEmoji() {
  return regelwerk?.verifyEmoji ?? null;
}

function buildVerifyButton() {
  const verifyCustomId = getVerifyCustomId();
  const verifyEmoji = getVerifyEmoji();

  const button = new ButtonBuilder()
    .setCustomId(verifyCustomId)
    .setLabel('Verifizieren')
    .setStyle(ButtonStyle.Success);

  if (verifyEmoji) {
    button.setEmoji(verifyEmoji);
  }

  return button;
}

function buildRegelwerkComponents() {
  const verifyButton = buildVerifyButton();

  return [new ActionRowBuilder().addComponents(verifyButton)];
}

function ensureVerifyComponents(existingComponents = []) {
  const verifyCustomId = getVerifyCustomId();
  const verifyButton = buildVerifyButton();

  const resolvedRows = [];
  let verifyButtonPresent = false;

  for (const row of existingComponents) {
    if (!row) {
      continue;
    }

    let rowBuilder;
    try {
      rowBuilder = ActionRowBuilder.from(row);
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Bestehende Komponenten konnten nicht übernommen werden:`,
        error,
      );
      continue;
    }

    const newRow = new ActionRowBuilder();

    for (const component of rowBuilder.components ?? []) {
      if (!component) {
        continue;
      }

      const customId =
        typeof component.customId === 'string'
          ? component.customId
          : component.data?.custom_id;

      if (customId === verifyCustomId) {
        verifyButtonPresent = true;
        newRow.addComponents(verifyButton);
      } else {
        newRow.addComponents(component);
      }
    }

    if (newRow.components.length > 0) {
      resolvedRows.push(newRow);
    }
  }

  if (!verifyButtonPresent) {
    resolvedRows.push(new ActionRowBuilder().addComponents(verifyButton));
  }

  return resolvedRows;
}

function buildRegelwerkEmbed() {
  const paragraphs = [
    {
      title: '**§1 Allgemeines Verhalten**',
      bullets: [
        'Sei respektvoll gegenüber allen Mitgliedern.',
        'Keine Belästigung, Drohungen oder toxisches Verhalten.',
        'Befolge die Anweisungen des Teams.',
      ],
    },
    {
      title: '**§2 Sprache & Inhalt**',
      bullets: [
        'Kein rassistischer, sexistischer, homophober oder anderer diskriminierender Inhalt.',
        'Kein NS-/Extremismus-Content.',
        'Keine Pornografie oder übermäßig explizite Inhalte.',
      ],
    },
    {
      title: '**§3 Voice-Chat**',
      bullets: [
        'Kein Schreien, Soundspammen oder Stören.',
        'Musik und Medien nur in den dafür vorgesehenen Channels.',
        'Nutze Push-to-Talk, wenn du in lauter Umgebung bist.',
      ],
    },
    {
      title: '**§4 Werbung & Einladungen**',
      bullets: [
        'Keine Fremdwerbung ohne explizite Erlaubnis der Serverleitung.',
        'Keine massenhaften Discord-Invites per DM.',
        'Eigene Inhalte nur in den dafür freigegebenen Channels.',
      ],
    },
    {
      title: '**§5 Namen & Profilbilder**',
      bullets: [
        'Namen oder Profilbilder dürfen keine Beleidigungen, Extremismus oder NS-Symbole enthalten.',
        'Keine Fake-Identitäten als Teammitglied.',
      ],
    },
    {
      title: '**§6 Datenschutz & Privatsphäre**',
      bullets: [
        'Keine privaten Daten (Adresse, Telefonnummer, reale Namen Dritter) veröffentlichen.',
        'Screenshots, DMs oder Gespräche von anderen nur mit deren Zustimmung teilen.',
      ],
    },
    {
      title: '**§7 Konsequenzen bei Verstößen**',
      bullets: [
        'Verwarnungen, Timeouts, Kicks oder Bans je nach Schwere des Verstoßes.',
        'Wiederholte und schwere Verstöße können zu einem dauerhaften Ban führen.',
      ],
    },
  ];

  const description = paragraphs
    .map((section) => {
      const bulletList = section.bullets.map((entry) => `- ${entry}`).join('\n');
      return `${section.title}\n${bulletList}`;
    })
    .join('\n\n');

  return new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle('📜 Serverregelwerk')
    .setDescription(description)
    .addFields({
      name: '**Wichtiger Hinweis**',
      value:
        'Zusätzlich zu diesen Serverregeln gelten jederzeit die offiziellen [Discord-Nutzungsbedingungen](https://discord.com/terms) und [Community-Richtlinien](https://discord.com/guidelines).',
    })
    .setFooter({
      text: 'Durch die Nutzung dieses Servers akzeptierst du die Discord-Richtlinien.',
    })
    .setTimestamp();
}

async function sendRegelwerk(client, { replaceExisting = false } = {}) {
  if (!client) {
    throw new Error(
      'Discord client instance is required to send the Regelwerk.',
    );
  }

  if (!regelwerk) {
    console.error(
      `${LOG_PREFIX} Die Regelwerk-Konfiguration fehlt in config/ids.js.`,
    );
    return null;
  }

  const {
    categoryId: regelwerkCategoryId,
    channelId: regelwerkChannelId,
    messageId: regelwerkMessageId,
  } = regelwerk;

  if (!replaceExisting) {
    console.info(
      `${LOG_PREFIX} Regelwerk-Versand übersprungen, da replaceExisting deaktiviert ist.`,
    );
    return null;
  }

  if (!regelwerkMessageId) {
    console.warn(
      `${LOG_PREFIX} Regelwerk-Versand übersprungen, da keine regelwerk.messageId konfiguriert ist.`,
    );
    return null;
  }

  if (!regelwerkChannelId) {
    console.error(`${LOG_PREFIX} Regelwerk-Channel-ID fehlt in config/ids.js.`);
    return null;
  }
  let channel = client.channels.cache.get(regelwerkChannelId) ?? null;

  if (!channel) {
    try {
      channel = await client.channels.fetch(regelwerkChannelId);
    } catch (error) {
      console.error(
        `${LOG_PREFIX} Regelwerk-Channel ${regelwerkChannelId} konnte nicht geladen werden:`,
        error,
      );
      return null;
    }
  }

  if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
    console.error(
      `${LOG_PREFIX} Der gefundene Regelwerk-Channel unterstützt keine Textnachrichten.`,
    );
    return null;
  }

  if (channel.parentId && channel.parentId !== regelwerkCategoryId) {
    console.warn(
      `${LOG_PREFIX} Regelwerk-Channel ${regelwerkChannelId} befindet sich nicht in der erwarteten Kategorie ${regelwerkCategoryId}.`,
    );
  }

  const embed = buildRegelwerkEmbed();

  const components = buildRegelwerkComponents();

  try {
    const existingMessage = await channel.messages.fetch(regelwerkMessageId);
    const existingEmbeds =
      existingMessage?.embeds?.length > 0
        ? existingMessage.embeds.map((existingEmbed) =>
            EmbedBuilder.from(existingEmbed),
          )
        : [embed];
    const existingComponents = ensureVerifyComponents(
      existingMessage?.components ?? [],
    );

    const updatedMessage = await existingMessage.edit({
      embeds: existingEmbeds,
      components:
        existingComponents.length > 0 ? existingComponents : components,
    });
    console.info(
      `${LOG_PREFIX} Regelwerk-Nachricht ${regelwerkMessageId} wurde aktualisiert.`,
    );
    return updatedMessage;
  } catch (error) {
    const isUnknownMessage =
      error?.code === 10008 || /Unknown Message/i.test(error?.message ?? '');

    if (!isUnknownMessage) {
      console.error(
        `${LOG_PREFIX} Aktualisierung des Regelwerks fehlgeschlagen:`,
        error,
      );
      return null;
    }

    console.warn(
      `${LOG_PREFIX} Regelwerk-Nachricht ${regelwerkMessageId} wurde nicht gefunden. Es wird eine neue Nachricht erstellt – bitte die neue ID in config/ids.js hinterlegen.`,
    );

    try {
      const createdMessage = await channel.send({
        embeds: [embed],
        components,
      });
      console.info(
        `${LOG_PREFIX} Neue Regelwerk-Nachricht im Channel ${regelwerkChannelId} erstellt. Bitte die Message-ID ${createdMessage.id} in config/ids.js hinterlegen.`,
      );
      return createdMessage;
    } catch (sendError) {
      console.error(
        `${LOG_PREFIX} Senden des Regelwerks fehlgeschlagen:`,
        sendError,
      );
      return null;
    }
  }
}

module.exports = {
  buildRegelwerkEmbed,
  sendRegelwerk,
  buildRegelwerkComponents,
};
