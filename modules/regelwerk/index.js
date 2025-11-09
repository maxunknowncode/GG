const { regelwerk, roles } = require('../../config/ids');

let interactionsRegistered = false;

function getVerifyCustomId() {
  return regelwerk?.verifyCustomId ?? 'verify_user';
}

function setupRegelwerkModule(client) {
  if (interactionsRegistered) {
    return;
  }

  if (!client) {
    throw new Error('Discord client instance is required to register regelwerk interactions.');
  }

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton() || interaction.customId !== getVerifyCustomId()) {
        return;
      }

      if (!interaction.inGuild()) {
        if (interaction.isRepliable()) {
          await interaction.reply({
            content: 'Diese Aktion ist nur auf dem Server verfügbar.',
            ephemeral: true,
          });
        }
        return;
      }

      const verifiedRoleId = roles?.verified;
      if (!verifiedRoleId) {
        await interaction.reply({
          content: 'Die Verifizierten-Rolle ist nicht konfiguriert. Bitte informiere das Server-Team.',
          ephemeral: true,
        });
        return;
      }

      const guild = interaction.guild;
      let member = guild?.members?.cache?.get(interaction.user.id);

      if (!member && guild) {
        try {
          member = await guild.members.fetch(interaction.user.id);
        } catch (fetchError) {
          await interaction.reply({
            content: 'Deine Mitgliedsdaten konnten nicht geladen werden. Bitte versuche es erneut.',
            ephemeral: true,
          });
          return;
        }
      }

      if (!member) {
        await interaction.reply({
          content: 'Deine Mitgliedsdaten konnten nicht gefunden werden. Bitte versuche es erneut.',
          ephemeral: true,
        });
        return;
      }

      if (member.roles.cache.has(verifiedRoleId)) {
        await interaction.reply({
          content: '⚠️ Du bist bereits verifiziert.',
          ephemeral: true,
        });
        return;
      }

      try {
        await member.roles.add(verifiedRoleId, 'Verified via Regelwerk button');
      } catch (roleError) {
        await interaction.reply({
          content: 'Die Rolle konnte nicht vergeben werden. Bitte informiere das Server-Team.',
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: '✅ Du wurdest erfolgreich verifiziert und hast jetzt Zugriff auf den Server!',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Unhandled error in regelwerk interaction handler:', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'Die Verifizierung konnte nicht verarbeitet werden. Bitte versuche es erneut.',
            ephemeral: true,
          });
        } catch (replyError) {
          console.error('Failed to reply after regelwerk interaction error:', replyError);
        }
      }
    }
  });

  interactionsRegistered = true;
}

module.exports = {
  setupRegelwerkModule,
};
