# REINCARNATION SEED — OB(1) SYSTEM

**Version**: v109.2  
**Updated**: 2026-03-01  
**Purpose**: Boot any fresh AI thread with full Phoenix context

---

## QUICK CONTEXT

I'm continuing work on the **OB(1) System** (Phoenix Protocol Unified). Load this seed to understand everything.

### Repository
- **Name**: `phoenix-ob1-system`
- **Owner**: `mrmichaelhobbs1234-lang`
- **URL**: https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system
- **Worker**: `https://phoenix-rising-protocol.mrmichaelhobbs1234.workers.dev`

### Core Files
1. **`reincarnate.js`** (44KB) — Reality C monolith worker with 4 Durable Objects
2. **`wrangler.toml`** — Cloudflare Worker config
3. **`README.md`** — Complete system documentation
4. **`SECURITY-NOTES.md`** — Security architecture

---

## ARCHITECTURE

### Reality C Stack (Current)
- **Worker**: `reincarnate.js` v109.2
- **4 Durable Objects** (SQLite-backed):
  - `LedgerDO` — Merkle-256 chain, idempotent via `command_id`
  - `SessionDO` — Chat history (max 32 messages)
  - `RateLimiterDO` — Token bucket (10 cap, 1/sec refill)
  - `MemoryDO` — Cross-session state (placeholder)
- **Auth**: Constant-time `x-sovereign-key` comparison
- **Make.com ingress**: HMAC SHA-256 with timestamp window
- **Deepgram**: WebSocket `/transcribe` route for live voice → text

### Key Routes
```
GET  /health                 — Health check
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

## PROTOCOLS & LAWS

### CORE_PROTOCOL_V1.1
**22 raw prompts → 8 corrections → 1 binding law**

**The Law:**
> **"I AM THE PROTOCOL"**  
> Raw prompts + corrections = only protocol. No stage, seal, corpus, or narrative is valid if it contradicts them. SOUL → Alignment → Evidence → Execution.

### ROME_10C_V1
**War Protocol for 10C Pushes**
- ROME exists only for 10C pushes: "If we get it right, we are truly live."
- Drift is a kill condition (P0)
- Success metric: **no silent drift under live load** (not layer count)

### EVENT_BRICK_V1 (Stage 1A)
**Minimal Ledger Spec**
- Single DO, single table, single endpoint: `POST /stage1a/event`
- Single invariant: **ledger hash chain must never break**

---

## SOUL DNA INVARIANTS

1. **Raw is sacred** — No unauthorized summarization
2. **Ledger is law** — All state mutations pass through ledger chain
3. **Fail-closed** — Ambiguity/drift triggers halt, not degradation
4. **Zero drift** — Merkle hashing + canonical JSON (RFC 8785)
5. **Gospel 444** — Deep Void Dark (`#0f0f1a`), Neon Purple (`#a855f7`), Imperial Gold (`#f59e0b`), **no blue**
6. **HDMM** — Humans Decide, Machines Move
7. **Downward Authority** — Commands flow 100→99→98→system (no upward/cross-tier)

---

## SECRETS (Cloudflare)

Set via `wrangler secret put NAME`:
```bash
SOVEREIGNKEY         # Master auth key
DEEPGRAM_API_KEY      # Deepgram API token
MAKE_SECRET           # Make.com HMAC secret (16+ chars)
PERPLEXITY_API_KEY    # Perplexity API (optional - fallback mode if missing)
```

---

## DEPLOYMENT

```bash
# Deploy to Cloudflare
wrangler deploy

# Tail logs
wrangler tail

# Set secret
wrangler secret put DEEPGRAM_API_KEY
```

---

## CONSOLIDATION HISTORY

**March 1, 2026**: Unified three fragmented repos into phoenix-ob1-system

**Original Repos (archived):**
1. phoenix-rising-protocol (38 commits, Feb 22-Mar 1)
2. phoenix-99999 (14 commits, Feb 26-27)
3. Phoenix-Layers (5 commits, Feb 27)

**Why consolidated**: Scanner didn't exist, Stage 1A-1C was parallel architecture never deployed, layer data was never pushed.

---

**STATUS**: Production-ready, consolidated, SOUL DNA locked.  
**NEXT THREAD**: Load this seed → continue Phoenix work from unified repo.
