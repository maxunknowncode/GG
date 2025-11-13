/**
 * Wartung 2024-08-17: Linting/Formatierung/ENV-Check hinzugefügt, Logik unverändert.
 */

const REQUIRED_ENV_VARS = [
  {
    key: 'DISCORD_TOKEN',
    fallback: 'TOKEN',
    label: 'DISCORD_TOKEN (oder TOKEN)',
  },
  { key: 'CLIENT_ID' },
  { key: 'GUILD_ID' },
];

function resolveEnvValue(primaryKey, fallbackKey) {
  const primaryValue = process.env[primaryKey];
  if (primaryValue) {
    return primaryValue;
  }

  if (fallbackKey) {
    return process.env[fallbackKey];
  }

  return undefined;
}

function validateEnv() {
  const missing = [];
  const resolved = {};

  for (const { key, fallback, label } of REQUIRED_ENV_VARS) {
    const value = resolveEnvValue(key, fallback);
    if (!value) {
      missing.push(label ?? key);
      continue;
    }

    resolved[key] = value;
  }

  if (missing.length > 0) {
    for (const variable of missing) {
      console.error(`[Env] Fehlende Umgebungsvariable: ${variable}`);
    }

    process.exit(1);
  }

  if (!process.env.TOKEN && resolved.DISCORD_TOKEN) {
    process.env.TOKEN = resolved.DISCORD_TOKEN;
  }

  return {
    discordToken: resolved.DISCORD_TOKEN,
    clientId: resolved.CLIENT_ID,
    guildId: resolved.GUILD_ID,
  };
}

module.exports = validateEnv();
