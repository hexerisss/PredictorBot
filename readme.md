# Discord Bot on Vercel

A serverless Discord bot using slash commands, hosted on Vercel.

## Commands

- `/ping` - Check bot status
- `/hello [@user]` - Greet someone
- `/roll [sides]` - Roll a dice
- `/serverinfo` - Get server info
- `/quote` - Get a random quote

## Setup

1. Fork this repo
2. Deploy to Vercel
3. Add environment variables in Vercel dashboard
4. Register commands using GitHub Actions or manually
5. Set Interactions Endpoint URL in Discord Developer Portal

## Environment Variables

- `APP_ID` - Discord Application ID
- `PUBLIC_KEY` - Discord Public Key
- `BOT_TOKEN` - Discord Bot Token
- `GUILD_ID` - Your test server ID (optional)
