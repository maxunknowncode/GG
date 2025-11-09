const { EmbedBuilder } = require('discord.js');
const { regelwerk, roles } = require('../../config/ids');

let interactionsRegistered = false;

function getVerifyCustomId() {
  return regelwerk?.verifyCustomId ?? 'verify_user';
}

function buildEmbed({ color, title, description, footer }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: footer })
    .setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

async function sendEphemeralEmbed(interaction, embed) {
  if (!interaction?.isRepliable?.()) {
    return;
  }

  const payload = { embeds: [embed], ephemeral: true };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
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
        const embed = buildEmbed({
          color: 0xe74c3c,
          title: '❌ Verifizierung fehlgeschlagen',
          description:
            '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
          footer: 'Nur auf dem Server möglich',
        });

        await sendEphemeralEmbed(interaction, embed);
        return;
      }

      const memberRoleId = roles?.member;
      if (!memberRoleId) {
        console.error('Regelwerk: roles.member ist in config/ids.js nicht gesetzt.');
        const embed = buildEmbed({
          color: 0xe74c3c,
          title: '❌ Verifizierung fehlgeschlagen',
          description:
            '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
          footer: 'Konfiguration prüfen',
        });
        await sendEphemeralEmbed(interaction, embed);
        return;
      }

      const guild = interaction.guild;
      let member = guild?.members?.cache?.get(interaction.user.id);

      if (!member && guild) {
        try {
          member = await guild.members.fetch(interaction.user.id);
        } catch (fetchError) {
          console.error('Regelwerk: Mitgliedsdaten konnten nicht geladen werden:', fetchError);
          const embed = buildEmbed({
            color: 0xe74c3c,
            title: '❌ Verifizierung fehlgeschlagen',
            description:
              '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
            footer: 'Erneut versuchen oder Team kontaktieren',
          });
          await sendEphemeralEmbed(interaction, embed);
          return;
        }
      }

      if (!member) {
        console.warn('Regelwerk: Mitgliedsdaten nicht gefunden für Benutzer:', interaction.user?.id);
        const embed = buildEmbed({
          color: 0xe74c3c,
          title: '❌ Verifizierung fehlgeschlagen',
          description:
            '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
          footer: 'Erneut versuchen oder Team kontaktieren',
        });
        await sendEphemeralEmbed(interaction, embed);
        return;
      }

      if (member.roles.cache.has(memberRoleId)) {
        const embed = buildEmbed({
          color: 0xf1c40f,
          title: '⚠️ Bereits verifiziert',
          description: '> Du besitzt die Rolle **Mitglied** bereits.',
          footer: 'Keine Aktion erforderlich',
        });
        await sendEphemeralEmbed(interaction, embed);
        return;
      }

      try {
        await member.roles.add(memberRoleId, 'Verified via Regelwerk button');
      } catch (roleError) {
        console.error('Regelwerk: Rolle konnte nicht vergeben werden:', roleError);
        const embed = buildEmbed({
          color: 0xe74c3c,
          title: '❌ Verifizierung fehlgeschlagen',
          description:
            '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
          footer: 'Bitte Team kontaktieren',
        });
        await sendEphemeralEmbed(interaction, embed);
        return;
      }

      const successEmbed = buildEmbed({
        color: 0x2ecc71,
        title: '✅ Erfolgreich verifiziert',
        description:
          '> Du hast soeben die Rolle **Mitglied** erhalten.\n> Willkommen – du hast jetzt Zugriff auf alle freigeschalteten Bereiche!',
        footer: 'Verifizierung abgeschlossen',
      });

      await sendEphemeralEmbed(interaction, successEmbed);
    } catch (error) {
      console.error('Unhandled error in regelwerk interaction handler:', error);

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        try {
          const fallbackEmbed = buildEmbed({
            color: 0xe74c3c,
            title: '❌ Verifizierung fehlgeschlagen',
            description:
              '> Die Rolle konnte nicht zugewiesen werden. Bitte wende dich an das Team.',
            footer: 'Bitte Team kontaktieren',
          });
          await interaction.reply({ embeds: [fallbackEmbed], ephemeral: true });
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
