const {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} = require('discord-interactions');

// Verify Discord request
function verifyDiscordRequest(req, body) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  return verifyKey(body, signature, timestamp, process.env.PUBLIC_KEY);
}

// Get raw body from request
async function getRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Command Handlers
const commands = {
  ping: () => ({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: '🏓 Pong!',
        description: 'Bot is running on Vercel serverless functions',
        color: 0x00ff00,
        footer: { text: 'Powered by GitHub + Vercel' }
      }]
    },
  }),

  hello: (interaction) => {
    const user = interaction.data.options?.[0]?.value 
      ? `<@${interaction.data.options[0].value}>`
      : `<@${interaction.member.user.id}>`;
    
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `👋 Hello ${user}! Welcome to our serverless bot!`,
      },
    };
  },

  roll: (interaction) => {
    const sides = interaction.data.options?.[0]?.value || 6;
    const result = Math.floor(Math.random() * sides) + 1;
    
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '🎲 Dice Roll',
          description: `You rolled a **${result}**!`,
          fields: [
            { name: 'Dice Type', value: `d${sides}`, inline: true },
            { name: 'Result', value: `${result}`, inline: true }
          ],
          color: 0x9b59b6
        }]
      },
    };
  },

  serverinfo: (interaction) => {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '📊 Server Information',
          fields: [
            { name: 'Server ID', value: interaction.guild_id, inline: false },
            { name: 'Channel ID', value: interaction.channel_id, inline: false },
            { name: 'User ID', value: interaction.member.user.id, inline: false }
          ],
          color: 0x3498db,
          timestamp: new Date().toISOString()
        }]
      },
    };
  },

  quote: () => {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
      { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
      { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
      { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" }
    ];
    
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [{
          title: '💬 Random Quote',
          description: `*"${quote.text}"*`,
          footer: { text: `— ${quote.author}` },
          color: 0xe74c3c
        }]
      },
    };
  },

  github: () => ({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [{
        title: '🐙 GitHub Repository',
        description: 'Check out the source code for this bot!',
        url: 'https://github.com/YOUR_USERNAME/discord-bot-vercel',
        color: 0x181717,
        fields: [
          { name: 'Tech Stack', value: '• Node.js\n• Discord.js\n• Vercel\n• GitHub Actions', inline: true },
          { name: 'Features', value: '• Serverless\n• Auto-deploy\n• Free hosting', inline: true }
        ]
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: 'View Source',
          url: 'https://github.com/YOUR_USERNAME/discord-bot-vercel'
        }]
      }]
    },
  }),
};

// Main handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    
    // Verify Discord signature
    const isValid = verifyDiscordRequest(req, rawBody);
    if (!isValid) {
      console.error('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const interaction = JSON.parse(rawBody.toString());

    // Handle Discord PING
    if (interaction.type === InteractionType.PING) {
      console.log('✅ PING received');
      return res.status(200).json({ type: InteractionResponseType.PONG });
    }

    // Handle commands
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name } = interaction.data;
      console.log(`⚡ Command: /${name}`);

      const handler = commands[name];
      if (handler) {
        const response = handler(interaction);
        return res.status(200).json(response);
      }

      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: `❌ Unknown command: /${name}` },
      });
    }

    return res.status(400).json({ error: 'Unknown interaction type' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
