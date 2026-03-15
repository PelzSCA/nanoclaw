# Microsoft Teams Bot Setup Guide

Complete walkthrough for creating and configuring an Azure Bot for Microsoft Teams integration with NanoClaw.

## Prerequisites

- Microsoft Azure account (free tier works)
- Public HTTPS URL for the webhook (see Tunnel Setup below)
- NanoClaw installed and configured

## Part 1: Create Azure Bot Resource

### Step 1: Navigate to Azure Portal

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Microsoft account
3. Click **Create a resource** (or press `G` then `N`)
4. Search for "Azure Bot"
5. Select **Azure Bot** from the results
6. Click **Create**

### Step 2: Configure Bot Basics

Fill in the creation form:

| Field | Value |
|-------|-------|
| **Bot handle** | A unique ID (e.g., `nanoclaw-yourname`) |
| **Subscription** | Your Azure subscription |
| **Resource group** | Create new or use existing |
| **Location** | `global` (recommended) |
| **Pricing tier** | `Standard` or `Free` (if available) |
| **Type of App** | `Multi Tenant` (recommended for flexibility) |

Click **Review + create**, then **Create**.

### Step 3: Wait for Deployment

Deployment typically takes 1-2 minutes. Once complete, click **Go to resource**.

## Part 2: Get Credentials

### Step 4: Copy App ID

1. In the bot resource, go to **Configuration** in the left menu
2. Find **Microsoft App ID**
3. Copy this value — this is your `TEAMS_APP_ID`

### Step 5: Create App Password

1. In the bot resource, go to **Certificates and secrets** in the left menu
2. Click **+ Client secret**
3. Enter a description (e.g., "NanoClaw Production")
4. Set expiration (recommended: `180 days` or custom)
5. Click **Add**
6. **Immediately copy the Value** — this is your `TEAMS_APP_PASSWORD`

> **Important**: You can only see the secret value once. If you lose it, you'll need to create a new secret.

## Part 3: Enable Teams Channel

### Step 6: Add Teams Channel

1. In the bot resource, go to **Channels** in the left menu
2. Click **Microsoft Teams** icon
3. Accept the Terms of Service
4. Click **Apply**

The Teams channel should now show as "Connected" with a green checkmark.

## Part 4: Configure Webhook Endpoint

### Step 7: Set Up Public URL

Teams requires a publicly accessible HTTPS URL for the webhook. Choose one:

#### Option A: Production Deployment

Deploy NanoClaw to a cloud service with a public URL:
- Azure App Service
- AWS EC2 with Elastic IP
- Google Cloud Run
- Any VPS with public IP

#### Option B: Development with ngrok

1. Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)
2. Run ngrok to expose port 3978:
   ```bash
   ngrok http 3978
   ```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

#### Option C: Development with cloudflared

1. Install cloudflared: [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
2. Run cloudflared tunnel:
   ```bash
   cloudflared tunnel --url http://localhost:3978
   ```
3. Copy the HTTPS URL (e.g., `https://xyz.trycloudflare.com`)

### Step 8: Update Messaging Endpoint

1. In the bot resource, go to **Configuration**
2. Find **Messaging endpoint**
3. Enter your public URL + `/api/messages`
   - Example: `https://abc123.ngrok.io/api/messages`
4. Click **Apply** at the top

## Part 5: Configure NanoClaw

### Step 9: Update Environment

Add to your `.env` file:

```bash
TEAMS_APP_ID=your-app-id-from-step-4
TEAMS_APP_PASSWORD=your-secret-value-from-step-5
TEAMS_PORT=3978
```

Sync to container environment:

```bash
mkdir -p data/env && cp .env data/env/env
```

### Step 10: Install Dependencies and Build

```bash
cd /path/to/nanoclaw
npm install
npm run build
```

### Step 11: Start NanoClaw

```bash
# Linux
systemctl --user start nanoclaw
# or foreground for testing
npm run dev

# macOS
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
# or foreground
npm run dev
```

### Step 12: Verify Webhook

Check the health endpoint:

```bash
curl http://localhost:3978/health
```

Expected response:
```json
{"status":"ok","connected":true}
```

## Part 6: Add Bot to Teams

### Step 13: Get Bot Link

1. In the bot resource, go to **Channels**
2. Click on **Microsoft Teams**
3. Copy the bot link or click to open in Teams

### Step 14: Test in Teams

1. Open the link in Microsoft Teams
2. Send a message to the bot
3. Check NanoClaw logs for the JID:
   ```bash
   tail -f logs/nanoclaw.log | grep -i teams
   ```
4. Register the channel using the JID

## Troubleshooting

### "Bot is not part of the conversation roster"

The bot needs to be added to the channel or chat:
1. Go to the Teams channel
2. Click the channel name → **Add apps**
3. Search for your bot by name or App ID
4. Add it to the channel

### "Unauthorized" in logs

1. Verify `TEAMS_APP_ID` matches the Microsoft App ID in Azure Portal
2. Verify `TEAMS_APP_PASSWORD` is the secret **value** (not the secret ID)
3. Restart NanoClaw after updating `.env`

### Bot doesn't respond

1. Check logs: `tail -f logs/nanoclaw.log`
2. Verify public URL is accessible (test from browser)
3. Verify messaging endpoint in Azure matches your public URL
4. Ensure tunnel is running (ngrok/cloudflared)

### Health endpoint returns 404

NanoClaw may not be running or the Teams channel isn't loaded:
1. Check if Teams credentials are in `.env`
2. Check logs for startup errors
3. Try `npm run dev` for verbose output

### "The bot encountered an error"

Check logs for the specific error:
```bash
tail -f logs/nanoclaw.log
```

Common causes:
- Missing environment variables
- Invalid App ID or Password
- Network connectivity issues

## Security Considerations

### Production Deployment

1. **Use HTTPS only** - Never expose the webhook over HTTP
2. **Validate requests** - Bot Framework SDK validates App ID/Password automatically
3. **Rate limiting** - Consider adding rate limiting at the reverse proxy level
4. **Secret rotation** - Rotate App Passwords periodically (every 90-180 days)

### Development

1. **ngrok paid plans** - Provide stable URLs (no URL changes on restart)
2. **Don't commit secrets** - Never commit `.env` to version control
3. **Use Azure Key Vault** - For production secret management

## Reference

| Setting | Where to Find |
|---------|---------------|
| `TEAMS_APP_ID` | Azure Portal → Bot → Configuration → Microsoft App ID |
| `TEAMS_APP_PASSWORD` | Azure Portal → Bot → Certificates and secrets → Client secret value |
| Messaging Endpoint | Azure Portal → Bot → Configuration → Messaging endpoint |
| Bot Link | Azure Portal → Bot → Channels → Microsoft Teams |

## Migration Notes

The Bot Framework SDK is being deprecated in favor of the Microsoft 365 Agents SDK. The current implementation uses `botbuilder` which remains functional. Future migration will be required when Microsoft ends support (announced for late 2025).
