const { Events, EmbedBuilder } = require('discord.js');
const { welcome } = require('../../config/ids');

let welcomeListenerRegistered = false;

function buildWelcomeEmbed(memberId) {
  const mention = `<@${memberId}>`;

  const description = [
    '<:newmember:1437025087613308938> **Willkommen auf GG!**',
    mention,
    '',
    'Schön, dass du da bist! Hier findest du alles, was du für den Einstieg brauchst:',
    '',
    '> `📍` [**Regeln ansehen**](https://discord.com/channels/1354909103574483134/1437045372089274503)',
    '> Verifiziere dich, um Zugriff auf alle Bereiche zu erhalten.',
    '',
    '> `🔔` [**Ankündigungen verfolgen**](https://discord.com/channels/1354909103574483134/1437045396802240605)',
    '> Bleib informiert über Events, Updates und wichtige Mitteilungen vom Team.',
    '',
    '> `🎟️` [**Ticket erstellen**](https://discord.com/channels/1354909103574483134/1437045919534026923)',
    '> Du brauchst Hilfe oder hast ein Anliegen? Erstelle hier ein Ticket.',
    '',
    '> `🧾` [**Einladungslink holen**](https://discord.com/channels/1354909103574483134/1437086163709071471)',
    '> Erstelle deinen persönlichen Invite-Link oder teile GG mit anderen.',
    '',
    '---',
    '',
    'Viel Spaß auf **GG** – bei Fragen ist das Team für dich da.',
  ].join('\n');

  return new EmbedBuilder().setDescription(description);
}

async function sendWelcomeMessage(member) {
  if (!welcome?.channelId) {
    console.error('Willkommens-Channel-ID ist nicht konfiguriert.');
    return;
  }

  try {
    const channel = await member.client.channels.fetch(welcome.channelId);
    if (!channel || !channel.isTextBased()) {
      console.error('Der konfigurierte Willkommens-Channel konnte nicht gefunden oder ist nicht textbasiert.');
      return;
    }

    const embed = buildWelcomeEmbed(member.id);
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Willkommensnachricht konnte nicht gesendet werden:', error);
  }
}

function registerWelcomeListener(client) {
  if (welcomeListenerRegistered) {
    return;
  }

  if (!client) {
    throw new Error('Discord client instance is required to register the welcome listener.');
  }

  client.on(Events.GuildMemberAdd, async (member) => {
    if (!member) {
      return;
    }

    if (member.partial) {
      try {
        await member.fetch();
      } catch (error) {
        console.error('Konnte Teil-Mitgliedsdaten beim Join nicht abrufen:', error);
        return;
      }
    }

    await sendWelcomeMessage(member);
  });

  welcomeListenerRegistered = true;
}

function setupWelcomeModule(client) {
  registerWelcomeListener(client);
}

module.exports = {
  setupWelcomeModule,
  registerWelcomeListener,
};
