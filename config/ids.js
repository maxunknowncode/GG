// ===== Zahlen & Fakten =====
// Kategorie und Voice-Statistik-Kanäle für Mitgliederzahlen, Online-Status und Boosts

module.exports = {
  stats: {
    categoryId: '1437044994471886908', // Kategorie: Zahlen & Fakten
    channels: {
      members: { id: '1437045028127117333', label: 'Mitglieder' }, // Voice-Stat: Mitglieder
      online: { id: '1437045058162528317', label: 'Online' }, // Voice-Stat: Online
      boosts: { id: '1437045090442022933', label: 'Boosts' }, // Voice-Stat: Server-Boosts
    },
  },

  // ===== Regelwerk =====
  // Kategorie, Channel und Interaktions-IDs für das Regelwerk & die Verifizierung
  regelwerk: {
    categoryId: '1437045325918634094', // Kategorie: Willkommen
    channelId: '1437045372089274503', // Textkanal: #regeln
    messageId: '1437085174138667089', // Nachricht: Regelwerk-Embed
    verifyCustomId: 'verify_user', // Custom-ID: Verifizierungs-Button
    verifyEmoji: '<a:yes:1437026086683803679>', // Emoji: Verifizierungs-Button
  },

  // ===== Einladungen =====
  // Channel, Nachricht und permanenter Einladungslink für das Invite-System
  einladungen: {
    channelId: '1437086163709071471', // Textkanal: #einladungen
    messageId: '1437112880876224874', // Nachricht: Einladungs-Embed
    inviteLink: 'https://discord.gg/hBP2kBEjaW', // Link: Permanenter Server-Einladungslink
  },

  // ===== Willkommen =====
  // Textkanal für Willkommensnachrichten an neue Mitglieder
  welcome: {
    channelId: '1437045351386451989', // Textkanal: #willkommen
  },

  // ===== Rollen =====
  // Zentrale Rollen-IDs für Team und verifizierte Mitglieder
  roles: {
    teamRoleId: '1437041533508649031', // Rolle: Team
    memberRoleId: '1437041605747150939', // Rolle: Mitglied (Verifizierung)
  },

  // ===== Tickets =====
  // Panel, Kategorien, Custom-IDs und Dropdown-Optionen des Ticket-Systems
  tickets: {
    panelCategoryId: '1437045895676825600', // Kategorie: Ticket & Hilfe (Panel)
    panelChannelId: '1437045919534026923', // Textkanal: #ticket (Panel-Nachricht)
    openCategoryId: '1437090088671510528', // Kategorie: Ticket Open (Threads)
    archiveCategoryId: '1437090117927043293', // Kategorie: Ticket Archiv

    selectCustomId: 'ticket_select', // Custom-ID: Dropdown-Menü
    closeCustomId: 'ticket_close', // Custom-ID: Button „Ticket schließen“
    claimCustomId: 'ticket_claim', // Custom-ID: Button „Ticket claimen“

    options: [
      {
        key: 'support', // Option-Key: Support
        value: 'support', // Option-Value: Support
        channelId: '1437090552964448296', // Textkanal-ID: #support
        emoji: '🛠️', // Emoji: Support
        label: 'Support', // Label: Support
        description:
          'Allgemeine Hilfe oder technische Probleme rund um den Server', // Beschreibung: Support
        channelName: 'support', // Parent-Textkanal-Name: support
        categoryName: 'Support', // Logische Kategoriebezeichnung: Support
      },
      {
        key: 'bewerbung', // Option-Key: Bewerbung
        value: 'bewerbung', // Option-Value: Bewerbung
        channelId: '1437090579510071418', // Textkanal-ID: #bewerbung
        emoji: '📩', // Emoji: Bewerbung
        label: 'Bewerbung', // Label: Bewerbung
        description:
          'Anfrage zur Mitarbeit im Team (z. B. Mod, Support, Creator)', // Beschreibung: Bewerbung
        channelName: 'bewerbung', // Parent-Textkanal-Name: bewerbung
        categoryName: 'Bewerbung', // Logische Kategoriebezeichnung: Bewerbung
      },
      {
        key: 'melden', // Option-Key: Melden
        value: 'melden', // Option-Value: Melden
        channelId: '1437090599902904471', // Textkanal-ID: #melden
        emoji: '⚠️', // Emoji: Melden
        label: 'Melden', // Label: Melden
        description: 'Nutzerverhalten, Regelverstöße oder andere Zwischenfälle', // Beschreibung: Melden
        channelName: 'melden', // Parent-Textkanal-Name: melden
        categoryName: 'Melden', // Logische Kategoriebezeichnung: Melden
      },
      {
        key: 'privat', // Option-Key: Privates Anliegen
        value: 'privat', // Option-Value: Privates Anliegen
        channelId: '1437090624624005271', // Textkanal-ID: #privates-anliegen
        emoji: '🔒', // Emoji: Privates Anliegen
        label: 'Privates Anliegen', // Label: Privates Anliegen
        description:
          'Vertrauliche Themen, Beschwerden oder sensible Fragen an die Serverleitung', // Beschreibung: Privates Anliegen
        channelName: 'privates-anliegen', // Parent-Textkanal-Name: privates-anliegen
        categoryName: 'Privates Anliegen', // Logische Kategoriebezeichnung: Privates Anliegen
      },
    ],
  },

  // ===== Voice / Join2Create =====
  // Join-Channel, Zielkategorie und Rollenrechte für temporäre Sprachkanäle
  joinToCreate: {
    channelId: '1437047587160199210', // Sprachkanal: Join2Create
    targetCategoryId: '1437047459456094238', // Kategorie: Temporäre Sprachkanäle
    memberRoleId: '1437041605747150939', // Rolle: Mitglied (Zugriff auf temporäre Channels)
  },
};
