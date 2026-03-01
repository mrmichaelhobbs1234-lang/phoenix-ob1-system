# OB(1) SYSTEM DEPLOYMENT GUIDE

**Version**: v109.2  
**Updated**: March 1, 2026

---

## Prerequisites

1. **Cloudflare Account** with Workers + Durable Objects enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Secrets** prepared (see below)
4. **GitHub** repository access

---

## Secrets Setup

Set all secrets via Wrangler:

```bash
wrangler secret put SOVEREIGNKEY
# Enter: [your master auth key, 32+ chars recommended]

wrangler secret put DEEPGRAM_API_KEY  
# Enter: [your Deepgram API key from https://console.deepgram.com]

wrangler secret put PERPLEXITY_API_KEY
# Enter: [your Perplexity API key from https://www.perplexity.ai/settings/api]
# NOTE: Optional - worker runs in fallback mode if missing

wrangler secret put MAKE_SECRET
# Enter: [your Make.com webhook secret, 16+ chars]
```

---

## Deployment Methods

### Method 1: GitHub Actions (Automatic)

**Status**: Configured in `.github/workflows/deploy.yml`

1. Push to `main` branch
2. GitHub Actions auto-deploys
3. Verify at: `https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/health`

### Method 2: Manual Deploy

```bash
git clone https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system.git
cd phoenix-ob1-system
npm install
wrangler deploy
```

### Method 3: Deploy Script

```bash
./deploy_reality_c.sh
```

---

## Verification

### 1. Health Check

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/health
```

**Expected response:**
```json
{
  "ok": true,
  "reality": "C",
  "version": "v109.2-b1-fallback",
  "gospel": "444",
  "bindings": {
    "LEDGER": true,
    "SESSIONS": true,
    "RATELIMITER": true,
    "MEMORY": true
  },
  "deepgram": {
    "configured": true
  },
  "perplexity": {
    "configured": true,
    "mode": "full-ai"
  }
}
```

### 2. Ledger Verification

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/ledger/verify
```

**Expected:**
```json
{
  "ok": true,
  "valid": true,
  "height": [number],
  "headHash": "[sha256 hash]"
}
```

### 3. Voice Transcription Test

Open in browser:
```
https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/test-transcribe
```

1. Click "Start Recording"
2. Speak clearly
3. Verify transcription appears

---

## Post-Deployment

### Monitor Logs

```bash
wrangler tail
```

### Check Durable Objects

```bash
wrangler durable-objects list LEDGER
wrangler durable-objects list SESSIONS
```

### Update Secrets

```bash
wrangler secret put [SECRET_NAME]
```

---

## Rollback

If deployment fails:

```bash
wrangler rollback
```

Or specify version:

```bash
wrangler rollback --message="[commit sha]"
```

---

## Troubleshooting

### "Service not configured"
- Check secrets are set: `wrangler secret list`
- Verify SOVEREIGNKEY length > 0

### "Deepgram not configured"
- Set DEEPGRAM_API_KEY: `wrangler secret put DEEPGRAM_API_KEY`

### "Perplexity pattern-fallback mode"
- Expected if PERPLEXITY_API_KEY not set
- Set key: `wrangler secret put PERPLEXITY_API_KEY`

### WebSocket closes immediately
- Check Deepgram API key is valid
- Verify model parameter: `model=nova-2`

---

**DEPLOYMENT COMPLETE**
