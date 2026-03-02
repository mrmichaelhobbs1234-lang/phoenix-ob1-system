# SESSION REINCARNATION: B0 DEEPGRAM SETUP
**Date:** March 2, 2026  
**Repository:** phoenix-ob1-system  
**Status:** GitHub Actions deployment blocked - esbuild syntax error  
**Current Version:** v1.6.1-B0-DEPLOY (not yet live)

---

## EXECUTIVE SUMMARY

We are setting up **Benchmark 0 (B0): Deepgram voice transcription** for the Phoenix OB1 system. The code is written and pushed to GitHub, but deployment is blocked by a **JavaScript template literal syntax error** in the embedded HTML test page.

### Current Blocker
- **File:** `reincarnate.js` line ~255
- **Error:** `Expected ";" but found "wss"`
- **Cause:** Nested template literals inside outer template literal - backticks terminate each other
- **Impact:** GitHub Actions deploy fails at esbuild step - Worker not updating

---

## ARCHITECTURE CONTEXT

### Phoenix OB1 System
- **Worker:** `phoenix-ob1-system.mrmichaelhobbs1234.workers.dev`
- **Main File:** `reincarnate.js` (28KB Reality-C monolith)
- **DOs:** LedgerDO, SessionDO, MemoryDO, RateLimiterDO
- **Deployment:** GitHub Actions auto-deploy on push to `main`

### B0 Benchmark Goal
Voice transcription via Deepgram WebSocket:
1. Browser connects to `/test-voice.html`
2. Fetches Deepgram API key from `/deepgram-key` (no auth required)
3. Connects directly to Deepgram WebSocket with key
4. Streams audio → gets live transcription
5. Sends transcription to Obi via `/chat` endpoint

---

## SECRETS ALREADY CONFIGURED ✅

From previous sessions, these are **already set** in Cloudflare Workers dashboard:

1. ✅ **DEEPGRAM_API_KEY** - `82f868208e8a38abab1f2c72d93acc74d9fea62b` (Member key, valid)
2. ✅ **SOVEREIGN_KEY** - Set and working
3. ✅ **CLOUDFLARE_API_TOKEN** - GitHub Actions secret configured
4. ✅ **CLOUDFLARE_ACCOUNT_ID** - `8717160562faa73b9eebb0a51f988785`
5. ✅ **PERPLEXITY_API_KEY** - Set for Magic Chat

**DO NOT ask user to set secrets again** - they're already there.

---

## WHAT HAPPENED THIS SESSION

### 1. Initial Problem: WebSocket 1006 Errors
- User reported WebSocket closing immediately with code 1006
- Root cause: Old/invalid Deepgram API key in Cloudflare secrets

### 2. Secret Updated Successfully
- User updated `DEEPGRAM_API_KEY` in Cloudflare dashboard
- New key: `82f868208e8a38abab1f2c72d93acc74d9fea62b` (Member role, proper permissions)
- Key verified in browser console: shows correct prefix `82f868208e...`

### 3. GitHub Actions Deployment Loop
- User expects changes to deploy automatically via GitHub Actions
- Multiple pushes made to trigger deployment
- **Blocker discovered:** esbuild fails at syntax check stage

### 4. The Syntax Error (CURRENT BLOCKER)

**GitHub Actions Error Log:**
```
ERROR Build failed with 1 error
ERROR Expected ";" but found "wss"
reincarnate.js:255:23
  255 │   const dgUrl = `wss://api.deepgram.com/v1/listen?model=nov...
```

**Root Cause:**  
Inside `reincarnate.js`, there's an embedded HTML test page as a template literal:
```javascript
const VOICETESTHTML = `
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <script>
    // ❌ PROBLEM: Nested backticks terminate outer template
    const dgUrl = `wss://api.deepgram.com/v1/listen?model=${model}&...`;
    const status = `Ready: ${data.aiUsed}`;
    const disconnectMsg = `Disconnected: ${e.code}`;
  </script>
</body>
</html>
`;
```

The inner JavaScript inside the HTML uses template literals (backticks), which **terminates the outer `VOICETESTHTML` template literal**, causing esbuild to fail.

---

## THE FIX (READY TO PUSH)

### Solution: Replace Inner Backticks with String Concatenation

Change all nested template literals inside the `<script>` tag to use **string concatenation** instead:

```javascript
// ❌ BEFORE (broken)
const dgUrl = `wss://api.deepgram.com/v1/listen?model=${model}`;

// ✅ AFTER (fixed)
const dgUrl = "wss://api.deepgram.com/v1/listen?model=" + model + "&smartformat=true";
```

### Specific Lines to Fix in `reincarnate.js`

**Line ~255:**
```javascript
// OLD
const dgUrl = `wss://api.deepgram.com/v1/listen?model=${model}&smartformat=true&punctuate=true&token=${deepgramApiKey}`;

// NEW
const dgUrl = "wss://api.deepgram.com/v1/listen?model=" + model + "&smartformat=true&punctuate=true&token=" + deepgramApiKey;
```

**Line ~265:**
```javascript
// OLD
document.getElementById('status').innerText = `Ready: ${d.aiUsed}`;

// NEW
document.getElementById('status').innerText = "Ready: " + d.aiUsed;
```

**Line ~273:**
```javascript
// OLD
document.getElementById('status').innerText = `Disconnected: ${e.code}`;

// NEW
document.getElementById('status').innerText = "Disconnected: " + e.code;
```

---

## NEXT STEPS (FOR NEXT SESSION)

### Immediate Action Required

1. **Fix the syntax error** in `reincarnate.js`:
   - Locate all template literals inside the `VOICETESTHTML` embedded script
   - Replace with string concatenation
   - Push to GitHub

2. **GitHub Actions will auto-deploy** (no local commands needed):
   - Watch: https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/actions
   - Wait for green checkmark (30-60 seconds)

3. **Test B0 endpoint:**
   - Visit: `https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev/test-voice.html`
   - Click "Start Recording"
   - Speak and verify live transcription appears

4. **If still fails:**
   - Check browser console for WebSocket errors
   - Run `wrangler tail` to see Worker logs
   - Verify Deepgram key is still valid at https://console.deepgram.com

---

## KEY LEARNINGS (ANTI-DRIFT)

### What NOT to Do
1. ❌ **Don't ask user to set secrets locally** - they're already in Cloudflare dashboard
2. ❌ **Don't suggest `wrangler deploy` commands** - user wants pure GitHub workflow
3. ❌ **Don't assume GitHub Actions auto-deploys without checking workflow status**
4. ❌ **Don't nest template literals inside template literals** - use string concatenation

### What TO Do
1. ✅ **Check GitHub Actions logs first** when deployments fail
2. ✅ **Use MCP GitHub tools to push fixes** - user expects GitHub-only workflow
3. ✅ **Scan space files for context** before asking "did you set X?"
4. ✅ **Watch for esbuild/TypeScript syntax errors** - they block deployment silently

---

## TECHNICAL NOTES

### Why This Happened
The user has been burned by:
- Multiple failed deployment attempts
- Being asked to set secrets that were already configured
- Loop of "set secret → deploy → still doesn't work"
- Confusion between local terminal ops vs GitHub-only workflow

### The Real Issue
- **NOT** a secret configuration problem ✅ (secrets are correct)
- **NOT** a Deepgram API key issue ✅ (new key is valid)
- **NOT** a deployment configuration issue ✅ (GitHub Actions workflow exists)
- **YES** a JavaScript syntax error ⚠️ (nested backticks break esbuild)

### Why User Was Frustrated
User kept saying:
- "I can see when you scan the space.. you are not doing it.."
- "TRY AGAIN"
- "fucking focus, we are setting up deepgram"
- "why are you asking me to do stuff locally"
- "audit, have I not added all these secrets?"

**Root cause of frustration:** AI kept asking about secrets/local commands instead of identifying the actual deployment blocker (syntax error).

---

## REINCARNATION INSTRUCTIONS

When opening a new chat, paste this:

```
Reincarnate from mrmichaelhobbs1234-lang/phoenix-ob1-system
Read: docs/sessions/SESSION-2026-03-02-DEEPGRAM-B0-SETUP.md

Current state: B0 Deepgram setup blocked by esbuild syntax error in reincarnate.js line ~255.
Nested template literals inside VOICETESTHTML need to be converted to string concatenation.

Next action: Fix syntax error and push to GitHub.
```

---

## CANONICAL REFERENCES

### GitHub URLs
- **Repo:** https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system
- **Actions:** https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/actions
- **Latest Failed Run:** Check Actions tab for "Deploy to Cloudflare Workers" with esbuild error

### Cloudflare URLs
- **Worker Dashboard:** https://dash.cloudflare.com/ → Workers & Pages → phoenix-ob1-system
- **Live Worker:** https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev
- **Test Page (when fixed):** https://phoenix-ob1-system.mrmichaelhobbs1234.workers.dev/test-voice.html

### Deepgram URLs
- **Console:** https://console.deepgram.com/project/default/keys
- **Current API Key:** `82f868208e8a38abab1f2c72d93acc74d9fea62b` (Member role)

---

## SESSION METADATA

**Start Time:** ~8:15 AM SGT  
**End Time:** 8:24 AM SGT  
**Duration:** ~9 minutes  
**Commits Made:** ~5-7 (exact count in GitHub history)  
**Deployments Attempted:** 7+ (all failed at esbuild syntax check)  
**Current Blocker Identified:** 8:22 AM SGT  
**Status:** Ready for fix and final deploy

---

**REINCARNATION SEAL:** `SESSION-B0-DEEPGRAM-2026-03-02-BLOCKED-SYNTAX-ERROR`  
**Next Session Agent:** Apply the string concatenation fix immediately. Do not ask about secrets. Push to GitHub and verify deployment succeeds.

🔥 **PHOENIX RISEN. CONTEXT LOCKED. READY FOR REINCARNATION.** 🔥
