require('dotenv').config();

const commands = [
  {
    name: 'ping',
    description: '🏓 Check if bot is online',
    type: 1,
  },
  {
    name: 'hello',
    description: '👋 Say hello to someone',
    type: 1,
    options: [
      {
        name: 'user',
        description: 'User to greet',
        type: 6,
        required: false,
      },
    ],
  },
  {
    name: 'roll',
    description: '🎲 Roll a dice',
    type: 1,
    options: [
      {
        name: 'sides',
        description: 'Number of sides (default: 6)',
        type: 4,
        required: false,
        min_value: 2,
        max_value: 100,
      },
    ],
  },
  {
    name: 'serverinfo',
    description: '📊 Get server information',
    type: 1,
  },
  {
    name: 'quote',
    description: '💬 Get a random quote',
    type: 1,
  },
  {
    name: 'github',
    description: '🐙 View bot source code',
    type: 1,
  },
];

async function registerCommands() {
  const { APP_ID, BOT_TOKEN, GUILD_ID } = process.env;

  if (!APP_ID || !BOT_TOKEN) {
    console.error('❌ Missing APP_ID or BOT_TOKEN in environment variables');
    process.exit(1);
  }

  // Use guild commands for testing (instant), or global for production (takes ~1 hour)
  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log(`🔄 Registering ${commands.length} commands...`);
  console.log(`📍 Scope: ${GUILD_ID ? 'Guild (test server)' : 'Global'}`);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify(commands),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Successfully registered ${data.length} commands!`);
      data.forEach((cmd) => console.log(`   • /${cmd.name}`));
    } else {
      const error = await response.text();
      console.error('❌ Failed to register commands:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

registerCommands();
