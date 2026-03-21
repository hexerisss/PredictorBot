const { InteractionType, InteractionResponseType, InteractionResponseFlags, verifyKey } = require('discord-interactions');
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
    
    // Check license first (quick check)
    const license = await db.checkLicense(userId);

    if (!license.active) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ No Active License',
            description: 'You need an active license to use predictions.\n\n**Get started:**\n• Purchase a license at: https://your-sellauth-link.sellauth.com\n• Use `/redeem <key>` to activate\n• Then use `/mines` or `/towers` to predict!',
            color: 0xff0000,
            footer: { text: 'Kyo Predictor - Premium License Required' }
          }],
          flags: InteractionResponseFlags.EPHEMERAL
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
            description: 'Please provide a valid game hash from Bloxflip.\n\n**Where to find it:**\n1. Start a Mines game on Bloxflip\n2. Look for the "Provably Fair" section\n3. Copy the Server Seed Hash\n4. Paste it in the command',
            color: 0xff0000
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    // Calculate max safe tiles
    const maxSafeTiles = 25 - bombs;

    // Validate impossible configurations
    if (bombs >= 25) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Configuration',
            description: `You can't have **25 bombs** on a 5x5 grid!\n\nMaximum bombs: **24**\n\nPlease choose a valid bomb count.`,
            color: 0xff0000
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    if (bombs >= 24) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '⚠️ Extremely High Risk',
            description: `With **${bombs} bombs**, only **${maxSafeTiles} safe tile(s)** exist!\n\nThis configuration is **extremely unlikely** to win.\n\n**Recommendation:** Use 20 or fewer bombs for realistic predictions.`,
            color: 0xff6600
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    // Validate: can't predict more tiles than available
    if (predictedTiles > maxSafeTiles) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Configuration',
            description: `With **${bombs} bombs**, only **${maxSafeTiles} safe tile(s)** exist!\n\nYou requested **${predictedTiles} predictions**.\n\n**Maximum predictions:** ${maxSafeTiles} tile${maxSafeTiles === 1 ? '' : 's'}`,
            color: 0xff0000
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    // Warn for very high bomb counts
    if (bombs >= 20 && predictedTiles > 2) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '⚠️ High Risk Warning',
            description: `**${bombs} bombs** with **${predictedTiles} predictions** is extremely risky!\n\nOnly **${maxSafeTiles} safe tiles** exist.\n\n**Recommendation:** Predict **1-2 tiles maximum** with this many bombs.`,
            fields: [
              { name: 'Max Safe Tiles', value: `${maxSafeTiles}`, inline: true },
              { name: 'Your Predictions', value: `${predictedTiles}`, inline: true },
              { name: 'Expected Confidence', value: '< 65%', inline: true }
            ],
            color: 0xff6600
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    // Generate prediction
    const prediction = generateMinesPrediction(bombs, predictedTiles, hash);
    
    // Save to database (async, don't wait)
    db.savePrediction(userId, 'mines', prediction).catch(err => console.error('Save error:', err));

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
                      prediction.confidence >= 70 ? 0xffff00 : 
                      prediction.confidence >= 60 ? 0xff6600 : 0xff0000;

    // Risk assessment
    const riskLevel = prediction.confidence >= 80 ? '🟢 Low Risk' : 
                     prediction.confidence >= 70 ? '🟡 Medium Risk' : 
                     prediction.confidence >= 60 ? '🟠 High Risk' : '🔴 Extreme Risk';

    // Warning for low confidence
    let warningText = '';
    if (prediction.confidence < 70) {
      warningText = `\n\n⚠️ **Warning:** Low confidence! Consider reducing predictions or bomb count.`;
    }

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '💣 Mines Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Predictions:** ${predictedTiles}/${prediction.totalSafeTiles} safe tiles\n` +
                      `**Bombs:** ${bombs}\n**Risk:** ${riskLevel}${warningText}\n\n${gridText}`,
          fields: [
            { 
              name: '📍 Recommended Safe Tiles', 
              value: prediction.safeTiles.map((t, i) => `${i + 1}. Position ${t + 1}`).join('\n') || 'None', 
              inline: true 
            },
            { 
              name: '🎯 Game Info', 
              value: `Hash: \`${prediction.hash}...\`\nBombs: ${bombs}\nSafe: ${maxSafeTiles}`, 
              inline: true 
            }
          ],
          color: embedColor,
          footer: { 
            text: `Kyo Predictor • ${predictedTiles} tiles • Confidence based on bomb count & predictions` 
          },
          timestamp: new Date().toISOString()
        }],
        flags: InteractionResponseFlags.EPHEMERAL
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
            description: 'You need an active license to use predictions.\n\n**Get started:**\n• Purchase a license at: https://your-sellauth-link.sellauth.com\n• Use `/redeem <key>` to activate\n• Then use `/mines` or `/towers` to predict!',
            color: 0xff0000,
            footer: { text: 'Kyo Predictor - Premium License Required' }
          }],
          flags: InteractionResponseFlags.EPHEMERAL
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
            description: 'Please provide a valid game hash from Bloxflip.\n\n**Where to find it:**\n1. Start a Towers game on Bloxflip\n2. Look for the "Provably Fair" section\n3. Copy the Server Seed Hash\n4. Paste it in the command',
            color: 0xff0000
          }],
          flags: InteractionResponseFlags.EPHEMERAL
        }
      };
    }

    const prediction = generateTowersPrediction(difficulty, rowCount, hash);
    
    // Save prediction (async)
    db.savePrediction(userId, 'towers', prediction).catch(err => console.error('Save error:', err));

    const tileEmojis = ['⬅️', '⬆️', '➡️'];
    const tileNames = ['Left', 'Middle', 'Right'];
    
    const path = prediction.predictions.map((tile, idx) => 
      `**Row ${idx + 1}:** ${tileEmojis[tile]} ${tileNames[tile]}`
    ).join('\n');

    const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10)) + 
                         '░'.repeat(10 - Math.floor(prediction.confidence / 10));

    const embedColor = prediction.confidence >= 80 ? 0x9b59b6 : 
                      prediction.confidence >= 70 ? 0xe67e22 : 
                      prediction.confidence >= 60 ? 0xe74c3c : 0x992d22;

    const riskLevel = prediction.confidence >= 80 ? '🟢 Low Risk' : 
                     prediction.confidence >= 70 ? '🟡 Medium Risk' : 
                     prediction.confidence >= 60 ? '🟠 High Risk' : '🔴 Extreme Risk';

    // Warning for low confidence
    let warningText = '';
    if (prediction.confidence < 70) {
      warningText = `\n\n⚠️ **Warning:** Low confidence! Consider predicting fewer rows.`;
    }

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🗼 Towers Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Difficulty:** ${difficulty.toUpperCase()}\n` +
                      `**Rows Predicted:** ${rowCount}/${prediction.totalRows}\n` +
                      `**Risk:** ${riskLevel}${warningText}\n\n${path}`,
          fields: [
            { 
              name: '🎯 Game Info', 
              value: `Hash: \`${prediction.hash}...\`\nDifficulty: ${difficulty}\nTotal Rows: 8`, 
              inline: true 
            },
            {
              name: '💡 Strategy Tip',
              value: prediction.confidence >= 80 ? 'Safe play! Good for consistent wins.' :
                     prediction.confidence >= 70 ? 'Balanced risk. Consider cashing out soon.' :
                     prediction.confidence >= 60 ? 'High risk! Cash out when comfortable.' :
                     'Extreme risk! Consider fewer rows.',
              inline: true
            }
          ],
          color: embedColor,
          footer: { 
            text: `Kyo Predictor • ⬅️ Left | ⬆️ Middle | ➡️ Right • More rows = lower confidence` 
          },
          timestamp: new Date().toISOString()
        }],
        flags: InteractionResponseFlags.EPHEMERAL
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
          flags: InteractionResponseFlags.EPHEMERAL
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
          title: '✅ License Activated Successfully!',
          description: `Your premium license is now active!\n\n**You can now use:**\n• \`/mines\` - Predict Mines games\n• \`/towers\` - Predict Towers games\n• \`/license\` - Check your status\n• \`/help\` - View all commands`,
          fields: [
            { name: '⏰ Expires', value: expiryDate, inline: true },
            { name: '✅ Status', value: 'Active', inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Kyo Predictor - Welcome aboard!' },
          timestamp: new Date().toISOString()
        }],
        flags: InteractionResponseFlags.EPHEMERAL
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
              ? '❌ Your license has expired\n\n**Renew now:**\nVisit our shop and use `/redeem <key>` to activate a new license.'
              : '❌ No active license found\n\n**Get started:**\nPurchase a license and use `/redeem <key>` to activate.',
            fields: [
              { name: '🛒 Get a License', value: '[Shop Link](https://your-sellauth-link.sellauth.com)', inline: false }
            ],
            color: 0xff0000,
            footer: { text: 'Kyo Predictor' }
          }],
          flags: InteractionResponseFlags.EPHEMERAL
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
          description: `Your premium license is active!\n\n**Available commands:**\n• \`/mines\` - Mines predictions\n• \`/towers\` - Towers predictions`,
          fields: [
            { name: '✅ Status', value: 'Active', inline: true },
            { name: '⏰ Expires', value: expiryDate, inline: true },
            { name: '📅 Days Left', value: `${daysLeft} days`, inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Kyo Predictor - License Status' },
          timestamp: new Date().toISOString()
        }],
        flags: InteractionResponseFlags.EPHEMERAL
      }
    };
  },

  help: async (interaction) => {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '❓ Kyo Predictor - Command Guide',
          description: '**Quick Start Guide:**\n\n1. Purchase a license from our shop\n2. Use `/redeem <key>` to activate\n3. Use `/mines` or `/towers` to predict!\n\n**All Commands:**',
          fields: [
            {
              name: '💣 /mines',
              value: '```\n/mines bombs:3 predictions:2 hash:abc123...\n```\nPredict Mines games. Choose bomb count (1-24) and number of safe tiles to predict.\n\n**Example:** `/mines bombs:5 predictions:3 hash:a1b2c3d4`\n\n⚠️ **Max bombs:** 24 (1 safe tile minimum)',
              inline: false
            },
            {
              name: '🗼 /towers',
              value: '```\n/towers difficulty:easy rows:3 hash:abc123...\n```\nPredict Towers games. Choose difficulty (easy/medium/hard) and rows to predict (1-8).\n\n**Example:** `/towers difficulty:medium rows:4 hash:a1b2c3d4`',
              inline: false
            },
            {
              name: '🔑 /redeem',
              value: '```\n/redeem key:KEY-ABC123XYZ\n```\nActivate your license after purchase. Key is sent to your email.',
              inline: false
            },
            {
              name: '📋 /license',
              value: 'Check your license status, expiry date, and days remaining.',
              inline: false
            },
            {
              name: '📚 Pro Tips',
              value: '• **More predictions = lower confidence**\n• **More bombs = lower confidence**\n• Start with 1-3 tiles for best accuracy\n• 20+ bombs are extremely risky\n• Higher confidence = safer bet\n• Lower predictions = higher win chance',
              inline: false
            },
            {
              name: '🔍 Where to find the hash?',
              value: '1. Start any game on Bloxflip\n2. Click "Provably Fair" button\n3. Copy the "Server Seed Hash"\n4. Paste it in the command',
              inline: false
            },
            {
              name: '🛒 Need a License?',
              value: '**Pricing:**\n• 1 Day - $2.99\n• 5 Days - $4.99\n• 1 Month - $12.99\n• Lifetime - $39.99\n\n[Purchase Now](https://your-sellauth-link.sellauth.com)',
              inline: false
            }
          ],
          color: 0x5865f2,
          footer: { text: 'Kyo Predictor - Premium Bloxflip Predictions' }
        }],
        flags: InteractionResponseFlags.EPHEMERAL
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
          flags: InteractionResponseFlags.EPHEMERAL
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
            { name: '🔑 Key', value: `\`${key}\``, inline: false },
            { name: '⏰ Duration', value: `${days} days`, inline: true },
            { name: '✅ Status', value: 'Unredeemed', inline: true }
          ],
          color: 0x00ff00,
          footer: { text: 'Admin Panel - Share this key with customer' },
          timestamp: new Date().toISOString()
        }],
        flags: InteractionResponseFlags.EPHEMERAL
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
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const interaction = JSON.parse(rawBody.toString());

    // Handle PING
    if (interaction.type === InteractionType.PING) {
      return res.json({ type: InteractionResponseType.PONG });
    }

    // Handle commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const handler = commands[interaction.data.name];
      if (handler) {
        try {
          const response = await handler(interaction);
          return res.json(response);
        } catch (error) {
          console.error('Command handler error:', error);
          return res.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ An error occurred while processing your request. Please try again.',
              flags: InteractionResponseFlags.EPHEMERAL
            }
          });
        }
      }
    }

    return res.status(400).json({ error: 'Unknown interaction' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
