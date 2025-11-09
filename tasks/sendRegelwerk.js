const { EmbedBuilder } = require('discord.js');
const { regelwerk } = require('../config/ids');

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
    throw new Error('Die Regelwerk-Konfiguration fehlt in config/ids.js.');
  }

  const { category: regelwerkCategoryId, channel: regelwerkChannelId, messageId: regelwerkMessageId } = regelwerk;

  if (!replaceExisting) {
    console.info('Regelwerk-Versand übersprungen, da replaceExisting deaktiviert ist.');
    return null;
  }

  if (!regelwerkMessageId) {
    console.warn('Regelwerk-Versand übersprungen, da keine regelwerk.messageId konfiguriert ist.');
    return null;
  }

  if (!regelwerkChannelId) {
    throw new Error('Regelwerk-Channel-ID fehlt in config/ids.js.');
  }

  const channel = client.channels.cache.get(regelwerkChannelId);

  if (!channel) {
    throw new Error(
      `Regelwerk-Channel mit der ID ${regelwerkChannelId} wurde im Cache nicht gefunden.`,
    );
  }

  if (!channel.isTextBased?.() || typeof channel.send !== 'function') {
    throw new Error('Der gefundene Regelwerk-Channel unterstützt keine Textnachrichten.');
  }

  if (channel.parentId && channel.parentId !== regelwerkCategoryId) {
    console.warn(
      `Regelwerk-Channel ${regelwerkChannelId} befindet sich nicht in der erwarteten Kategorie ${regelwerkCategoryId}.`,
    );
  }

  const embed = buildRegelwerkEmbed();

  try {
    const existingMessage = await channel.messages.fetch(regelwerkMessageId);
    const updatedMessage = await existingMessage.edit({ embeds: [embed] });
    console.info(`Regelwerk-Nachricht ${regelwerkMessageId} wurde aktualisiert.`);
    return updatedMessage;
  } catch (error) {
    const isUnknownMessage =
      error?.code === 10008 || /Unknown Message/i.test(error?.message ?? '');

    if (!isUnknownMessage) {
      throw new Error(`Aktualisierung des Regelwerks fehlgeschlagen: ${error.message}`);
    }

    console.warn(
      `Regelwerk-Nachricht ${regelwerkMessageId} wurde nicht gefunden. Es wird eine neue Nachricht erstellt – bitte die neue ID in config/ids.js hinterlegen.`,
    );

    try {
      const createdMessage = await channel.send({ embeds: [embed] });
      return createdMessage;
    } catch (sendError) {
      throw new Error(`Senden des Regelwerks fehlgeschlagen: ${sendError.message}`);
    }
  }
}

module.exports = {
  buildRegelwerkEmbed,
  sendRegelwerk,
};
