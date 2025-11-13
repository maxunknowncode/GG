const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { regelwerk } = require('../config/ids');

const LOG_PREFIX = 'Regelwerk:';

function getVerifyCustomId() {
  return regelwerk?.verifyCustomId ?? 'verify_user';
}

function getVerifyEmoji() {
  return regelwerk?.verifyEmoji ?? '<a:yes:1437026086683803679>';
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
      console.error(`${LOG_PREFIX} Bestehende Komponenten konnten nicht übernommen werden:`, error);
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
  const fields = [
    {
      name: '__**1. Allgemeines Verhalten**__',
      value: [
        '> 🚫 Beleidigungen, Diskriminierung und toxisches Verhalten sind untersagt.',
        '> ✅ Begegne allen Mitgliedern mit Respekt – unabhängig von Meinung, Herkunft oder Rolle.',
      ].join('\n'),
    },
    {
      name: '__**2. Sprache & Inhalte**__',
      value: [
        '> 🔞 NSFW-Inhalte, Gewaltverherrlichung oder illegales Material sind verboten.',
        '> 🗣️ Vermeide Dauer-Capslock, Spam und übermäßigen Emoji-Gebrauch.',
      ].join('\n'),
    },
    {
      name: '__**3. Werbung & Eigenpromotion**__',
      value: [
        '> 📢 Jegliche Werbung ohne ausdrückliche Genehmigung ist untersagt.',
        '> 💡 Frag im Zweifel zuerst das Team, bevor du Links oder Eigenpromotion teilst.',
      ].join('\n'),
    },
    {
      name: '__**4. Nicknamen & Profilbilder**__',
      value: [
        '> 👤 Anstößige oder provozierende Namen und Profilbilder sind nicht erlaubt.',
        '> 🔤 Wähle einen gut lesbaren Nicknamen, der zum Server passt.',
      ].join('\n'),
    },
    {
      name: '__**5. Voice-Verhalten**__',
      value: [
        '> 🎧 Vermeide Störgeräusche, Soundboards oder dauerhaft lautes Verhalten.',
        '> 🎙️ Nutze Push-to-Talk, wenn Hintergrundgeräusche nicht vermieden werden können.',
      ].join('\n'),
    },
    {
      name: '__**6. Teamrespekt**__',
      value: [
        '> 🛡️ Folge jederzeit den Anweisungen des Serverteams.',
        '> 📩 Kläre Fragen oder Beschwerden sachlich über Tickets oder Direktnachrichten.',
      ].join('\n'),
    },
    {
      name: '__**7. Sanktionen**__',
      value: [
        '> ⚠️ Verstöße führen zu Verwarnungen, Timeouts oder Bans.',
        '> 🔁 Wiederholte Verstöße können einen dauerhaften Ausschluss nach sich ziehen.',
      ].join('\n'),
    },
    {
      name: '__**Offizielle Richtlinien**__',
      value: '> 🔗 https://discord.com/guidelines',
    },
  ];

  return new EmbedBuilder()
    .setColor(0x8b0000)
    .setTitle('📜 Serverregelwerk')
    .setFields(fields)
    .setFooter({
      text: 'Durch die Nutzung dieses Servers akzeptierst du die Discord-Richtlinien.',
    })
    .setTimestamp();
}

async function sendRegelwerk(client, { replaceExisting = false } = {}) {
  if (!client) {
    throw new Error('Discord client instance is required to send the Regelwerk.');
  }

  if (!regelwerk) {
    console.error(`${LOG_PREFIX} Die Regelwerk-Konfiguration fehlt in config/ids.js.`);
    return null;
  }

  const {
    categoryId: regelwerkCategoryId,
    channelId: regelwerkChannelId,
    messageId: regelwerkMessageId,
  } = regelwerk;

  if (!replaceExisting) {
    console.info(`${LOG_PREFIX} Regelwerk-Versand übersprungen, da replaceExisting deaktiviert ist.`);
    return null;
  }

  if (!regelwerkMessageId) {
    console.warn(`${LOG_PREFIX} Regelwerk-Versand übersprungen, da keine regelwerk.messageId konfiguriert ist.`);
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
    console.error(`${LOG_PREFIX} Der gefundene Regelwerk-Channel unterstützt keine Textnachrichten.`);
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
        ? existingMessage.embeds.map((existingEmbed) => EmbedBuilder.from(existingEmbed))
        : [embed];
    const existingComponents = ensureVerifyComponents(existingMessage?.components ?? []);

    const updatedMessage = await existingMessage.edit({
      embeds: existingEmbeds,
      components: existingComponents.length > 0 ? existingComponents : components,
    });
    console.info(`${LOG_PREFIX} Regelwerk-Nachricht ${regelwerkMessageId} wurde aktualisiert.`);
    return updatedMessage;
  } catch (error) {
    const isUnknownMessage =
      error?.code === 10008 || /Unknown Message/i.test(error?.message ?? '');

    if (!isUnknownMessage) {
      console.error(`${LOG_PREFIX} Aktualisierung des Regelwerks fehlgeschlagen:`, error);
      return null;
    }

    console.warn(
      `${LOG_PREFIX} Regelwerk-Nachricht ${regelwerkMessageId} wurde nicht gefunden. Es wird eine neue Nachricht erstellt – bitte die neue ID in config/ids.js hinterlegen.`,
    );

    try {
      const createdMessage = await channel.send({ embeds: [embed], components });
      console.info(
        `${LOG_PREFIX} Neue Regelwerk-Nachricht im Channel ${regelwerkChannelId} erstellt. Bitte die Message-ID ${createdMessage.id} in config/ids.js hinterlegen.`,
      );
      return createdMessage;
    } catch (sendError) {
      console.error(`${LOG_PREFIX} Senden des Regelwerks fehlgeschlagen:`, sendError);
      return null;
    }
  }
}

module.exports = {
  buildRegelwerkEmbed,
  sendRegelwerk,
  buildRegelwerkComponents,
};
