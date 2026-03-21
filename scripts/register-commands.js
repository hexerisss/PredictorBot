const commands = [
  {
    name: 'ping',
    description: '🏓 Check if bot is online',
    type: 1,
  },
  {
    name: 'hello',
    description: '👋 Say hello',
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
        description: 'Number of sides',
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: 'quote',
    description: '💬 Get a random quote',
    type: 1,
  },
];

async function registerCommands() {
  const APP_ID = process.env.APP_ID;
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const GUILD_ID = process.env.GUILD_ID;

  console.log('Checking environment variables...');
  console.log('APP_ID exists:', !!APP_ID);
  console.log('BOT_TOKEN exists:', !!BOT_TOKEN);
  console.log('GUILD_ID exists:', !!GUILD_ID);

  if (!APP_ID || !BOT_TOKEN) {
    console.error('❌ Missing APP_ID or BOT_TOKEN');
    console.error('APP_ID:', APP_ID ? 'SET' : 'NOT SET');
    console.error('BOT_TOKEN:', BOT_TOKEN ? 'SET' : 'NOT SET');
    process.exit(1);
  }

  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log(`🔄 Registering ${commands.length} commands...`);
  console.log(`📍 URL: ${url}`);

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
      data.forEach(cmd => console.log(`   • /${cmd.name}`));
    } else {
      const error = await response.text();
      console.error('❌ Discord API Error:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

registerCommands();
