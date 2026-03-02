# B3 Deployment Guide

## Automatic Deployment (via GitHub Actions)

### Prerequisites

1. **Cloudflare Account** with Workers and Vectorize enabled
2. **GitHub Secrets** configured in repository settings

### Setup GitHub Secrets

Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Add these secrets:

#### 1. `CLOUDFLARE_API_TOKEN`
- Go to Cloudflare Dashboard → My Profile → API Tokens
- Create token with permissions:
  - Account: Cloudflare Workers Scripts - Edit
  - Account: Vectorize - Edit
- Copy token and paste as secret value

#### 2. `GH_INDEXER_TOKEN`
- Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token with `repo` scope (full control of private repositories)
- Copy token and paste as secret value

### Deploy

Once secrets are configured:

```bash
# Push to trigger deployment
git push origin feature/b3-knowledge-base
```

Or manually trigger:
- Go to Actions tab → "Deploy B3 Knowledge Base" → Run workflow

### Verify Deployment

Check your Cloudflare Workers dashboard for:
- Worker: `phoenix-b3-indexer`
- Vectorize Index: `phoenix-knowledge-base`

Get your worker URL:
```
https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev
```

### Trigger Indexing

```bash
curl https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/index
```

This will:
- Fetch all 825 files from `phoenix-chat-logs/CHAT-EXPORTS`
- Chunk each file (~1000 chars per chunk)
- Generate embeddings using Cloudflare AI
- Store in Vectorize
- Takes ~5-10 minutes

### Test Search

```bash
curl "https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/search?q=Magic+Chat+DNA"
```

## Manual Deployment (Local)

If you prefer local deployment:

```bash
cd benchmarks/b3-knowledge-base
./scripts/deploy.sh
```

Requires:
- Node.js 18+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare auth: `wrangler login`

## Troubleshooting

### "Index already exists" error
Safe to ignore - means Vectorize index was created previously.

### "Unauthorized" error
Check `CLOUDFLARE_API_TOKEN` secret has correct permissions.

### "Rate limit" during indexing
Normal - worker processes files in batches of 10 to avoid GitHub API limits.

### Search returns no results
Wait for indexing to complete (~10 minutes for 825 files).
Check status: `curl https://phoenix-b3-indexer.YOUR-SUBDOMAIN.workers.dev/status`
