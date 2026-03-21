const { InteractionType, InteractionResponseType, verifyKey, MessageComponentTypes, ButtonStyleTypes } = require('discord-interactions');
const db = require('../lib/database');
const { generateMinesPrediction, generateTowersPrediction } = require('../lib/predictor');

const ADMIN_USER_ID = '1418119119227850802';

function verifyDiscordRequest(req, body) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  return verifyKey(body, signature, timestamp, process.env.PUBLIC_KEY);
}

async function getRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function createPanelMessage() {
  return {
    embeds: [{
      title: '🎮 Bloxflip Predictor Panel',
      description: '**Premium Prediction Service**\n\nGet accurate predictions for Bloxflip Mines and Towers games.',
      fields: [
        { name: '💣 Mines', value: 'Use `/predict-mines` with your game hash', inline: true },
        { name: '🗼 Towers', value: 'Use `/predict-towers` with your game hash', inline: true },
        { name: '📊 Accuracy', value: '70-95% confidence', inline: true }
      ],
      color: 0x5865f2,
      footer: { text: 'Premium License Required' }
    }],
    components: [{
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: '🔑 Redeem Key',
          custom_id: 'redeem_key'
        },
        {
          type: 2,
          style: 3,
          label: '💳 Buy License',
          custom_id: 'buy_license'
        },
        {
          type: 2,
          style: 2,
          label: '📋 Check License',
          custom_id: 'check_license'
        }
      ]
    }]
  };
}

const commands = {
  panel: async (interaction) => {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: createPanelMessage()
    };
  },

  'predict-mines': async (interaction) => {
    const userId = interaction.member.user.id;
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ No Active License',
            description: 'You need an active license to use predictions.\n\nUse `/panel` to get started!',
            color: 0xff0000
          }],
          flags: 64 // Ephemeral
        }
      };
    }

    const bombs = interaction.data.options[0].value;
    const hash = interaction.data.options[1].value;

    const prediction = generateMinesPrediction(bombs, hash);
    await db.savePrediction(userId, 'mines', prediction);

    // Create grid visual
    let gridText = '';
    for (let i = 0; i < 25; i++) {
      gridText += prediction.grid[i] || '⬜';
      if ((i + 1) % 5 === 0) gridText += '\n';
    }

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '💣 Mines Prediction',
          description: `**Confidence:** ${prediction.confidence}%\n**Bombs:** ${bombs}\n\n${gridText}`,
          fields: [
            { name: 'Hash', value: `\`${prediction.hash}\``, inline: true },
            { name: 'Safe Tiles', value: prediction.safeTiles.join(', '), inline: true }
          ],
          color: 0x00ff00,
          footer: { text: '✅ Click on green tiles' }
        }],
        flags: 64
      }
    };
  },

  'predict-towers': async (interaction) => {
    const userId = interaction.member.user.id;
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ No Active License',
            description: 'You need an active license to use predictions.\n\nUse `/panel` to get started!',
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const difficulty = interaction.data.options[0].value;
    const hash = interaction.data.options[1].value;

    const prediction = generateTowersPrediction(difficulty, hash);
    await db.savePrediction(userId, 'towers', prediction);

    const tileEmojis = ['⬅️', '⬆️', '➡️'];
    const path = prediction.predictions.map((tile, idx) => 
      `Row ${idx + 1}: ${tileEmojis[tile]}`
    ).join('\n');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🗼 Towers Prediction',
          description: `**Confidence:** ${prediction.confidence}%\n**Difficulty:** ${difficulty.toUpperCase()}\n\n${path}`,
          fields: [
            { name: 'Hash', value: `\`${prediction.hash}\``, inline: true },
            { name: 'Rows', value: `${prediction.rows}`, inline: true }
          ],
          color: 0x9b59b6,
          footer: { text: '⬅️ Left | ⬆️ Middle | ➡️ Right' }
        }],
        flags: 64
      }
    };
  },

  redeem: async (interaction) => {
    const userId = interaction.member.user.id;
    const key = interaction.data.options[0].value;

    const result = await db.redeemKey(userId, key);

    if (!result.success) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Redemption Failed',
            description: result.error,
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const expiryDate = new Date(result.expiresAt).toLocaleDateString();

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '✅ License Activated!',
          description: `Your premium license is now active.\n\n**Expires:** ${expiryDate}\n\nUse \`/panel\` to start predicting!`,
          color: 0x00ff00
        }],
        flags: 64
      }
    };
  },

  license: async (interaction) => {
    const userId = interaction.member.user.id;
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '📋 License Status',
            description: license.expired ? '❌ Your license has expired' : '❌ No active license',
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const expiryDate = new Date(license.expiresAt).toLocaleDateString();
    const daysLeft = Math.ceil((license.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '✅ Active License',
          fields: [
            { name: 'Status', value: 'Active', inline: true },
            { name: 'Expires', value: expiryDate, inline: true },
            { name: 'Days Left', value: `${daysLeft} days`, inline: true }
          ],
          color: 0x00ff00
        }],
        flags: 64
      }
    };
  },

  'admin-generate': async (interaction) => {
    const userId = interaction.member.user.id;

    if (userId !== ADMIN_USER_ID) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Access Denied',
            description: 'This command is admin-only.',
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const days = interaction.data.options[0].value;
    const key = await db.generateKey(days);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🔑 License Key Generated',
          description: `**Key:** \`${key}\`\n**Duration:** ${days} days\n\nShare this with the customer.`,
          color: 0x00ff00
        }],
        flags: 64
      }
    };
  }
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const isValid = verifyDiscordRequest(req, rawBody);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const interaction = JSON.parse(rawBody.toString());

    if (interaction.type === InteractionType.PING) {
      return res.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const handler = commands[interaction.data.name];
      if (handler) {
        const response = await handler(interaction);
        return res.json(response);
      }
    }

    // Handle button clicks
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      const userId = interaction.member.user.id;

      if (interaction.data.custom_id === 'check_license') {
        const license = await db.checkLicense(userId);
        const message = license.active
          ? `✅ Active until ${new Date(license.expiresAt).toLocaleDateString()}`
          : '❌ No active license';

        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: message,
            flags: 64
          }
        });
      }

      if (interaction.data.custom_id === 'buy_license') {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '💳 Purchase License',
              description: 'To purchase a license:\n\n1. Create a ticket in <#YOUR_TICKET_CHANNEL>\n2. Select "Purchase License"\n3. Our staff will assist you\n\n**Pricing:**\n• 7 Days - $5\n• 30 Days - $15\n• Lifetime - $50',
              color: 0x5865f2
            }],
            flags: 64
          }
        });
      }

      if (interaction.data.custom_id === 'redeem_key') {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Use `/redeem <key>` to activate your license!',
            flags: 64
          }
        });
      }
    }

    return res.status(400).json({ error: 'Unknown interaction' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
