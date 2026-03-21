const { InteractionType, InteractionResponseType, verifyKey } = require('discord-interactions');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get raw body
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);

  // Verify request
  const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.PUBLIC_KEY);
  
  if (!isValidRequest) {
    console.error('Invalid request signature');
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  const interaction = req.body;

  // Handle PING
  if (interaction.type === InteractionType.PING) {
    console.log('Handling PING');
    return res.status(200).json({ type: InteractionResponseType.PONG });
  }

  // Handle commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name } = interaction.data;
    console.log(`Command received: ${name}`);

    switch (name) {
      case 'ping':
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🏓 Pong!',
              description: 'Bot is running on Vercel!',
              color: 0x00ff00,
            }]
          }
        });

      case 'hello':
        const userId = interaction.data.options?.[0]?.value || interaction.member.user.id;
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `👋 Hello <@${userId}>!` }
        });

      case 'roll':
        const sides = interaction.data.options?.[0]?.value || 6;
        const result = Math.floor(Math.random() * sides) + 1;
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '🎲 Dice Roll',
              description: `You rolled a **${result}**!`,
              fields: [
                { name: 'Dice', value: `d${sides}`, inline: true },
                { name: 'Result', value: `${result}`, inline: true }
              ],
              color: 0x9b59b6
            }]
          }
        });

      case 'quote':
        const quotes = [
          { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
          { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{
              title: '💬 Random Quote',
              description: `*"${quote.text}"*`,
              footer: { text: `— ${quote.author}` },
              color: 0xe74c3c
            }]
          }
        });

      default:
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `Unknown command: ${name}` }
        });
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' });
};
