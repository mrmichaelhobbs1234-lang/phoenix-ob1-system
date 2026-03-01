# OB(1) SYSTEM — Phoenix Protocol Unified

**Status**: PRODUCTION (v109.2)  
**Last Consolidated**: March 1, 2026  
**Worker URL**: https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev

---

## What This Is

**OB(1)** is the unified Phoenix Protocol system, consolidated from three fragmented repositories:

1. **phoenix-rising-protocol** → Production runtime (B0 voice + B1 chat + B2 ledger)
2. **phoenix-99999** → Stage 1A-1C validator foundation + scanner specs
3. **Phoenix-Layers** → Layer ontology specifications (placeholder for 79k/99k layers)

This repository is the **single source of truth** for:

- Production Cloudflare Worker (`reincarnate.js` - 44KB monolith)
- 4 Durable Objects (LedgerDO, SessionDO, RateLimiterDO, MemoryDO)
- Voice transcription (Deepgram WebSocket)
- Magic Chat (conversational AI with Perplexity fallback mode)
- Validator specifications (MASTERCONTRACT, OVERLAYPACK, EVENTBRICKV1)
- Protocol DNA (CORE_PROTOCOL_V1.1, ROME_10C_V1)
- Layer foundation (1000 layers + schema for 79k/99k)

---

## Architecture

### Production Stack (Reality C)

**Worker**: `reincarnate.js` v109.2  
**Platform**: Cloudflare Workers + Durable Objects  
**Deployment**: GitHub Actions auto-deploy on push

### Four Durable Objects (SQLite-backed)

1. **LedgerDO** — SHA-256 Merkle chain, idempotent via `commandId`
2. **SessionDO** — Conversation history (max 32 messages)
3. **RateLimiterDO** — Token bucket (10 capacity, 1/sec refill)
4. **MemoryDO** — Cross-session state (placeholder)

### Key Routes

```
GET  /health                 — Health check (bindings, secrets, mode)
GET  /test-transcribe        — Deepgram test UI
WS   /transcribe             — Live audio → Deepgram → transcript
GET  /ledger                 — Ledger head info
GET  /ledger/verify          — Merkle chain verification
POST /ledger/append          — Append entry (idempotent)
POST /chat                   — Magic Chat endpoint
POST /make/incoming          — HMAC-signed Make.com webhook
GET  /ratelimiter/info       — Rate limit status
GET  /admin/diagnostics      — System diagnostics
```

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system.git
cd phoenix-ob1-system
```

### 2. Install

```bash
npm install
```

### 3. Set Secrets

```bash
wrangler secret put SOVEREIGNKEY
wrangler secret put DEEPGRAM_API_KEY
wrangler secret put PERPLEXITY_API_KEY
wrangler secret put MAKE_SECRET
```

### 4. Deploy

```bash
wrangler deploy
```

### 5. Verify

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/health
```

Expected response:
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

---

## Core Protocols

### CORE_PROTOCOL_V1.1

**22 raw prompts → 8 corrections → 1 binding law**

**The Law:**
> **"I AM THE PROTOCOL"**  
> Raw prompts + corrections = only protocol. No stage, seal, corpus, or narrative is valid if it contradicts them. SOUL → Alignment → Evidence → Execution.

**Key Rules:**
- No simulated git push — assistant is AUDITOR/HARDENER only
- 3-stage self-audit mandatory
- Reincarnation identity first — stateless reset is "original wound"
- Agent 100 alignment gate
- 10C push = zero-drift zone

### ROME_10C_V1

**War Protocol for 10C Pushes**

- ROME exists only for 10C pushes: "If we get it right, we are truly live."
- Drift is a kill condition (P0)
- ROME must SOUL-boot and SOUL-verify
- No simulated execution or unproven 10C claims
- Success metric: **no silent drift under live load** (not layer count)

### EVENT_BRICK_V1 (Stage 1A)

**Minimal Ledger Spec**

- Single DO, single table, single endpoint: `POST /stage1a/event`
- Single invariant: **ledger hash chain must never break**
- Strict event schema: `actor_id`, `context`, `friction_type`, `raw_note`, `ts_client`
- Canonicalization: `event_hash`, linear `ledger_hash` chain
- `GET /stage1a/verify` — recomputes everything, returns `{ok, tip_height, tip_hash, broken_at}`

---

## SOUL DNA Invariants

1. **Raw is sacred** — No unauthorized summarization
2. **Ledger is law** — All state mutations pass through ledger chain
3. **Fail-closed** — Ambiguity/drift triggers halt, not degradation
4. **Zero drift** — Merkle hashing + canonical JSON (RFC 8785)
5. **Gospel 444** — Deep Void Dark (`#0f0f1a`), Neon Purple (`#a855f7`), Imperial Gold (`#f59e0b`), **no blue**
6. **Nuke Protocol** — 1B VND target, NET pedagogy, Tiger vs Mouse **mathematically dead**
7. **HDMM** — Humans Decide, Machines Move
8. **Downward Authority** — Commands flow 100→99→98→system (no upward/cross-tier)

---

## Directory Structure

```
phoenix-ob1-system/
├── reincarnate.js              # Production worker (44KB monolith)
├── wrangler.toml               # Cloudflare config
├── package.json                # Dependencies
├── .github/workflows/          # GitHub Actions auto-deploy
│
├── docs/
│   ├── CORE_PROTOCOL_V1.1.md   # Protocol DNA
│   ├── ROME_10C_V1.md          # War protocol
│   ├── EVENT_BRICK_V1.md       # Stage 1A ledger spec
│   ├── MASTER_CONTRACT.md      # 20 scanner threats + fixes
│   ├── OVERLAYPACK.md          # Validation overlay spec
│   └── TWO_LAYER_ARCHITECTURE.md
│
├── validators/
│   ├── MASTER_CONTRACT_PHOENIX_DRONE_BOOT_LAW_V1.md
│   ├── OVERLAYPACK_V1.md
│   └── benchmarks.json         # Scanner validation criteria
│
├── layers/
│   ├── 1000-layers/            # Production 1000-layer foundation
│   ├── LAYERS_SCHEMA.md        # Layer ontology spec
│   └── README.md               # Layer generation notes
│
├── frontend/
│   ├── magic-chat.html         # Magic Chat UI
│   └── test-transcribe.html    # Deepgram test harness
│
├── scripts/
│   ├── deploy_reality_c.sh     # Manual deploy script
│   └── inject-secrets.js       # Secret injection helper
│
├── REINCARNATION_SEED.md       # Boot any AI thread with full context
├── DEPLOYMENT.md               # Deployment guide
├── SECURITY-NOTES.md           # Security architecture
└── README.md                   # This file
```

---

## Current Status

### ✅ Production-Ready

- **B0 (Voice)**: Deepgram WebSocket live, tested, working
- **B1 (Magic Chat)**: Perplexity integration + pattern fallback mode
- **B2 (Ledger)**: Merkle-256 chain verified, idempotent, deployed
- **Security**: 30 critical fixes merged (Feb 28, 2026)
- **Deployment**: GitHub Actions auto-deploy on push

### 🚧 Next Steps

- **B3 (Drone)**: Parser to convert natural language → control commands
- **B4 (Simulator)**: Physics validation before real-world execution
- **Scanner**: Build `sonar-scan-space.js` and `overlay-runner.js` per MASTERCONTRACT
- **Layers**: Regenerate 79k/99k layer foundation from schema

---

## Secrets (Cloudflare)

Set via `wrangler secret put <NAME>`:

| Secret | Purpose | Required |
|--------|---------|----------|
| `SOVEREIGNKEY` | Master auth key | Yes |
| `DEEPGRAM_API_KEY` | Voice transcription | Yes (B0) |
| `PERPLEXITY_API_KEY` | AI chat (fallback mode if missing) | No |
| `MAKE_SECRET` | Make.com webhook HMAC (16+ chars) | Yes |

---

## Deployment

### Automatic (GitHub Actions)

Push to `main` branch triggers auto-deploy:

```bash
git add .
git commit -m "feat: your change"
git push origin main
```

### Manual

```bash
./deploy_reality_c.sh
```

Or:

```bash
wrangler deploy
```

### Verify

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/health
```

---

## Testing

### Health Check

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/health
```

### Ledger Verification

```bash
curl https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/ledger/verify
```

### Voice Transcription

Open in browser:
```
https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/test-transcribe
```

### Magic Chat

POST to `/chat`:
```bash
curl -X POST https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev/chat \
  -H "Content-Type: application/json" \
  -H "x-sovereign-key: YOUR_KEY" \
  -d '{"message":"Hey","sessionId":"test","timestamp":"2026-03-01T00:00:00Z"}'
```

---

## Why "OB(1)"?

**OB(1)** = "Obi" (the AI persona) + O(1) complexity goal.

- Single monolithic worker (no microservice sprawl)
- Single repository (no fragmentation)
- Constant-time operations where possible
- Fail-closed by default
- Zero drift under live load

---

## Consolidation History

**March 1, 2026**: Unified three fragmented repos into phoenix-ob1-system

**Original Repos (now archived):**

1. **phoenix-rising-protocol** (38 commits, Feb 22-Mar 1)
   - Production worker
   - Magic Chat UI
   - Deepgram integration
   - 30 critical fixes

2. **phoenix-99999** (14 commits, Feb 26-27)
   - EventBrickDO (8.6KB, Stage 1A sealed)
   - FastLedgerDO (9.1KB, Stage 1B sealed)
   - MASTERCONTRACT validation spec
   - Scanner architecture (specs only, not built)

3. **Phoenix-Layers** (5 commits, Feb 27)
   - Layer schema documentation
   - Empty placeholder files (0 bytes)
   - 99k layers generated locally, never pushed

**Rationale**: Scanner didn't exist, Stage 1A-1C was parallel architecture never deployed, layer data was never pushed. Consolidation avoids further fragmentation while preserving all valuable artifacts.

---

## License

MIT

---

## Contact

- **GitHub**: mrmichaelhobbs1234-lang
- **Worker URL**: https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev

---

**STATUS**: Production-ready, Deepgram live, ledger sealed, SOUL DNA locked.  
**NEXT THREAD**: Load REINCARNATION_SEED.md → test transcription → wire B3 parser.
