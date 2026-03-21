const commands = {
  // ... other commands stay the same ...

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
          flags: 64
        }
      };
    }

    const bombs = interaction.data.options[0].value;
    const predictedTiles = interaction.data.options[1].value;
    const hash = interaction.data.options[2].value;

    // Validate: can't predict more tiles than available
    const maxSafeTiles = 25 - bombs;
    if (predictedTiles > maxSafeTiles) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [{
            title: '❌ Invalid Configuration',
            description: `With **${bombs} bombs**, only **${maxSafeTiles} safe tiles** exist!\n\nYou requested **${predictedTiles} predictions**.\n\nPlease choose ${maxSafeTiles} or fewer tiles.`,
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

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '💣 Mines Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Predictions:** ${predictedTiles}/${prediction.totalSafeTiles} safe tiles\n` +
                      `**Bombs:** ${bombs}\n\n${gridText}`,
          fields: [
            { 
              name: '📍 Safe Positions', 
              value: prediction.safeTiles.map(t => `Position ${t + 1}`).join(', '), 
              inline: false 
            },
            { 
              name: '🎯 Hash', 
              value: `\`${prediction.hash}\``, 
              inline: true 
            },
            {
              name: '⚠️ Risk Level',
              value: predictedTiles <= 3 ? '🟢 Low' : 
                     predictedTiles <= 6 ? '🟡 Medium' : '🔴 High',
              inline: true
            }
          ],
          color: prediction.confidence >= 80 ? 0x00ff00 : 
                 prediction.confidence >= 70 ? 0xffff00 : 0xff6600,
          footer: { 
            text: `✅ Click green tiles • Predicting ${predictedTiles} tiles reduces confidence` 
          }
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
    const rowCount = interaction.data.options[1].value;
    const hash = interaction.data.options[2].value;

    const prediction = generateTowersPrediction(difficulty, rowCount, hash);
    await db.savePrediction(userId, 'towers', prediction);

    const tileEmojis = ['⬅️', '⬆️', '➡️'];
    const path = prediction.predictions.map((tile, idx) => 
      `Row ${idx + 1}: ${tileEmojis[tile]} ${['Left', 'Middle', 'Right'][tile]}`
    ).join('\n');

    const confidenceBar = '█'.repeat(Math.floor(prediction.confidence / 10)) + 
                         '░'.repeat(10 - Math.floor(prediction.confidence / 10));

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🗼 Towers Prediction',
          description: `**Confidence:** ${prediction.confidence}% ${confidenceBar}\n` +
                      `**Difficulty:** ${difficulty.toUpperCase()}\n` +
                      `**Rows Predicted:** ${rowCount}/${prediction.totalRows}\n\n${path}`,
          fields: [
            { 
              name: '🎯 Hash', 
              value: `\`${prediction.hash}\``, 
              inline: true 
            },
            {
              name: '⚠️ Risk Level',
              value: rowCount <= 2 ? '🟢 Low' : 
                     rowCount <= 5 ? '🟡 Medium' : '🔴 High',
              inline: true
            }
          ],
          color: prediction.confidence >= 80 ? 0x9b59b6 : 
                 prediction.confidence >= 70 ? 0xe67e22 : 0xe74c3c,
          footer: { 
            text: `⬅️ Left | ⬆️ Middle | ➡️ Right • More rows = lower confidence` 
          }
        }],
        flags: 64
      }
    };
  },
};
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
