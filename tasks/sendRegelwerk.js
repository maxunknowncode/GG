const { EmbedBuilder } = require('discord.js');
const {
  regelwerkCategoryId,
  regelwerkChannelId,
  regelwerkMessageId,
} = require('../config/regelwerk');

function buildRegelwerkEmbed() {
  const description = [
    '**📜 Serverregelwerk**',
    '',
    '****1. Allgemeines Verhalten****',
    '🚫 *Beleidigungen, Diskriminierung und toxisches Verhalten sind untersagt.*',
    '✅ Begegne allen Mitgliedern mit Respekt – egal welcher Meinung, Herkunft oder Rolle.',
    '',
    '****2. Sprache & Inhalte****',
    '🔞 NSFW-Inhalte, Gewaltverherrlichung oder illegales Material sind verboten.',
    '🗣️ Vermeide **Dauer-Capslock**, Spam und übermäßigen Emoji-Gebrauch.',
    '',
    '****3. Werbung & Eigenpromotion****',
    '📢 *Jegliche Werbung ohne ausdrückliche Genehmigung ist untersagt.*',
    'Dazu zählen: Discord-Links, YouTube, Twitch, Instagram usw.',
    '💡 Im Zweifel erst das Team fragen.',
    '',
    '****4. Nicknamen & Profilbilder****',
    '👤 Anstößige Namen oder Bilder sind nicht erlaubt.',
    'Nicknames sollen **lesbar** und **nicht provozierend** sein.',
    '',
    '****5. Voice-Verhalten****',
    '🎧 Kein Stören mit Soundboards, Störgeräuschen oder lautem Verhalten.',
    '🎙️ Push-to-Talk bei Hintergrundgeräuschen wird empfohlen.',
    '',
    '****6. Teamrespekt****',
    '🛡️ *Folge jederzeit den Anweisungen des Serverteams.*',
    'Fragen oder Beschwerden bitte sachlich per Ticket klären.',
    '',
    '****7. Sanktionen****',
    '⚠️ Bei **Verstößen** erfolgen Verwarnungen, Timeouts oder Bans.',
    '🔁 **Wiederholte Verstöße** führen zu **permanentem Ausschluss** ohne weitere Warnung.',
    '',
    '────────────────────────────',
    '',
    'Durch deine Nutzung dieses Servers akzeptierst du die offiziellen Discord-Richtlinien:',
    '🔗 [https://discord.com/guidelines](https://discord.com/guidelines)',
  ].join('\n');

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(description)
    .setTimestamp();
}

async function sendRegelwerk(client) {
  if (!client) {
    throw new Error('Discord client instance is required to send the Regelwerk.');
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
    const message = await channel.send({ embeds: [embed] });

    if (regelwerkMessageId) {
      console.info(
        `Hinweis: In der Konfiguration ist eine Regelwerk-Nachrichten-ID gesetzt (${regelwerkMessageId}). Aktualisierung bestehender Nachrichten ist noch nicht implementiert.`,
      );
    }

    return message;
  } catch (error) {
    throw new Error(`Senden des Regelwerks fehlgeschlagen: ${error.message}`);
  }
}

module.exports = {
  buildRegelwerkEmbed,
  sendRegelwerk,
};
