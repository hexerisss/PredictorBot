const commands = [
  {
    name: 'mines',
    description: '💣 Get mines prediction',
    type: 1,
    options: [
      {
        name: 'bombs',
        description: 'Number of bombs',
        type: 4,
        required: true,
        choices: [
          { name: '1 Bomb', value: 1 },
          { name: '3 Bombs', value: 3 },
          { name: '5 Bombs', value: 5 },
          { name: '10 Bombs', value: 10 },
          { name: '15 Bombs', value: 15 },
          { name: '20 Bombs', value: 20 }
        ]
      },
      {
        name: 'predictions',
        description: 'How many safe tiles to predict',
        type: 4,
        required: true,
        choices: [
          { name: '1 Tile (Highest confidence)', value: 1 },
          { name: '2 Tiles (Very High)', value: 2 },
          { name: '3 Tiles (High)', value: 3 },
          { name: '4 Tiles (Good)', value: 4 },
          { name: '5 Tiles (Medium)', value: 5 },
          { name: '6 Tiles (Moderate)', value: 6 },
          { name: '7 Tiles (Lower)', value: 7 },
          { name: '8 Tiles (Low)', value: 8 },
          { name: '9 Tiles (Very Low)', value: 9 },
          { name: '10 Tiles (Risky)', value: 10 }
        ]
      },
      {
        name: 'hash',
        description: 'Game hash from Bloxflip',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'towers',
    description: '🗼 Get towers prediction',
    type: 1,
    options: [
      {
        name: 'difficulty',
        description: 'Game difficulty',
        type: 3,
        required: true,
        choices: [
          { name: 'Easy (3 tiles, 1 bomb)', value: 'easy' },
          { name: 'Medium (2 tiles, 1 bomb)', value: 'medium' },
          { name: 'Hard (3 tiles, 2 bombs)', value: 'hard' }
        ]
      },
      {
        name: 'rows',
        description: 'How many rows to predict',
        type: 4,
        required: true,
        choices: [
          { name: '1 Row (95% confidence)', value: 1 },
          { name: '2 Rows (90% confidence)', value: 2 },
          { name: '3 Rows (85% confidence)', value: 3 },
          { name: '4 Rows (80% confidence)', value: 4 },
          { name: '5 Rows (75% confidence)', value: 5 },
          { name: '6 Rows (70% confidence)', value: 6 },
          { name: '7 Rows (65% confidence)', value: 7 },
          { name: '8 Rows (60% confidence)', value: 8 }
        ]
      },
      {
        name: 'hash',
        description: 'Game hash from Bloxflip',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'redeem',
    description: '🔑 Redeem a license key',
    type: 1,
    options: [
      {
        name: 'key',
        description: 'Your license key',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'license',
    description: '📋 Check your license status',
    type: 1,
  },
  {
    name: 'help',
    description: '❓ Get help and command examples',
    type: 1,
  },
  {
    name: 'admin-generate',
    description: '🔐 Generate a license key (Admin only)',
    type: 1,
    options: [
      {
        name: 'days',
        description: 'License duration in days',
        type: 4,
        required: true
      }
    ]
  }
];

async function registerCommands() {
  const { APP_ID, BOT_TOKEN, GUILD_ID } = process.env;

  if (!APP_ID || !BOT_TOKEN) {
    console.error('❌ Missing APP_ID or BOT_TOKEN');
    process.exit(1);
  }

  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log('🔄 Registering commands...');
  console.log(`📍 Scope: ${GUILD_ID ? 'Guild (instant)' : 'Global (takes ~1 hour)'}`);

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
      console.error('❌ Failed to register commands:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

registerCommands();
