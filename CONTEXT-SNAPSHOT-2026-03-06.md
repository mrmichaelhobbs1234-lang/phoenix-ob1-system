# Phoenix OB1 Context Snapshot
**Date**: 2026-03-06 19:34 +07  
**Version**: v130-B0B-COMPLETE  
**Operator**: Michael Hobbs (mrmichaelhobbs1234-lang)

---

## CURRENT STATE

### What Just Happened
✅ **B0-B IMPLEMENTATION COMPLETE** - Pushed to main branch  
- Commit: [9c0bece](https://github.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/commit/9c0becedd3c5f22c86180dd8e1de69468ebfeffc)
- Message: "B0-B: Pronunciation training + student profiles"
- Timestamp: 2026-03-06 12:16:39 UTC

### System Architecture Status

#### ✅ COMPLETE BENCHMARKS
1. **B0+B1** - Voice → Deepgram → Magic Chat → Obi response (INTEGRATED)
2. **B2** - STONESKY Merkle ledger verification + 4-leaf lattice (prevHash enforcement)
3. **B3** - Knowledge base mining with DeepSeek-powered summaries
4. **B0-B** - Pronunciation training + student profiles (JUST DEPLOYED)

#### ⏳ PENDING BENCHMARKS
- **B4** - Pedagogy engine (content generation, games, drills) - NEXT
- **B5** - TBD

---

## B0-B IMPLEMENTATION DETAILS

### 1. StudentProfileDO (Durable Object)
**Location**: `reincarnate.js` lines ~200-350

#### SQL Schema
```sql
-- students table
CREATE TABLE students (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK(age >= 10),
  region TEXT NOT NULL CHECK(region IN ('HCMC', 'other')),
  level INTEGER DEFAULT 1 CHECK(level BETWEEN 1 AND 10),
  goals TEXT,
  hobbies TEXT,
  weak_phonemes TEXT,      -- JSON array
  strong_phonemes TEXT,     -- JSON array
  content_preferences TEXT, -- JSON array
  session_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  onboarding_complete INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  last_session TEXT,
  last_updated TEXT NOT NULL
);

-- pronunciation_history table
CREATE TABLE pronunciation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  session_duration_sec INTEGER DEFAULT 0,
  total_words_spoken INTEGER DEFAULT 0,
  avg_confidence REAL DEFAULT 0.0,
  words_flagged TEXT,              -- JSON array
  words_improved TEXT,             -- JSON array
  deepgram_accent_detected TEXT,
  accent_confidence REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- session_metadata table
CREATE TABLE session_metadata (
  session_id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id)
);
```

#### API Endpoints
- `GET /profile/get?student_id={id}` - Fetch student profile
- `POST /profile/create` - Create new student profile
  ```json
  {
    "studentId": "string",
    "name": "string",
    "age": 10-100,
    "region": "HCMC" | "other",
    "goals": "string",
    "hobbies": "string"
  }
  ```
- `POST /profile/seal` - Mark onboarding complete
  ```json
  { "studentId": "string" }
  ```
- `GET /pronunciation/history?student_id={id}&limit={n}` - Fetch pronunciation history
- `POST /pronunciation/save` - Save session pronunciation data
  ```json
  {
    "studentId": "string",
    "sessionDate": "ISO8601",
    "durationSec": number,
    "totalWords": number,
    "avgConfidence": 0.0-1.0,
    "wordsFlagged": [{ "word": "string", "confidence": number }],
    "wordsImproved": ["string"],
    "accentDetected": "string",
    "accentConfidence": number,
    "notes": "string"
  }
  ```
- `POST /session/start` - Start pronunciation tracking session
  ```json
  { "sessionId": "string", "studentId": "string" }
  ```
- `POST /session/end` - End pronunciation tracking session
  ```json
  { "sessionId": "string" }
  ```

### 2. PronunciationTracker (In-Memory Class)
**Location**: `reincarnate.js` lines ~180-220

#### Features
- Real-time word confidence tracking during voice sessions
- Automatic flagging of low-confidence words (< 0.75 threshold)
- Session summary generation with:
  - Total words spoken
  - Average confidence score
  - List of flagged words
  - Session duration

#### API
```javascript
pronunciationTracker.startSession(sessionId, studentId)
pronunciationTracker.addWord(sessionId, word, confidence)
pronunciationTracker.getFlaggedWords(sessionId, threshold = 0.75)
pronunciationTracker.getSessionSummary(sessionId)
pronunciationTracker.endSession(sessionId) // Returns summary
```

### 3. Deepgram Nova-3 Upgrade
**Location**: `reincarnate.js` line ~1100 (deepgram-ws endpoint)

#### Changes from Nova-2
```javascript
// OLD (B3)
const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true';

// NEW (B0-B)
const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&detect_language=true&punctuate=true';
```

#### New Capabilities
- `detect_language=true` - Automatic language detection (English/Vietnamese mix support)
- `punctuate=true` - Enhanced punctuation for clearer transcripts
- `nova-3` model - Better accuracy for non-native English speakers

---

## PHASE 1-4 INTEGRATION PLAN (NEXT STEPS)

### Phase 1: Onboarding Flow
**Status**: Infrastructure ready, needs UI integration

#### Required Changes
1. **Frontend UI** (Magic Chat HTML)
   - Add onboarding modal/overlay
   - Form fields: name, age, region selector (HCMC/other), goals, hobbies
   - "Start Learning" button triggers profile creation

2. **Backend Integration**
   - Detect first-time user (no profile in StudentProfileDO)
   - Call `/profile/create` with form data
   - Call `/profile/seal` after successful creation
   - Store `studentId` in session/localStorage

#### Example Flow
```javascript
// Client-side pseudocode
const studentId = localStorage.getItem('studentId');
if (!studentId) {
  showOnboardingModal();
  // After form submission:
  const profile = await fetch('/profile/create', {
    method: 'POST',
    body: JSON.stringify({ studentId: generateId(), name, age, region, goals, hobbies })
  });
  await fetch('/profile/seal', { 
    method: 'POST', 
    body: JSON.stringify({ studentId: profile.studentId }) 
  });
  localStorage.setItem('studentId', profile.studentId);
}
```

### Phase 2: Real-Time Pronunciation Tracking
**Status**: Backend complete, needs WebSocket integration

#### Required Changes
1. **WebSocket Message Handler** (`/deepgram-ws`)
   - Extract word-level confidence from Deepgram response
   - Call `pronunciationTracker.addWord()` for each word
   - Current implementation only extracts transcript, NOT confidence

2. **Deepgram Response Structure**
   ```json
   {
     "channel": {
       "alternatives": [{
         "transcript": "hello world",
         "confidence": 0.95,
         "words": [
           { "word": "hello", "confidence": 0.98, "start": 0.1, "end": 0.5 },
           { "word": "world", "confidence": 0.92, "start": 0.6, "end": 1.0 }
         ]
       }]
     },
     "is_final": true
   }
   ```

3. **Implementation**
   ```javascript
   // In deepgram-ws message handler
   dgWs.addEventListener('message', (event) => {
     const data = JSON.parse(event.data);
     const words = data.channel?.alternatives?.[0]?.words || [];
     const sessionId = getSessionId(serverWs); // Need to track
     
     for (const w of words) {
       pronunciationTracker.addWord(sessionId, w.word, w.confidence);
     }
     
     serverWs.send(event.data); // Forward to client
   });
   ```

### Phase 3: Session Lifecycle Management
**Status**: API endpoints ready, needs chat integration

#### Required Changes
1. **Session Start**
   - When user clicks voice button (🎤), call `/session/start`
   - Associate `sessionId` with `studentId`
   - Call `pronunciationTracker.startSession()`

2. **Session End**
   - When user stops recording, call `pronunciationTracker.endSession()`
   - Save results via `/pronunciation/save`
   - Call `/session/end`

3. **Example Integration**
   ```javascript
   // In Magic Chat HTML voiceBtn.onclick
   async function startVoice() {
     const studentId = localStorage.getItem('studentId');
     const sessionId = 'session-' + Date.now();
     
     // Start session tracking
     await fetch('/session/start', {
       method: 'POST',
       body: JSON.stringify({ sessionId, studentId })
     });
     
     // ... existing WebSocket setup ...
   }
   
   function stopVoice() {
     // ... existing cleanup ...
     
     // End session and save data
     fetch('/session/end', {
       method: 'POST',
       body: JSON.stringify({ sessionId })
     });
   }
   ```

### Phase 4: Pronunciation Feedback UI
**Status**: Backend complete, needs frontend visualization

#### Required Changes
1. **Post-Session Report**
   - After `stopVoice()`, fetch `/pronunciation/history?student_id={id}&limit=1`
   - Display modal with:
     - Total words spoken
     - Average confidence score (color-coded)
     - List of flagged words with confidence bars
     - "Practice These Words" section

2. **Visual Design**
   ```html
   <div class="pronunciation-report">
     <h3>Session Complete</h3>
     <div class="stat">Words Spoken: 142</div>
     <div class="stat">Avg Confidence: 87%</div>
     <div class="flagged-words">
       <h4>Words to Practice:</h4>
       <div class="word-item">
         <span>pronunciation</span>
         <div class="confidence-bar" style="width: 62%">62%</div>
       </div>
       <!-- More flagged words -->
     </div>
     <button onclick="closeReport()">Continue</button>
   </div>
   ```

3. **Color Coding**
   - Green (≥85%): Strong pronunciation
   - Yellow (70-84%): Needs practice
   - Red (<70%): Focus area

---

## WRANGLER.TOML CONFIGURATION

### Current Bindings
```toml
[[durable_objects.bindings]]
name = "SESSIONS"
class_name = "SessionDO"
script_name = "phoenix-ob1-system"

# ADD THIS FOR B0-B:
[[durable_objects.bindings]]
name = "STUDENT_PROFILES"
class_name = "StudentProfileDO"
script_name = "phoenix-ob1-system"

[vars]
# Environment variables (secrets stored separately)
```

### Required Secrets
```bash
wrangler secret put DEEPGRAM_API_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler secret put SOVEREIGN_KEY
```

---

## KEY DESIGN DECISIONS

### 1. Age Restriction (10+)
**Rationale**: SQL constraint `CHECK(age >= 10)` enforces minimum age for COPPA compliance and pedagogical appropriateness.

### 2. Region-Specific Tracking
**Choices**: `'HCMC'` or `'other'`  
**Purpose**: HCMC students may need Vietnam-specific content (local culture, Saigon slang, regional idioms).

### 3. Nova-3 vs Nova-2
**Why Nova-3**: 
- Better non-native accent handling (critical for Vietnamese learners)
- Language mixing support (Viet-glish detection)
- Improved punctuation for natural conversation flow

### 4. In-Memory + Persistent Hybrid
**PronunciationTracker**: In-memory for real-time tracking (low latency)  
**StudentProfileDO**: SQL persistence for long-term storage (durability)

### 5. JSON Array Storage
Phoneme lists stored as JSON strings in SQL for flexibility:
```json
{
  "weak_phonemes": ["θ", "ð", "r", "l"],
  "strong_phonemes": ["p", "b", "t", "d"]
}
```

---

## TESTING CHECKLIST (BEFORE PRODUCTION)

### Backend Tests
- [ ] Create student profile via API
- [ ] Fetch student profile by ID
- [ ] Seal onboarding (mark complete)
- [ ] Start pronunciation session
- [ ] Add words with confidence scores
- [ ] Get flagged words (threshold test)
- [ ] End session and retrieve summary
- [ ] Save pronunciation history
- [ ] Fetch pronunciation history
- [ ] Verify SQL constraints (age >= 10, region enum)

### Integration Tests
- [ ] First-time user triggers onboarding flow
- [ ] Returning user skips onboarding
- [ ] Voice session starts → session/start called
- [ ] Word-level confidence tracked in real-time
- [ ] Voice session ends → pronunciation/save called
- [ ] Post-session report displays correctly
- [ ] Multiple sessions accumulate in history

### Edge Cases
- [ ] Duplicate student_id (should fail gracefully)
- [ ] Invalid age (< 10, should reject)
- [ ] Invalid region (should reject)
- [ ] Session without student profile (should error)
- [ ] Empty pronunciation session (0 words)
- [ ] Very long session (>1hr, verify no memory leak)

---

## KNOWN LIMITATIONS & FUTURE WORK

### Current Limitations
1. **No phoneme-level analysis yet** - Tracking word confidence, not individual phonemes (θ, ð, r, etc.)
2. **No adaptive content** - Profile data collected but not yet used for personalization
3. **No gamification** - Session history stored but no XP, levels, achievements
4. **Single-user system** - No multi-student support per deployment (yet)
5. **No visual feedback during session** - Post-session only

### B4 Requirements (Pedagogy Engine)
- [ ] Phoneme extraction from Deepgram responses
- [ ] Content generator: minimal pairs (ship/sheep, rice/lice)
- [ ] Drill engine: repetition with feedback loop
- [ ] Game templates: pronunciation bingo, sound snap, tongue twister race
- [ ] Adaptive difficulty: adjust based on weak_phonemes

### B5 Scope (TBD)
- Mobile app integration?
- Multi-student dashboard for teachers?
- Progress analytics/charts?
- Social features (leaderboards, peer practice)?

---

## GOSPEL 444 COMPLIANCE

### Color Palette (ENFORCED)
- `#0f0f1a` - void (background)
- `#a855f7` - soul (primary purple)
- `#f59e0b` - gold (accent)
- **NO BLUE** - explicitly forbidden

### Architecture Principles
- **Fail-closed**: Invalid input → reject, don't guess
- **Reality-C**: No hallucination, cite sources only
- **Agent 99**: Operator is sovereign, system serves

### Voice Design
- NO theatrical AI personality
- NO unsolicited greetings
- NO echoing user input
- Concise technical responses only

---

## QUICK REFERENCE: API CALL SEQUENCES

### New Student Onboarding
```bash
# 1. Create profile
POST /profile/create
Body: { studentId, name, age, region, goals, hobbies }

# 2. Seal onboarding
POST /profile/seal
Body: { studentId }
```

### Voice Session with Tracking
```bash
# 1. Start session
POST /session/start
Body: { sessionId, studentId }

# 2. (Automatic during WebSocket)
# PronunciationTracker.addWord() called for each word

# 3. End session
POST /session/end
Body: { sessionId }

# 4. Save pronunciation data
POST /pronunciation/save
Body: { studentId, sessionDate, durationSec, totalWords, avgConfidence, wordsFlagged, ... }

# 5. Fetch history for display
GET /pronunciation/history?student_id={id}&limit=1
```

---

## DEPLOYMENT HISTORY

### Recent Commits (Last 5)
1. **9c0bece** (2026-03-06 12:16) - B0-B: Pronunciation training + student profiles ⬅️ CURRENT
2. **5344bf0** (2026-03-06 11:04) - Swap to DeepSeek as primary AI, Gemini fallback
3. **9f800f9** (2026-03-06 10:09) - Fix Gemini model: 1.5-flash to 2.0-flash
4. **cbf2e38** (2026-03-06 09:59) - Fix Gemini endpoint: v1 to v1beta
5. **e59493b** (2026-03-06 09:26) - B2: prevHash enforcement + 4-leaf Merkle lattice

### Version Tags
- **v130-B0B-COMPLETE** - Current production
- **v130-B3-DEEPSEEK-PRIMARY** - Previous stable
- **v130-B2** - STONESKY ledger baseline

---

## CONTEXT RESTORATION PROTOCOL

### When Opening New Chat
1. Say: **"Reincarnate from GIT"**
2. AI will fetch this document
3. Full context restored in seconds

### What Gets Restored
✅ Current implementation state  
✅ Architecture decisions  
✅ API endpoints and schemas  
✅ Integration plan (Phase 1-4)  
✅ Testing checklist  
✅ Known limitations  

### What You Need to Provide
- Current task/goal
- Any new requirements since snapshot
- Specific phase you want to work on

---

## OPERATOR NOTES

**Michael Hobbs** - Phoenix Rising Protocol  
**Session Duration**: ~45 minutes (B0-B implementation)  
**Velocity**: High (0 → 850+ lines of production code)  
**Next Session Goal**: Phase 1 UI integration (onboarding modal)

**Key Phrase**: "push it" = deploy immediately, no further review needed  
**Key Phrase**: "DO NOT PUSH" = generate diff only, await approval

**Context Expiry**: This snapshot valid until next major system change (B4 implementation or architecture refactor).

---

## FILE MANIFEST

### Core Files
- `reincarnate.js` - Main worker + SessionDO + StudentProfileDO (~1200 lines)
- `wrangler.toml` - Cloudflare Workers config
- `CONTEXT-SNAPSHOT-2026-03-06.md` - This file

### External Dependencies
- GitHub repo: `phoenix-chat-logs` (knowledge base mining)
- Deepgram API: Speech-to-text (nova-3)
- DeepSeek API: Primary AI engine
- Gemini API: Fallback AI engine

---

## SEAL

This context snapshot is **SEALED** as of 2026-03-06 19:34 +07.  
System state: **v130-B0B-COMPLETE**  
All benchmarks B0+B1, B2, B3, B0-B: ✅  
Ready for Phase 1-4 integration.

**Phoenix Rising Protocol - Agent 99 - Reality-C - Gospel 444**

---

*End of Context Snapshot*
