const {
  ChannelType,
  PermissionFlagsBits,
  Collection,
} = require('discord.js');

const JOIN_TO_CREATE_CHANNEL_ID = '1437047587160199210';
const TARGET_CATEGORY_ID = '1437047459456094238';
const MEMBER_ROLE_ID = '1437041605747150939';

const MODULE_FLAG = Symbol('join2createModuleReady');

const ALL_PERMISSION_BITS = [
  ...new Set(
    Object.values(PermissionFlagsBits).filter((value) => typeof value === 'bigint')
  ),
];

const MEMBER_ALLOWED_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.Stream,
  PermissionFlagsBits.UseSoundboard,
  PermissionFlagsBits.UseExternalSounds,
  PermissionFlagsBits.UseVAD,
];

const MEMBER_DENIED_PERMISSIONS = ALL_PERMISSION_BITS.filter(
  (permission) => !MEMBER_ALLOWED_PERMISSIONS.includes(permission)
);

function buildChannelName(member) {
  const baseName = member?.user?.username || member?.displayName || 'Unbekannt';
  return `🔊・${baseName}`.slice(0, 100);
}

function setupJoin2CreateModule(client) {
  if (!client || client[MODULE_FLAG]) {
    return;
  }

  client[MODULE_FLAG] = true;

  const temporaryChannels = new Collection();
  const creationLocks = new Set();

  const cleanupChannelIfEmpty = async (channel) => {
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return;
    }

    if (channel.members.size > 0) {
      return;
    }

    try {
      await channel.delete('Join2Create: Aufräumen eines leeren temporären Channels');
    } catch (error) {
      console.error(
        `Join2Create: Löschen des Channels ${channel.id} fehlgeschlagen:`,
        error
      );
    } finally {
      temporaryChannels.delete(channel.id);
    }
  };

  const handleVoiceStateUpdate = async (oldState, newState) => {
    const guild = newState?.guild ?? oldState?.guild;
    if (!guild) {
      return;
    }

    const member = newState.member ?? oldState.member;
    if (!member || member.user?.bot) {
      return;
    }

    const joinedChannelId = newState.channelId;
    const leftChannelId = oldState.channelId;

    if (leftChannelId && temporaryChannels.has(leftChannelId)) {
      const leftChannel = oldState.channel ?? guild.channels.cache.get(leftChannelId);
      await cleanupChannelIfEmpty(leftChannel);
    }

    if (joinedChannelId !== JOIN_TO_CREATE_CHANNEL_ID) {
      return;
    }

    if (creationLocks.has(member.id)) {
      return;
    }

    const existingEntry = temporaryChannels.find((entry) => entry.ownerId === member.id);
    if (existingEntry) {
      const existingChannel = guild.channels.cache.get(existingEntry.channelId);
      if (existingChannel) {
        try {
          await member.voice.setChannel(existingChannel);
        } catch (error) {
          console.error(
            `Join2Create: Verschieben in vorhandenen Channel fehlgeschlagen (${existingChannel.id}):`,
            error
          );
        }
        return;
      }
      temporaryChannels.delete(existingEntry.channelId);
    }

    creationLocks.add(member.id);

    try {
      const category =
        guild.channels.cache.get(TARGET_CATEGORY_ID) ??
        (await guild.channels.fetch(TARGET_CATEGORY_ID).catch(() => null));
      if (!category || category.type !== ChannelType.GuildCategory) {
        console.error(
          `Join2Create: Kategorie ${TARGET_CATEGORY_ID} wurde nicht gefunden. Channel wird nicht erstellt.`
        );
        return;
      }

      const everyoneRole = guild.roles.everyone;
      const memberRole = await guild.roles
        .fetch(MEMBER_ROLE_ID)
        .then((role) => role ?? null)
        .catch((error) => {
          console.error(
            `Join2Create: Mitglied-Rolle (${MEMBER_ROLE_ID}) konnte nicht geladen werden:`,
            error
          );
          return null;
        });

      if (!memberRole) {
        console.error(
          'Join2Create: Temporärer Channel wurde nicht erstellt, da die Mitglied-Rolle fehlt.'
        );
        return;
      }

      const permissionOverwrites = [
        {
          id: everyoneRole.id,
          deny: ALL_PERMISSION_BITS,
          type: 'role',
        },
        {
          id: memberRole.id,
          allow: MEMBER_ALLOWED_PERMISSIONS,
          deny: MEMBER_DENIED_PERMISSIONS,
          type: 'role',
        },
        {
          id: member.id,
          allow: [PermissionFlagsBits.ManageChannels],
          type: 'member',
        },
      ];

      const createdChannel = await guild.channels.create({
        name: buildChannelName(member),
        type: ChannelType.GuildVoice,
        parent: category,
        lockPermissions: false,
        permissionOverwrites,
        reason: 'Join2Create: Temporärer Sprachkanal erstellt',
      });

      temporaryChannels.set(createdChannel.id, {
        channelId: createdChannel.id,
        ownerId: member.id,
      });

      try {
        await member.voice.setChannel(createdChannel);
      } catch (error) {
        console.error(
          `Join2Create: Automatisches Verschieben in Channel ${createdChannel.id} fehlgeschlagen:`,
          error
        );
      }
    } catch (error) {
      console.error('Join2Create: Fehler beim Erstellen eines temporären Channels:', error);
    } finally {
      creationLocks.delete(member.id);
    }
  };

  client.on('voiceStateUpdate', handleVoiceStateUpdate);

  client.on('channelDelete', (channel) => {
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return;
    }

    temporaryChannels.delete(channel.id);
  });

  client.once('ready', async () => {
    try {
      const guildPromises = [];
      for (const [guildId, guild] of client.guilds.cache) {
        const task = guild.channels
          .fetch()
          .then((channels) => {
            const cleanupTasks = channels
              .filter(
                (channel) =>
                  channel.type === ChannelType.GuildVoice &&
                  channel.parentId === TARGET_CATEGORY_ID &&
                  (channel.name.startsWith('🔊・') || channel.name.startsWith('🎧︱'))
              )
              .map((channel) => {
                if (channel.members.size === 0) {
                  return cleanupChannelIfEmpty(channel);
                }
                return null;
              })
              .filter(Boolean);

            if (cleanupTasks.length === 0) {
              return Promise.resolve();
            }

            return Promise.allSettled(cleanupTasks);
          })
          .catch((error) => {
            console.error(
              `Join2Create: Fehler beim Aufräumen der Guild ${guildId}:`,
              error
            );
          });

        guildPromises.push(task);
      }

      await Promise.allSettled(guildPromises);
    } catch (error) {
      console.error('Join2Create: Fehler beim initialen Aufräumen:', error);
    }
  });
}

module.exports = {
  setupJoin2CreateModule,
};
