// IDs // Zahlen & Fakten
// Enthält Kategorie + Channels: Mitglieder, Online, Boosts (für Voice-Statistiken)

module.exports = {
  stats: {
    categoryId: '1437044994471886908', // Kategorie: Zahlen & Fakten
    channels: {
      members: { id: '1437045028127117333', label: 'Mitglieder' }, // Voice-Channel: Mitglieder
      online:   { id: '1437045058162528317', label: 'Online' },    // Voice-Channel: Online
      boosts:   { id: '1437045090442022933', label: 'Boosts' },    // Voice-Channel: Boosts
    },
  },

  // IDs // Regelwerk
  // Enthält Kategorie + Channel + (optional) Message-ID für Regelwerk-Embed

  regelwerk: {
    category:  '1437045325918634094', // Kategorie: Willkommen
    channel:   '1437045372089274503', // Text-Channel: #regeln
    messageId: '1437085174138667089', // Regelwerk-Message-ID (leer lassen, wenn nicht genutzt)
    verifyCustomId: 'verify_user', // Custom-ID: Verifizieren-Button
    verifyEmoji: '<a:yes:1437026086683803679>', // Custom-Emoji: Verifizieren-Button
  },

  // IDs // Einladungen
  // Enthält Channel + optionale Message-ID + permanenten Invite-Link

  einladungen: {
    channel: '1437086163709071471', // Text-Channel: #einladungen
    messageId: '1437112880876224874', // Message-ID der Einladungs-Embed (wird nach Versand ergänzt)
    inviteLink: 'https://discord.gg/hBP2kBEjaW', // Permanenter Server-Link
  },

  welcome: {
    category: '1437045325918634094', // Kategorie: Willkommen
    channel: '1437045351386451989', // Text-Channel: #willkommen
  },

  // IDs // Rollen
  // Enthält wichtige Rollen-IDs

  roles: {
    team: '1437041533508649031', // Rolle: Team
    member: '1437041605747150939', // Rolle: Mitglied (wird bei Verifizierung vergeben)
  },

  // IDs // Tickets
  // Enthält Panel, Kategorien, Custom-IDs und Dropdown-Optionen für das Ticket-System

  tickets: {
    panelCategoryId:   '1437045895676825600', // Kategorie: Ticket & Hilfe (Panel)
    panelChannelId:    '1437045919534026923', // Text-Channel: #ticket (Panel-Nachricht)
    ticketPanelMessageId: '1437100580186357822', // Ticket-Panel-Message-ID (Embed im #ticket-Channel)
    openCategoryId:    '1437090088671510528', // Kategorie: Ticket Open (Elternkanäle für Threads)
    archiveCategoryId: '1437090117927043293', // Kategorie: Ticket Archiv (nur Info, Threads bleiben beim Parent)

    selectCustomId: 'ticket_select', // Custom-ID: Dropdown-Menü
    closeCustomId:  'ticket_close',  // Custom-ID: Button „Ticket schließen“
    claimCustomId:  'ticket_claim',  // Custom-ID: Button „Claim Ticket“

    // IDs // Ticket Dropdown-Optionen
    // Jede Option: stabiler Key/Value + visuelle Daten + Zuordnung zum Parent-Textchannel (channelName)

    options: [
      {
        key: 'support',                    // Option-Key: Support
        value: 'support',                  // Option-Value: Support
        channelId: '1437090552964448296',  // Dropdown-Option-ID: Support
        emoji: '🛠️',                      // Emoji: Support
        label: 'Support',                  // Label: Support
        description: 'Allgemeine Hilfe oder technische Probleme rund um den Server', // Beschreibung: Support
        channelName: 'support',            // Parent-Textchannel-Name: support
        categoryName: 'Support',           // Logische Kategoriebezeichnung: Support
      },
      {
        key: 'bewerbung',                  // Option-Key: Bewerbung
        value: 'bewerbung',                // Option-Value: Bewerbung
        channelId: '1437090579510071418',  // Dropdown-Option-ID: Bewerbung
        emoji: '📩',                       // Emoji: Bewerbung
        label: 'Bewerbung',                // Label: Bewerbung
        description: 'Anfrage zur Mitarbeit im Team (z. B. Mod, Support, Creator)', // Beschreibung: Bewerbung
        channelName: 'bewerbung',          // Parent-Textchannel-Name: bewerbung
        categoryName: 'Bewerbung',         // Logische Kategoriebezeichnung: Bewerbung
      },
      {
        key: 'melden',                     // Option-Key: Melden
        value: 'melden',                   // Option-Value: Melden
        channelId: '1437090599902904471',  // Dropdown-Option-ID: Melden
        emoji: '⚠️',                       // Emoji: Melden
        label: 'Melden',                   // Label: Melden
        description: 'Nutzerverhalten, Regelverstöße oder andere Zwischenfälle', // Beschreibung: Melden
        channelName: 'melden',             // Parent-Textchannel-Name: melden
        categoryName: 'Melden',            // Logische Kategoriebezeichnung: Melden
      },
      {
        key: 'privat',                     // Option-Key: Privates Anliegen
        value: 'privat',                   // Option-Value: Privates Anliegen
        channelId: '1437090624624005271',  // Dropdown-Option-ID: Privates Anliegen
        emoji: '🔒',                       // Emoji: Privates Anliegen
        label: 'Privates Anliegen',        // Label: Privates Anliegen
        description: 'Vertrauliche Themen, Beschwerden oder sensible Fragen an die Serverleitung', // Beschreibung: Privates Anliegen
        channelName: 'privates-anliegen',  // Parent-Textchannel-Name: privates-anliegen
        categoryName: 'Privates Anliegen', // Logische Kategoriebezeichnung: Privates Anliegen
      },
    ],
  },
};
