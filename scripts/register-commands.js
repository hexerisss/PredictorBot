const commands = [
  {
    name: 'panel',
    description: '🎮 Open the predictor panel',
    type: 1,
  },
  {
    name: 'predict-mines',
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
        name: 'hash',
        description: 'Game hash from Bloxflip',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'predict-towers',
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
    console.log(`✅ Registered ${data.length} commands!`);
    data.forEach(cmd => console.log(`   • /${cmd.name}`));
  } else {
    console.error('❌ Failed:', await response.text());
    process.exit(1);
  }
}

registerCommands();
