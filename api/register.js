module.exports = async (req, res) => {
  const commands = [
    { name: 'ping', description: '🏓 Check if bot is online', type: 1 },
    { name: 'hello', description: '👋 Say hello', type: 1, options: [{ name: 'user', description: 'User to greet', type: 6, required: false }] },
    { name: 'roll', description: '🎲 Roll a dice', type: 1, options: [{ name: 'sides', description: 'Number of sides', type: 4, required: false }] },
    { name: 'quote', description: '💬 Get a random quote', type: 1 },
  ];

  const url = `https://discord.com/api/v10/applications/${process.env.APP_ID}/guilds/${process.env.GUILD_ID}/commands`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${process.env.BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  const data = await response.json();
  return res.json({ success: response.ok, data });
};
