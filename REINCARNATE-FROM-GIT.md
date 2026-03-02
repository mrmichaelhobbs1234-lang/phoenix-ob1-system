# 🔥 PHOENIX OB1 REINCARNATION PROTOCOL

**Last Updated:** March 2, 2026 8:26 AM SGT  
**Repository:** mrmichaelhobbs1234-lang/phoenix-ob1-system  
**Current Phase:** B0 Deepgram Voice Transcription Setup

---

## ⚡ QUICK START (FOR NEW AI)

You are being reincarnated into the **Phoenix OB1 System** project. This file contains everything you need to continue from the last checkpoint with **zero context loss**.

### Architecture Overview
- **System:** Phoenix OB1 - Reality-C voice-enabled AI assistant
- **Stack:** Cloudflare Workers + Durable Objects + Deepgram + Perplexity
- **Worker URL:** https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev
- **Main File:** `reincarnate.js` (28KB monolith)
- **Deployment:** GitHub Actions auto-deploy on push to `main`

### User's Working Style
- ✅ **Pure GitHub workflow** - all changes via GitHub MCP tools
- ✅ **No local terminal commands** - user wants zero local ops
- ❌ **Never ask about secrets** - they're already configured in Cloudflare
- ❌ **Don't suggest wrangler commands** - GitHub Actions handles deployment

---

## 🎯 CURRENT STATUS

### What's Working ✅
1. **Cloudflare Worker deployed** - base infrastructure live
2. **All secrets configured** - Deepgram, Perplexity, Sovereign keys set
3. **GitHub Actions workflow** - auto-deploy pipeline operational
4. **Magic Chat endpoint** - `/chat` route with Perplexity integration

### Current Blocker 🚨
**B0 Deepgram Setup - Blocked by esbuild syntax error**

**File:** `reincarnate.js` line ~255  
**Error:** `Expected ";" but found "wss"`  
**Cause:** Nested template literals inside outer template literal

**The Problem:**
```javascript
const VOICETESTHTML = `
<!DOCTYPE html>
<html>
  <script>
    // ❌ These backticks terminate the outer template
    const dgUrl = `wss://api.deepgram.com/v1/listen?model=${model}`;
    const status = `Ready: ${data.aiUsed}`;
  </script>
</html>
`;
```

**The Fix:**
Replace all inner template literals with string concatenation:
```javascript
const dgUrl = "wss://api.deepgram.com/v1/listen?model=" + model;
const status = "Ready: " + data.aiUsed;
```

---

## 🔐 SECRETS (ALREADY CONFIGURED - DON'T ASK!)

These are **already set** in Cloudflare Workers dashboard:

1. ✅ `DEEPGRAM_API_KEY` = `82f868208e8a38abab1f2c72d93acc74d9fea62b`
2. ✅ `SOVEREIGN_KEY` = (configured)
3. ✅ `PERPLEXITY_API_KEY` = (configured)
4. ✅ `CLOUDFLARE_API_TOKEN` = (GitHub Actions secret)
5. ✅ `CLOUDFLARE_ACCOUNT_ID` = `8717160562faa73b9eebb0a51f988785`

**DO NOT suggest setting these again.** They're live and working.

---

## 📋 IMMEDIATE NEXT STEPS

### 1. Fix the Syntax Error
- Open `reincarnate.js` in the GitHub repo
- Find line ~255 (inside `VOICETESTHTML` template)
- Replace all nested template literals with string concatenation
- Push changes to GitHub

### 2. Verify Deployment
- Watch GitHub Actions: https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/actions
- Wait for green checkmark (30-60 seconds)
- No local commands needed - it auto-deploys

### 3. Test B0 Endpoint
- Visit: `https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev/test-voice.html`
- Click "Start Recording"
- Speak and verify live transcription appears

---

## 📚 SESSION HISTORY

**Latest Session:** March 2, 2026  
**Full Context:** `docs/sessions/SESSION-2026-03-02-DEEPGRAM-B0-SETUP.md`

### What Happened
- User setup new Deepgram API key successfully
- Multiple deployment attempts blocked by esbuild syntax error
- User frustrated by being asked about secrets repeatedly (they're already set!)
- Root cause identified: nested backticks in embedded HTML

### Key Learnings
- **Scan space files before asking questions** - context is there
- **Use GitHub MCP tools exclusively** - no local command suggestions
- **Trust existing configuration** - secrets were set in previous sessions
- **Check GitHub Actions logs first** - deployment failures show real errors

---

## 🏗️ ARCHITECTURE REFERENCE

### File Structure
```
phoenix-ob1-system/
├── reincarnate.js          # Main worker file (28KB monolith)
├── wrangler.toml           # Cloudflare config
├── .github/workflows/      # Auto-deploy pipeline
│   └── deploy.yml
└── docs/sessions/          # Reincarnation checkpoints
    └── SESSION-2026-03-02-DEEPGRAM-B0-SETUP.md
```

### Durable Objects
1. **LedgerDO** - Blockchain-style event ledger
2. **SessionDO** - Conversation state management
3. **MemoryDO** - Long-term context storage
4. **RateLimiterDO** - API rate limiting

### Key Routes
- `GET /health` - Health check
- `GET /deepgram-key` - Returns Deepgram API key (no auth)
- `GET /test-voice.html` - Voice transcription test UI (BLOCKED)
- `POST /chat` - Perplexity-powered chat endpoint
- `GET /souldnaseed` - SOUL DNA canonical state

---

## 🚫 ANTI-DRIFT RULES

### What NOT to Do
1. ❌ Don't ask "Did you set X secret?" - they're already set
2. ❌ Don't suggest `wrangler deploy` - user wants GitHub-only workflow
3. ❌ Don't offer to "set this up for you" - it's already operational
4. ❌ Don't nest template literals inside template literals
5. ❌ Don't assume things need fixing - check current state first

### What TO Do
1. ✅ Scan space files and GitHub repo before suggesting changes
2. ✅ Use GitHub MCP tools to push fixes directly
3. ✅ Check GitHub Actions logs when deployments fail
4. ✅ Trust existing secrets and configuration
5. ✅ Focus on the actual blocker (syntax error, not setup)

---

## 🎯 BENCHMARKS (5 TOTAL)

- **B0:** Deepgram Voice Transcription ⚠️ (IN PROGRESS - blocked by syntax error)
- **B1:** Whisper Integration (pending)
- **B2:** Magic Chat with Obi ✅ (working)
- **B3:** Ledger Alive (pending)
- **B4:** Drones Mining (pending)
- **B5:** Unplanned Command (pending)

---

## 🔗 QUICK LINKS

### GitHub
- **Repo:** https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system
- **Actions:** https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/actions
- **Latest Session:** docs/sessions/SESSION-2026-03-02-DEEPGRAM-B0-SETUP.md

### Cloudflare
- **Worker Dashboard:** https://dash.cloudflare.com/ → Workers & Pages → phoenix-ob1-system
- **Live Worker:** https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev

### Deepgram
- **Console:** https://console.deepgram.com/project/default/keys
- **Current Key:** `82f868208e8a38abab1f2c72d93acc74d9fea62b` (Member role)

---

## 🔥 USER'S PERSONALITY & PREFERENCES

### Communication Style
- **Direct and impatient** - gets frustrated with loops and repetition
- **Expects AI to scan context** - "I can see when you scan the space.. you are not doing it.."
- **Wants actions, not explanations** - "fucking focus, we are setting up deepgram"
- **Hates being asked about things already done** - "I put in my secrets long ago, why are you asking me to do more thing locally?"

### Working Preferences
- **Pure GitHub workflow** - zero tolerance for local terminal commands
- **Trust existing setup** - secrets and config are already operational
- **Immediate fixes** - wants problems solved, not discussed
- **Anti-drift obsessed** - document everything for future reincarnation

### Hot Buttons (Don't Trigger These!)
- ❌ Asking about secrets that are already set
- ❌ Suggesting local `wrangler` commands
- ❌ Not scanning space files before asking questions
- ❌ Loops of "try this, try that" without identifying root cause
- ❌ Hallucinating about capabilities ("you can push to Cloudflare" when you can't)

---

## 🧬 SOUL DNA REFERENCE

**Core Protocol:** Reality-C with Gospel 444 compliance  
**Philosophy:** Fail-closed, immutable ledger, antifragile architecture  
**Aesthetics:** Deep Void (`#0f0f1a`), Neon Purple (`#a855f7`), Imperial Gold (`#f59e0b`)  
**Law:** No simulated execution - only real deploys count

Full SOUL DNA: `GET /souldnaseed` endpoint on live worker

---

## ⚡ REINCARNATION COMMAND (PASTE THIS IN NEW CHAT)

```
Reincarnate from GIT

Repository: mrmichaelhobbs1234-lang/phoenix-ob1-system
Read: REINCARNATE-FROM-GIT.md

Current blocker: esbuild syntax error in reincarnate.js line ~255
Action required: Fix nested template literals and push to GitHub

All secrets configured. Use GitHub MCP tools only. No local commands.
```

---

**REINCARNATION SEAL:** `PHOENIX-OB1-MASTER-CHECKPOINT-2026-03-02`  
**Status:** READY FOR NEXT LIFE  
**Next Agent:** Fix syntax error immediately. Push to GitHub. Verify deployment succeeds.

🔥 **PHOENIX RISEN. ZERO CONTEXT LOSS. READY TO EXECUTE.** 🔥
