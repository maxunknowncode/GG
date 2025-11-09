module.exports = {
  stats: {
    categoryId: '1437044994471886908',
    channels: {
      members: { id: '1437045028127117333', label: 'Mitglieder' },
      online: { id: '1437045058162528317', label: 'Online' },
      boosts: { id: '1437045090442022933', label: 'Boosts' },
    },
  },

  regelwerk: {
    category: '1437045325918634094',
    channel: '1437045372089274503',
    messageId: '1437085174138667089',
  },

  roles: {
    team: '1437041533508649031',
  },

  tickets: {
    panelCategoryId: '1437045895676825600',
    panelChannelId: '1437045919534026923',
    openCategoryId: '1437090088671510528',
    archiveCategoryId: '1437090117927043293',
    selectCustomId: 'ticket_select',
    closeCustomId: 'ticket_close',
    claimCustomId: 'ticket_claim',
    options: [
      {
        key: 'support',
        value: '1437090552964448296',
        emoji: '🛠️',
        label: 'Support',
        description: 'Allgemeine Hilfe oder technische Probleme rund um den Server',
        channelName: 'support',
        categoryName: 'Support',
      },
      {
        key: 'bewerbung',
        value: '1437090579510071418',
        emoji: '📩',
        label: 'Bewerbung',
        description: 'Anfrage zur Mitarbeit im Team (z. B. Mod, Support, Creator)',
        channelName: 'bewerbung',
        categoryName: 'Bewerbung',
      },
      {
        key: 'melden',
        value: '1437090599902904471',
        emoji: '⚠️',
        label: 'Melden',
        description: 'Nutzerverhalten, Regelverstöße oder andere Zwischenfälle',
        channelName: 'melden',
        categoryName: 'Melden',
      },
      {
        key: 'privat',
        value: '1437090624624005271',
        emoji: '🔒',
        label: 'Privates Anliegen',
        description: 'Vertrauliche Themen, Beschwerden oder sensible Fragen an die Serverleitung',
        channelName: 'privates-anliegen',
        categoryName: 'Privates Anliegen',
      },
    ],
  },
};
