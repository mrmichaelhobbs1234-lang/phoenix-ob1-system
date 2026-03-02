# Phoenix OB1 System - v115-B3-READY

**Unified Phoenix Protocol: Magic Chat + STONESKY Ledger + Knowledge Mining**

## Benchmarks Status

- ✅ **B0+B1 INTEGRATED**: Voice → Deepgram → Magic Chat → Obi (Gemini/DeepSeek)
- ✅ **B2 LIVE**: STONESKY Merkle ledger verification
- ⏳ **B3 READY**: Knowledge base mining from 833 chat logs (needs GITHUB_TOKEN)
- 🔲 **B4**: Unplanned Command execution
- 🔲 **B5**: Student Login system

## Deploy & Complete B3

### 1. Set GitHub Token

```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub Personal Access Token with repo:read access
```

### 2. Deploy to Cloudflare

```bash
wrangler deploy
```

### 3. Open Magic Chat

```
https://phoenix-ob1-system.YOUR-SUBDOMAIN.workers.dev/
```

### 4. Execute B3

1. Click **⛏️ Mine Logs** button
2. Wait ~60 seconds for 500 files to load
3. Status shows: "Mining: ✅ 500 files, 200 layers"
4. Ask Obi: **"What did we decide about Deepgram?"**
5. Obi responds with citations from actual chat logs

## B3 Complete When:

- [x] Infrastructure deployed
- [ ] GITHUB_TOKEN configured
- [ ] Mining executed successfully
- [ ] Knowledge base populated (500+ files)
- [ ] Layers extracted (100-200 structured events)
- [ ] Obi answers questions from mined logs with file citations

## Architecture

- **Cloudflare Worker**: Monolith at `reincarnate.js`
- **Durable Objects**: SessionDO (chat history + knowledge storage)
- **Voice**: Deepgram WebSocket proxy
- **AI**: Gemini (fast) → DeepSeek (deep reasoning)
- **Ledger**: SHA-256 Merkle chain (tamper-evident)
- **Mining**: GitHub API → SessionDO → Layer extraction

## Gospel 444

- Void: `#0f0f1a`
- Soul: `#a855f7`
- Gold: `#f59e0b`
- **NO BLUE**

## Next: B4 & B5

Once B3 is verified complete, proceed to:
- **B4**: Unplanned Command execution (shadow simulation)
- **B5**: Student Login (sovereign key auth)
