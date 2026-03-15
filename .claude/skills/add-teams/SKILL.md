---
name: add-teams
description: Add Microsoft Teams as a channel. Requires a public HTTP endpoint (webhook) for the bot. Uses Azure Bot Framework.
---

# Add Microsoft Teams Channel

This skill adds Microsoft Teams support to NanoClaw, then walks through interactive setup.

## Phase 1: Pre-flight

### Check if already applied

Check if `src/channels/teams.ts` exists. If it does, skip to Phase 3 (Setup). The code changes are already in place.

### Ask the user

**Do they already have an Azure Bot configured for Teams?** If yes, collect the App ID and App Password now. If no, we'll create one in Phase 3.

**Do they have a public URL for the webhook?** Teams requires a public HTTPS endpoint. Options:
- Production: Deploy to a cloud service with public URL
- Development: Use ngrok or cloudflared tunnel

## Phase 2: Apply Code Changes

### Verify files exist

The Teams channel should already be in place:
- `src/channels/teams.ts` - TeamsChannel implementation
- `import './teams.js'` in `src/channels/index.ts`

### Install dependencies

```bash
npm install
npm run build
```

Build must be clean before proceeding.

## Phase 3: Setup

### Create Azure Bot (if needed)

If the user doesn't have an Azure Bot, share [TEAMS_SETUP.md](TEAMS_SETUP.md) which has step-by-step instructions with:

1. Create Azure Bot resource in Azure Portal
2. Enable Microsoft Teams channel
3. Generate App ID and App Password (client secret)
4. Configure messaging endpoint

Quick summary of what's needed:
1. Go to [Azure Portal](https://portal.azure.com) → **Create a resource** → Search "Azure Bot"
2. Create bot with "Multi Tenant" or "Single Tenant" type
3. Go to **Configuration** → Copy the **Microsoft App ID**
4. Go to **Certificates and secrets** → Create new client secret → Copy the **Value** (this is TEAMS_APP_PASSWORD)
5. Go to **Channels** → Click **Microsoft Teams** → Agree to terms → Apply
6. Set messaging endpoint to: `https://your-public-url/api/messages`

Wait for the user to provide the App ID and Password.

### Configure environment

Add to `.env`:

```bash
TEAMS_APP_ID=your-app-id-here
TEAMS_APP_PASSWORD=your-client-secret-value-here
TEAMS_PORT=3978
```

**Important**: TEAMS_APP_PASSWORD is the **secret value**, not the secret ID. Copy it immediately when created - you can't see it again.

Channels auto-enable when their credentials are present — no extra configuration needed.

Sync to container environment:

```bash
mkdir -p data/env && cp .env data/env/env
```

The container reads environment from `data/env/env`, not `.env` directly.

### Expose webhook endpoint

Teams requires a public HTTPS URL. For development:

**Using ngrok:**
```bash
ngrok http 3978
```

**Using cloudflared:**
```bash
cloudflared tunnel --url http://localhost:3978
```

Copy the public URL and set it as the messaging endpoint in Azure Bot settings.

### Build and restart

```bash
npm run build
systemctl --user restart nanoclaw  # Linux
# or
launchctl kickstart -k gui/$(id -u)/com.nanoclaw  # macOS
```

## Phase 4: Registration

### Get Conversation ID

Tell the user:

> 1. Add the bot to a Teams channel or chat
> 2. Send any message to the channel/chat with the bot
> 3. Check the logs to find the JID:
>
> ```bash
> tail -f logs/nanoclaw.log | grep "Teams"
> ```
>
> The JID format for NanoClaw is:
> - Team channel: `teams:{teamId}:{channelId}`
> - Group chat: `teams:{conversationId}`
> - Direct message: `teams:{userId}`
>
> The bot logs the JID when it receives a message.

Wait for the user to provide the JID.

### Register the channel

The JID, name, and folder name are needed. Use `npx tsx setup/index.ts --step register` with the appropriate flags.

For a main channel (responds to all messages):

```bash
npx tsx setup/index.ts --step register -- --jid "teams:<teamId>:<channelId>" --name "<channel-name>" --folder "teams_main" --trigger "@${ASSISTANT_NAME}" --channel teams --no-trigger-required --is-main
```

For additional channels (trigger-only):

```bash
npx tsx setup/index.ts --step register -- --jid "teams:<teamId>:<channelId>" --name "<channel-name>" --folder "teams_<channel-name>" --trigger "@${ASSISTANT_NAME}" --channel teams
```

## Phase 5: Verify

### Test the connection

Tell the user:

> Send a message in your registered Teams channel:
> - For main channel: Any message works
> - For non-main: `@<bot-name> hello` (mention the bot)
>
> The bot should respond within a few seconds.

### Check logs if needed

```bash
tail -f logs/nanoclaw.log
```

### Check webhook health

```bash
curl http://localhost:3978/health
```

Should return: `{"status":"ok","connected":true}`

## Troubleshooting

### Bot not responding

1. Check `TEAMS_APP_ID` and `TEAMS_APP_PASSWORD` are set in `.env` AND synced to `data/env/env`
2. Check channel is registered: `sqlite3 store/messages.db "SELECT * FROM registered_groups WHERE jid LIKE 'teams:%'"`
3. For non-main channels: message must include @mention of the bot
4. Service is running and webhook is accessible
5. Public URL is correctly set in Azure Bot messaging endpoint

### "Unauthorized" errors

1. Verify TEAMS_APP_ID matches the Microsoft App ID in Azure Portal
2. Verify TEAMS_APP_PASSWORD is the client secret **value** (not the ID)
3. If you regenerated the secret, update .env and restart

### Bot not receiving messages

1. Verify the bot is added to the Teams channel/chat
2. Verify Microsoft Teams channel is enabled in Azure Bot settings
3. Verify messaging endpoint is correctly set to your public URL + `/api/messages`
4. Check the public URL is accessible (test from browser)
5. Verify the tunnel (ngrok/cloudflared) is running

### Webhook not reachable

1. Check if port 3978 is open and NanoClaw is listening
2. Verify tunnel is running and forwarding to the correct port
3. Test health endpoint: `curl http://localhost:3978/health`

### Getting conversation ID

The easiest way to get the JID:
1. Add the bot to a channel
2. Send a message mentioning the bot
3. Check logs: `tail -f logs/nanoclaw.log | grep "jid"`
4. The JID will appear in the log output

## After Setup

The Teams channel supports:
- **Team channels** — Bot must be added to the channel
- **Group chats** — Bot can be added to group chats
- **Direct messages** — Users can DM the bot directly
- **Multi-channel** — Can run alongside WhatsApp, Slack, or other channels

## Known Limitations

- **Requires public URL** — Unlike Slack's Socket Mode, Teams requires an HTTP webhook accessible from the internet. Development requires a tunnel (ngrok/cloudflared).
- **No typing indicator** — Teams Bot API has no typing indicator endpoint. The `setTyping()` method is a no-op.
- **Proactive messaging requires prior interaction** — The bot can only send proactive messages to conversations where it has previously received a message (conversation references are stored on first message).
- **Message splitting at 16KB** — Long messages are split at the Teams limit (16KB). Splitting is naive (mid-message) and could be improved.
- **No file/image handling** — The bot only processes text content. File attachments and images are not forwarded to the agent.
- **Mention format translation** — Teams `<at>` mentions are translated to `@name` format. Complex mention scenarios may not be handled perfectly.
- **Channel metadata sync limited** — Channel names are only discovered when messages arrive. There's no proactive channel list API call.
