const { einladungen } = require('../../config/ids');
const { COPY_BUTTON_CUSTOM_ID, ensureInvitationMessage } = require('./inviteMessage');

const LOG_PREFIX = 'Invites:';

let interactionsRegistered = false;

function registerInvitationInteractions(client) {
  if (interactionsRegistered) {
    return;
  }

  if (!client) {
    throw new Error('Discord client instance is required to register invitation interactions.');
  }

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== COPY_BUTTON_CUSTOM_ID) {
      return;
    }

    const inviteLink = einladungen?.inviteLink || 'https://discord.gg';
    const responseContent = `✅ Der Einladungslink wurde kopiert: ${inviteLink}`;

    try {
      await interaction.reply({ content: responseContent, ephemeral: true });
    } catch (error) {
      console.error(`${LOG_PREFIX} Antwort auf copy_invite-Interaktion fehlgeschlagen:`, error);

      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.reply({
            content: 'Beim Verarbeiten deiner Anfrage ist ein Fehler aufgetreten.',
            ephemeral: true,
          });
        } catch (replyError) {
          console.error(`${LOG_PREFIX} Senden der Fallback-Antwort für copy_invite fehlgeschlagen:`, replyError);
        }
      }
    }
  });

  interactionsRegistered = true;
}

function setupInvitationModule(client) {
  registerInvitationInteractions(client);
}

module.exports = {
  ensureInvitationMessage,
  registerInvitationInteractions,
  setupInvitationModule,
};
