const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');
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

const commands = {
  mines: async (interaction) => {
    const userId = interaction.member.user.id;
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ No Active License',
            description: 'You need an active license to use predictions.\n\n**Get started:**\n• Purchase a license at: [Your SellAuth Link]\n• Use `/redeem <key>` to activate\n• Then use `/mines` or `/towers`',
            color: 0xff0000,
            footer: { text: 'Kyo Predictor - Premium License Required' }
          }],
          flags: 64
        }
      };
    }

    const bombs = interaction.data.options[0].value;
    const predictedTiles = interaction.data.options[1].value;
    const hash = interaction.data.options[2].value;

    // Validate hash format
    if (hash.length < 8) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Hash',
            description: 'Please provide a valid game hash from Bloxflip.\n\n**Where to find it:**\n1. Start a Mines game on Bloxflip\n2. Look for the "Provably Fair" section\n3. Copy the Server Seed Hash\n4. Use it in the command',
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    // Validate: can't predict more tiles than available
    const maxSafeTiles = 25 - bombs;
    if (predictedTiles > maxSafeTiles) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Configuration',
            description: `With **${bombs} bombs**, only **${maxSafeTiles} safe tiles** exist!\n\nYou requested **${predictedTiles} predictions**.\n\nPlease choose **${maxSafeTiles} or fewer** tiles.`,
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const prediction = generateMinesPrediction(bombs, predictedTiles, hash);
    await db.savePrediction(userId, 'mines', prediction);

    // Create grid visual
    let gridText = '';
    for (let i = 0; i < 25; i++) {
      gridText += prediction.grid[i] || '⬜';
      if ((i + 1) % 5 === 0) gridText += '\n';
    }

    // Create confidence bar
    const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10)) + 
                         '░'.repeat(10 - Math.floor(prediction.confidence / 10));

    // Determine color based on confidence
    const embedColor = prediction.confidence >= 80 ? 0x00ff00 : 
                      prediction.confidence >= 70 ? 0xffff00 : 0xff6600;

    // Risk assessment
    const riskLevel = predictedTiles <= 3 ? '🟢 Low Risk' : 
                     predictedTiles <= 6 ? '🟡 Medium Risk' : '🔴 High Risk';

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '💣 Mines Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Predictions:** ${predictedTiles}/${prediction.totalSafeTiles} safe tiles\n` +
                      `**Bombs:** ${bombs}\n**Risk:** ${riskLevel}\n\n${gridText}`,
          fields: [
            { 
              name: '📍 Recommended Safe Tiles', 
              value: prediction.safeTiles.map((t, i) => `${i + 1}. Position ${t + 1}`).join('\n'), 
              inline: true 
            },
            { 
              name: '🎯 Game Info', 
              value: `Hash: \`${prediction.hash}...\`\nBombs: ${bombs}\nGrid: 5x5 (25 tiles)`, 
              inline: true 
            }
          ],
          color: embedColor,
          footer: { 
            text: `Kyo Predictor • ${predictedTiles} tiles • More predictions = lower confidence` 
          },
          timestamp: new Date().toISOString()
        }],
        flags: 64
      }
    };
  },

  towers: async (interaction) => {
    const userId = interaction.member.user.id;
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ No Active License',
            description: 'You need an active license to use predictions.\n\n**Get started:**\n• Purchase a license at: [Your SellAuth Link]\n• Use `/redeem <key>` to activate\n• Then use `/mines` or `/towers`',
            color: 0xff0000,
            footer: { text: 'Kyo Predictor - Premium License Required' }
          }],
          flags: 64
        }
      };
    }

    const difficulty = interaction.data.options[0].value;
    const rowCount = interaction.data.options[1].value;
    const hash = interaction.data.options[2].value;

    // Validate hash
    if (hash.length < 8) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Hash',
            description: 'Please provide a valid game hash from Bloxflip.\n\n**Where to find it:**\n1. Start a Towers game on Bloxflip\n2. Look for the "Provably Fair" section\n3. Copy the Server Seed Hash\n4. Use it in the command',
            color: 0xff0000
          }],
          flags: 64
        }
      };
    }

    const prediction = generateTowersPrediction(difficulty, rowCount, hash);
    await db.savePrediction(userId, 'towers', prediction);

    const tileEmojis = ['⬅️', '⬆️', '➡️'];
    const tileNames = ['Left', 'Middle', 'Right'];
    
    const path = prediction.predictions.map((tile, idx) => 
      `**Row ${idx + 1}:** ${tileEmojis[tile]} ${tileNames[tile]}`
    ).join('\n');

    const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10)) + 
                         '░'.repeat(10 - Math.floor(prediction.confidence / 10));

    const embedColor = prediction.confidence >= 80 ? 0x9b59b6 : 
                      prediction.confidence >= 70 ? 0xe67e22 : 0xe74c3c;

    const riskLevel = rowCount <= 2 ? '🟢 Low Risk' : 
                     rowCount <= 5 ? '🟡 Medium Risk' : '🔴 High Risk';

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🗼 Towers Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Difficulty:** ${difficulty.toUpperCase()}\n` +
                      `**Rows Predicted:** ${rowCount}/${prediction.totalRows}\n` +
                      `**Risk:** ${riskLevel}\n\n${path}`,
          fields: [
            { 
              name: '🎯 Game Info', 
              value: `Hash: \`${prediction.hash}...\`\nDifficulty: ${difficulty}\nTotal Rows: 8`, 
              inline: true 
            },
            {
              name: '💡 Strategy Tip',
              value: rowCount <= 3 ? 'Safe play! Good for consistent wins.' :
                     rowCount <= 6 ? 'Balanced risk. Watch the confidence!' :
                     'High risk! Consider cashing out early.',
              inline: true
            }
          ],
          color: embedColor,
          footer: { 
            text: `Kyo Predictor • ⬅️ Left | ⬆️ Middle | ➡️ Right • More rows = lower confidence` 
          },
          timestamp: new Date().toISOString()
        }],
        flags: 64
      }
    };
  },

  redeem: async (interaction) => {
    const userId = interaction.member.user.id;
    const key = interaction.data.options[0].value.toUpperCase().trim();

    const result = await db.redeemKey(userId, key);

    if (!result.success) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Redemption Failed',
            description: `**Error:** ${result.error}\n\n**Common issues:**\n• Key already used\n• Invalid key format\n• Typo in key\n\nDouble-check your key and try again.\nIf issues persist, contact support.`,
            color: 0xff0000,
            footer: { text: 'Kyo Predictor - License Redemption' }
          }],
          flags: 64
        }
      };
    }

    const expiryDate = new Date(result.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '✅ License Activated!',
          description: `Your premium license is now active!\n\n**Available Commands:**\n• \`/mines\` - Predict Mines games\n• \`/towers\` - Predict Towers games\n• \`/license\` - Check status\n• \`/help\` - Get help`,
          fields: [
            { name: 'Expires', value: expiryDate, inline: true },
            { name: 'Status', value: '🟢 Active', inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Kyo Predictor - Welcome!' },
          timestamp: new Date().toISOString()
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
            description: license.expired 
              ? '❌ Your license has expired\n\nPurchase a new license to continue using predictions.'
              : '❌ No active license found\n\nPurchase a license and use `/redeem <key>` to activate.',
            fields: [
              { name: 'Get a License', value: '[Purchase Here](https://your-sellauth-link.com)', inline: false }
            ],
            color: 0xff0000,
            footer: { text: 'Kyo Predictor' }
          }],
          flags: 64
        }
      };
    }

    const expiryDate = new Date(license.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const daysLeft = Math.ceil((license.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '✅ Active License',
          description: `Your premium license is active and working!`,
          fields: [
            { name: 'Status', value: '🟢 Active', inline: true },
            { name: 'Expires', value: expiryDate, inline: true },
            { name: 'Days Remaining', value: `${daysLeft} days`, inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Kyo Predictor - License Status' },
          timestamp: new Date().toISOString()
        }],
        flags: 64
      }
    };
  },

  help: async (interaction) => {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '❓ Kyo Predictor - Help Guide',
          description: '**Available Commands:**',
          fields: [
            {
              name: '💣 /mines',
              value: '```\n/mines bombs:3 predictions:2 hash:abc123...\n```\nGet Mines predictions. Choose bomb count and how many tiles to predict.',
              inline: false
            },
            {
              name: '🗼 /towers',
              value: '```\n/towers difficulty:easy rows:3 hash:abc123...\n```\nGet Towers predictions. Choose difficulty and number of rows.',
              inline: false
            },
            {
              name: '🔑 /redeem',
              value: '```\n/redeem key:KEY-ABC123XYZ\n```\nActivate your license key after purchase.',
              inline: false
            },
            {
              name: '📋 /license',
              value: 'Check your current license status and expiry date.',
              inline: false
            },
            {
              name: '📚 Tips & Tricks',
              value: '• More predictions = lower confidence\n• Start with 1-3 tiles for high accuracy\n• Hash found in Provably Fair section on Bloxflip\n• Use `/license` to check time remaining',
              inline: false
            },
            {
              name: '🛒 Get a License',
              value: 'Purchase at: [Your SellAuth Link]\nPrices: 1 Day ($2.99) | 5 Days ($4.99) | 1 Month ($12.99) | Lifetime ($39.99)',
              inline: false
            }
          ],
          color: 0x5865f2,
          footer: { text: 'Kyo Predictor - Premium Bloxflip Predictions' }
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
            description: 'This command is restricted to administrators only.',
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
          description: `A new license key has been created successfully.`,
          fields: [
            { name: 'Key', value: `\`${key}\``, inline: false },
            { name: 'Duration', value: `${days} days`, inline: true },
            { name: 'Status', value: 'Unredeemed', inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Admin Panel - Keep this key secure!' }
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

    return res.status(400).json({ error: 'Unknown interaction' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
