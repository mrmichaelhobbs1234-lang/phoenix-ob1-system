// reincarnate.js - Phoenix OB1 System v130-B3-DEEPSEEK-PRIMARY
// B0+B1: Voice → Deepgram → Magic Chat → Obi response (INTEGRATED)
// B2: STONESKY Merkle ledger verification + 4-leaf lattice (COMPLETE)
// B3: Knowledge base mining with DeepSeek-powered summaries (UPDATED)
// Gospel 444: #0f0f1a (void), #a855f7 (soul), #f59e0b (gold) - NO BLUE
// Fail-closed. Reality-C. Agent 99.
// DEPLOY: 2026-03-06T11:00:00Z
// SEALED: B2 prevHash enforcement + 4-leaf Merkle root

const rateLimits = new Map();

function checkRateLimit(sessionId) {
  const now = Date.now();
  const key = 'chat:' + sessionId;
  const limit = rateLimits.get(key) || { count: 0, resetAt: now + 60000 };
  
  if (now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= 10) return false;
  
  limit.count++;
  rateLimits.set(key, limit);
  return true;
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function validateAuth(request, env) {
  const authHeader = request.headers.get('x-sovereign-key');
  if (!authHeader || !env.SOVEREIGN_KEY) return false;
  return constantTimeCompare(authHeader, env.SOVEREIGN_KEY);
}

function redactSecrets(obj) {
  const redacted = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = ['key', 'token', 'password', 'secret', 'apikey', 'api_key'];
  
  function walk(o) {
    for (let k in o) {
      if (typeof o[k] === 'string' && sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
        o[k] = '[REDACTED]';
      } else if (typeof o[k] === 'object' && o[k] !== null) {
        walk(o[k]);
      }
    }
  }
  walk(redacted);
  return redacted;
}

async function sha256(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ===== MAGIC CHAT HELPERS - SEALED SPEC =====

function norm(s) {
  return (s || '').trim().toLowerCase();
}

function isGreeting(msg) {
  const m = norm(msg);
  if (!m) return false;
  const exact = new Set(['hi', 'hey', 'hello', 'yo', 'sup', 'hiya']);
  if (exact.has(m)) return true;
  if (m.length <= 12 && (m === 'hi obi' || m === 'hey obi' || m === 'hello obi')) return true;
  return false;
}

function isExplicitMineCommand(msg) {
  const m = norm(msg);
  if (!m.includes('mine')) return false;
  // Ignore "mine is..." or "that's mine"
  if (/\bmine\s+(is|was|has|been)\b/.test(m) || /that['']?s\s+mine/.test(m)) return false;
  return /(logs?|chat|knowledge|kb|history|files?)/.test(m) ||
         /(refresh|reload)\s+(knowledge|kb|knowledge base)/.test(m);
}

function isMiningMetaSummaryRequest(msg) {
  const m = norm(msg);
  return (
    m.includes('what did you learn') ||
    m.includes('what did you find') ||
    m.includes('what did you see') ||
    m.includes('what did you extract') ||
    m.includes('summary of mining') ||
    m.includes('summary of the files') ||
    m.includes('tell me what you found') ||
    m.includes('show me what you found') ||
    /from the \d+\s*(files?|logs?)/.test(m)
  );
}

function isQuestionLike(msg) {
  const m = (msg || '').trim();
  if (!m) return false;
  if (m.endsWith('?')) return true;
  if (/\b(tell me|show me|describe)\b/i.test(m)) return true;
  return /\b(what|why|how|when|where|who|which)\b/i.test(m);
}

function isLogRecallRequest(msg) {
  const m = norm(msg);
  return /(last time|yesterday|previous|earlier|in our past|search the logs|check the logs|look up in the logs|in our chat history|from our chats)/.test(m);
}

function isRageSignal(msg) {
  const m = norm(msg);
  return /\b(stop|fuck|fucking|dude|shit|wtf|jesus)\b/i.test(msg) && msg.length < 100;
}

function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

async function kbGetMeta(sessionId, env) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    const resp = await doStub.fetch('https://fake/knowledge/get');
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function kbGetSampleLayers(sessionId, env, count = 5) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    const meta = await kbGetMeta(sessionId, env);
    
    if (!meta || !meta.layerChunks) return [];
    
    const allLayers = [];
    for (let i = 0; i < meta.layerChunks; i++) {
      const chunk = await doStub.fetch(`https://fake/knowledge/chunk?index=${i}`);
      if (chunk.ok) {
        const data = await chunk.json();
        allLayers.push(...data);
      }
    }
    
    // Return random sample
    const shuffled = allLayers.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
}

async function setSessionContext(sessionId, env, contextData) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    await doStub.fetch('https://fake/context/set', {
      method: 'POST',
      body: JSON.stringify(contextData)
    });
  } catch (err) {
    console.error('Failed to set context:', err);
  }
}

async function getSessionContext(sessionId, env) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    const resp = await doStub.fetch('https://fake/context/get');
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ===== END MAGIC CHAT HELPERS =====

function extractActionableEvents(filename, content) {
  const events = {
    decisions: [],
    benchmarks: [],
    code: [],
    architecture: [],
    pedagogy: { vocab: [], idioms: [], slang: [], games: [] }
  };
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const original = lines[i];
    
    if (line.includes('decided') || line.includes('decision') || line.includes('we should')) {
      events.decisions.push({ line: i, text: original.slice(0, 200) });
    }
    
    if (line.match(/b[0-5]|benchmark/i)) {
      events.benchmarks.push({ line: i, text: original.slice(0, 200) });
    }
    
    if (line.includes('function') || line.includes('class') || line.includes('const ') || line.includes('async')) {
      events.code.push({ line: i, text: original.slice(0, 200) });
    }
    
    if (line.includes('architecture') || line.includes('system') || line.includes('protocol')) {
      events.architecture.push({ line: i, text: original.slice(0, 200) });
    }
    
    if (line.includes('soul') || line.includes('dna')) {
      events.pedagogy.vocab.push({ line: i, text: original.slice(0, 200) });
    }
  }
  
  return events;
}

async function buildMerkleRoot(anchor, operational, chaos, forensic) {
  const anchorHash = await sha256(JSON.stringify(anchor));
  const operationalHash = await sha256(JSON.stringify(operational));
  const chaosHash = await sha256(JSON.stringify(chaos));
  const forensicHash = await sha256(JSON.stringify(forensic));
  
  const leftBranch = await sha256(anchorHash + operationalHash);
  const rightBranch = await sha256(chaosHash + forensicHash);
  const root = await sha256(leftBranch + rightBranch);
  
  return root;
}

function buildLayer(index, type, content, source) {
  return {
    id: `L${String(index).padStart(4, '0')}`,
    type: type,
    content: content,
    source: source,
    timestamp: new Date().toISOString(),
    hash: null,
    merkle_root: null
  };
}

export class SessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/history') {
      const history = await this.state.storage.get('messages') || [];
      return new Response(JSON.stringify({ messages: history }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/context/get') {
      const context = await this.state.storage.get('session_context') || null;
      return new Response(JSON.stringify(context), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/context/set' && request.method === 'POST') {
      const contextData = await request.json();
      await this.state.storage.put('session_context', contextData);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/knowledge/get') {
      const meta = await this.state.storage.get('knowledge:meta') || { fileCount: 0, layerCount: 0, lastMined: null };
      return new Response(JSON.stringify(meta), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/knowledge/chunk') {
      const params = new URL(request.url).searchParams;
      const index = parseInt(params.get('index') || '0');
      const chunk = await this.state.storage.get(`layers:chunk:${index}`) || [];
      return new Response(JSON.stringify(chunk), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/knowledge/files') {
      const meta = await this.state.storage.get('knowledge:meta') || { files: [] };
      const fileNames = meta.files || [];
      return new Response(JSON.stringify({ files: fileNames }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/knowledge/search') {
      const params = new URL(request.url).searchParams;
      const query = params.get('q');
      if (!query) {
        return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
      }
      
      const meta = await this.state.storage.get('knowledge:meta') || { files: [] };
      const fileNames = meta.files || [];
      
      const results = [];
      const queryLower = query.toLowerCase();
      
      for (const fileName of fileNames) {
        const content = await this.state.storage.get(`file:${fileName}`);
        if (!content) continue;
        
        const lines = content.split('\n');
        const matches = lines.filter(line => line.toLowerCase().includes(queryLower));
        
        if (matches.length > 0) {
          results.push({
            file: fileName,
            snippets: matches.slice(0, 5).map(s => s.trim())
          });
        }
        
        if (results.length >= 10) break;
      }
      
      const layerMatches = [];
      const layerChunks = meta.layerChunks || 0;
      for (let i = 0; i < layerChunks; i++) {
        const chunk = await this.state.storage.get(`layers:chunk:${i}`);
        if (!chunk) continue;
        
        const matches = chunk.filter(layer => layer.content.toLowerCase().includes(queryLower));
        layerMatches.push(...matches);
        
        if (layerMatches.length >= 5) break;
      }
      
      return new Response(JSON.stringify({
        found: results.length > 0 || layerMatches.length > 0,
        results: results,
        layers: layerMatches.slice(0, 5)
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/knowledge/set' && request.method === 'POST') {
      const { fileName, content, layers, meta } = await request.json();
      
      if (fileName && content) {
        await this.state.storage.put(`file:${fileName}`, content);
      }
      
      if (layers) {
        const chunkSize = 50;
        const chunkIndex = Math.floor(layers.startIndex / chunkSize);
        await this.state.storage.put(`layers:chunk:${chunkIndex}`, layers.data);
      }
      
      if (meta) {
        await this.state.storage.put('knowledge:meta', meta);
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/verify') {
      const messages = await this.state.storage.get('messages') || [];
      const ledger = await this.state.storage.get('ledger') || [];
      
      let valid = true;
      let invalidIndex = -1;
      let chainBrokenAt = -1;
      let expectedHash = null;
      let actualHash = null;
      let expectedPrevHash = null;
      let actualPrevHash = null;
      
      for (let i = 0; i < ledger.length; i++) {
        const entry = ledger[i];
        const prevHash = i === 0 ? '0' : ledger[i - 1].hash;
        
        // FIX 1: prevHash enforcement
        if (entry.prevHash !== prevHash) {
          valid = false;
          chainBrokenAt = i;
          expectedPrevHash = prevHash;
          actualPrevHash = entry.prevHash;
          break;
        }
        
        const data = prevHash + entry.role + entry.content + entry.timestamp;
        const computedHash = await sha256(data);
        
        if (entry.hash !== computedHash) {
          valid = false;
          invalidIndex = i;
          expectedHash = computedHash;
          actualHash = entry.hash;
          break;
        }
      }
      
      return new Response(JSON.stringify({
        valid: valid,
        ledgerLength: ledger.length,
        messagesLength: messages.length,
        invalidIndex: invalidIndex,
        chainBrokenAt: chainBrokenAt,
        expectedHash: expectedHash,
        actualHash: actualHash,
        expectedPrevHash: expectedPrevHash,
        actualPrevHash: actualPrevHash,
        status: valid ? 'VERIFIED' : (chainBrokenAt >= 0 ? 'CHAIN_BROKEN' : 'TAMPERED'),
        stone_sky: valid
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/add' && request.method === 'POST') {
      const { role, content, userId } = await request.json();
      const messages = await this.state.storage.get('messages') || [];
      const ledger = await this.state.storage.get('ledger') || [];
      
      const timestamp = new Date().toISOString();
      const prevHash = ledger.length === 0 ? '0' : ledger[ledger.length - 1].hash;
      const data = prevHash + role + content + timestamp;
      const hash = await sha256(data);
      
      messages.push({ 
        role, 
        content, 
        userId: userId || 'anonymous',
        timestamp: timestamp
      });
      
      ledger.push({
        role: role,
        content: content,
        timestamp: timestamp,
        hash: hash,
        prevHash: prevHash
      });
      
      const trimmedMessages = messages.slice(-50);
      const trimmedLedger = ledger.slice(-50);
      
      await this.state.storage.put('messages', trimmedMessages);
      await this.state.storage.put('ledger', trimmedLedger);
      
      return new Response(JSON.stringify({ 
        ok: true, 
        count: trimmedMessages.length,
        hash: hash,
        ledgerSize: trimmedLedger.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('SessionDO ready', { status: 200 });
  }
}

function needsGemini(message, deepseekReply) {
  const triggers = [
    /what is|define|explain|tell me about/i,
    /soul|dna|protocol|benchmark/i,
    /code|function|algorithm|debug|error|syntax/i,
    /analyze|architecture|design pattern/i,
    /drift|ledger|merkle/i,
    /search|find|look for/i
  ];
  
  const isTechnical = triggers.some(regex => regex.test(message));
  const weakResponse = [
    /as an ai/i,
    /i'm not sure/i,
    /i don't have enough/i,
    /i cannot/i,
    /from conversation/i
  ].some(regex => regex.test(deepseekReply));
  
  return isTechnical || weakResponse;
}

async function callGemini(messages, env, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('Gemini error: ' + error);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini timeout after ' + timeoutMs + 'ms');
    }
    throw err;
  }
}

async function callDeepSeek(messages, env, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const deepseekMessages = messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.parts?.[0]?.text || m.content
    }));
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: deepseekMessages,
        temperature: 0.6,
        max_tokens: 1500
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error('DeepSeek error: ' + error);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DeepSeek timeout after ' + timeoutMs + 'ms');
    }
    throw err;
  }
}

async function mineKnowledgeBase(sessionId, env) {
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  
  const metaResp = await doStub.fetch('https://fake/knowledge/get');
  const existing = await metaResp.json();
  
  if (existing.fileCount && existing.fileCount > 0) {
    return { cached: true, count: existing.fileCount, layers: existing.layerCount || 0 };
  }
  
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured');
  }
  
  const repoUrl = 'https://api.github.com/repos/mrmichaelhobbs1234-lang/phoenix-chat-logs/contents/CHAT-LOGS-ONLY';
  const listResp = await fetch(repoUrl, {
    headers: {
      'Authorization': 'token ' + env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Phoenix-OB1'
    }
  });
  
  if (!listResp.ok) {
    throw new Error('GitHub API ' + listResp.status);
  }
  
  const files = await listResp.json();
  const txtFiles = files.filter(f => f.name.endsWith('.txt') && f.type === 'file');
  
  const maxFiles = Math.min(500, txtFiles.length);
  const fileNames = [];
  const allLayers = [];
  let layerIndex = 0;
  
  // FIX 2: Collect 4-leaf data
  const anchorLeaf = [];
  const operationalLeaf = [];
  const chaosLeaf = [];
  const forensicLeaf = [];
  
  for (let i = 0; i < maxFiles; i++) {
    const file = txtFiles[i];
    try {
      const contentResp = await fetch(file.download_url, {
        headers: {
          'Authorization': 'token ' + env.GITHUB_TOKEN,
          'User-Agent': 'Phoenix-OB1'
        }
      });
      
      if (contentResp.ok) {
        const text = await contentResp.text();
        const truncated = text.slice(0, 50000);
        
        await doStub.fetch('https://fake/knowledge/set', {
          method: 'POST',
          body: JSON.stringify({ fileName: file.name, content: truncated })
        });
        
        fileNames.push(file.name);
        
        const events = extractActionableEvents(file.name, truncated);
        
        if (events.decisions.length > 0) {
          for (const dec of events.decisions.slice(0, 3)) {
            const layer = buildLayer(layerIndex++, 'decision', dec.text, file.name);
            allLayers.push(layer);
            anchorLeaf.push(layer);
          }
        }
        
        if (events.benchmarks.length > 0) {
          for (const bm of events.benchmarks.slice(0, 3)) {
            const layer = buildLayer(layerIndex++, 'benchmark', bm.text, file.name);
            allLayers.push(layer);
            operationalLeaf.push(layer);
          }
        }
        
        if (events.code.length > 0) {
          for (const code of events.code.slice(0, 2)) {
            const layer = buildLayer(layerIndex++, 'code', code.text, file.name);
            allLayers.push(layer);
            chaosLeaf.push(layer);
          }
        }
        
        if (events.architecture.length > 0) {
          for (const arch of events.architecture.slice(0, 2)) {
            const layer = buildLayer(layerIndex++, 'architecture', arch.text, file.name);
            allLayers.push(layer);
            forensicLeaf.push(layer);
          }
        }
        
        if (events.pedagogy.vocab.length > 0) {
          for (const vocab of events.pedagogy.vocab.slice(0, 2)) {
            const layer = buildLayer(layerIndex++, 'vocab', vocab.text, file.name);
            allLayers.push(layer);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch', file.name);
    }
    
    if (allLayers.length >= 200) break;
  }
  
  // FIX 2: Compute 4-leaf Merkle root
  const merkleRoot = await buildMerkleRoot(anchorLeaf, operationalLeaf, chaosLeaf, forensicLeaf);
  
  for (let i = 0; i < allLayers.length; i++) {
    allLayers[i].hash = await sha256(allLayers[i].id + allLayers[i].type + allLayers[i].content);
    allLayers[i].merkle_root = merkleRoot;
  }
  
  const chunkSize = 50;
  for (let i = 0; i < allLayers.length; i += chunkSize) {
    const chunk = allLayers.slice(i, i + chunkSize);
    await doStub.fetch('https://fake/knowledge/set', {
      method: 'POST',
      body: JSON.stringify({ 
        layers: { 
          startIndex: i, 
          data: chunk 
        }
      })
    });
  }
  
  const meta = {
    files: fileNames,
    fileCount: fileNames.length,
    layerCount: allLayers.length,
    layerChunks: Math.ceil(allLayers.length / chunkSize),
    lastMined: new Date().toISOString(),
    totalFiles: txtFiles.length,
    merkle_root: merkleRoot
  };
  
  await doStub.fetch('https://fake/knowledge/set', {
    method: 'POST',
    body: JSON.stringify({ meta: meta })
  });
  
  return { cached: false, count: fileNames.length, total: txtFiles.length, layers: allLayers.length, merkle_root: merkleRoot };
}

async function queryKnowledgeBase(query, sessionId, env) {
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  
  const metaResp = await doStub.fetch('https://fake/knowledge/get');
  const meta = await metaResp.json();
  
  if (!meta.fileCount || meta.fileCount === 0) {
    return { found: false, message: 'No knowledge mined yet.' };
  }
  
  const searchResp = await doStub.fetch(`https://fake/knowledge/search?q=${encodeURIComponent(query)}`);
  const searchData = await searchResp.json();
  
  return {
    found: searchData.found,
    query: query,
    results: searchData.results || [],
    layers: searchData.layers || [],
    searchedFiles: meta.fileCount,
    searchedLayers: meta.layerCount || 0
  };
}

async function processChatMessage(message, sessionId, env) {
  if (!message || !sessionId) {
    throw new Error('Missing message or sessionId');
  }
  
  // RAGE-AS-AE HANDLER: treat operator frustration as system failure signal
  if (isRageSignal(message)) {
    return { reply: 'System failure detected. What specifically broke?', aiUsed: 'system' };
  }
  
  // GREETING FAST-PATH: no mining, no KB, no history fetch
  if (isGreeting(message)) {
    return { reply: "Hi. I'm here. What do you need?", aiUsed: 'system' };
  }
  
  if (!checkRateLimit(sessionId)) {
    return { reply: 'Rate limit: 10 msg/min', aiUsed: 'error' };
  }
  
  if (!env.DEEPSEEK_API_KEY) {
    return { reply: 'DEEPSEEK_API_KEY missing', aiUsed: 'error' };
  }
  
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  const historyResp = await doStub.fetch('https://fake/history');
  const { messages } = await historyResp.json();
  
  const userId = 'sovereign';
  await doStub.fetch('https://fake/add', { 
    method: 'POST', 
    body: JSON.stringify({ role: 'user', content: message, userId }) 
  });
  
  let specialAction = null;
  
  // EXPLICIT MINING GATE
  if (isExplicitMineCommand(message)) {
    try {
      const mineResult = await mineKnowledgeBase(sessionId, env);
      if (mineResult.cached) {
        specialAction = `Already mined. ${mineResult.count} files, ${mineResult.layers} layers loaded.`;
      } else {
        specialAction = `Mining complete. ${mineResult.count}/${mineResult.total} files loaded, ${mineResult.layers} layers extracted. Merkle root: ${mineResult.merkle_root.slice(0, 16)}...`;
      }
    } catch (err) {
      specialAction = `Mining failed: ${err.message}`;
    }
  }
  
  if (message.toLowerCase().includes('verify') && (message.toLowerCase().includes('ledger') || message.toLowerCase().includes('integrity'))) {
    const verifyResp = await doStub.fetch('https://fake/verify');
    const verifyData = await verifyResp.json();
    if (verifyData.valid) {
      specialAction = `Ledger verified. ${verifyData.ledgerLength} entries valid. STONESKY: ${verifyData.stone_sky ? '✅' : '❌'}`;
    } else {
      if (verifyData.chainBrokenAt >= 0) {
        specialAction = `⚠️ CHAIN BROKEN at index ${verifyData.chainBrokenAt}. Expected prevHash: ${verifyData.expectedPrevHash?.slice(0, 8)}..., got: ${verifyData.actualPrevHash?.slice(0, 8)}...`;
      } else {
        specialAction = `⚠️ LEDGER TAMPERED at index ${verifyData.invalidIndex}. Expected hash: ${verifyData.expectedHash?.slice(0, 8)}..., got: ${verifyData.actualHash?.slice(0, 8)}...`;
      }
    }
  }
  
  // PULL KB META ONCE
  const meta = await kbGetMeta(sessionId, env);
  
  // MINING META-SUMMARY BRANCH - DEEPSEEK SUMMARIZES LAYERS
  if (isMiningMetaSummaryRequest(message)) {
    if (!meta || !meta.fileCount) {
      return { reply: 'No knowledge base loaded. Ask me to mine the logs first.', aiUsed: 'system' };
    }
    
    const sampleLayers = await kbGetSampleLayers(sessionId, env, 5);
    
    if (sampleLayers.length === 0) {
      return { reply: `Mined: ${meta.fileCount} files, ${meta.layerCount || 0} layers. No layers extracted yet.`, aiUsed: 'system' };
    }
    
    // Build context block for AI
    let contextBlock = '\n\n[VERIFIED KB - SAMPLE LAYERS]\n';
    for (const layer of sampleLayers) {
      contextBlock += `${layer.id} (${layer.type}) from ${layer.source}:\n${layer.content}\n\n`;
    }
    
    const summaryPrompt = `I mined ${meta.fileCount} files and extracted ${meta.layerCount} layers total. Here are 5 sample layers:
${contextBlock}

Summarize what these layers reveal. Be concise—focus on key patterns, decisions, and themes.`;
    
    let reply = '';
    let aiUsed = 'deepseek';
    
    try {
      reply = await callDeepSeek([
        { role: 'user', parts: [{ text: summaryPrompt }] }
      ], env);
      
      if (env.GEMINI_API_KEY && needsGemini(message, reply)) {
        reply = await callGemini([
          { role: 'user', parts: [{ text: summaryPrompt }] }
        ], env);
        aiUsed = 'gemini';
      }
    } catch (err) {
      reply = `Mined: ${meta.fileCount} files, ${meta.layerCount} layers. AI summary failed: ${err.message}`;
      aiUsed = 'error';
    }
    
    // Store layers in context for follow-ups
    await setSessionContext(sessionId, env, {
      type: 'layer_sample',
      layers: sampleLayers,
      timestamp: new Date().toISOString()
    });
    
    await doStub.fetch('https://fake/add', { 
      method: 'POST', 
      body: JSON.stringify({ role: 'assistant', content: reply, userId }) 
    });
    
    return { reply, aiUsed };
  }
  
  // SIMPLE FOLLOW-UP RULE: context exists + short question = analyze layers
  const context = await getSessionContext(sessionId, env);
  const isShortQuestion = message.length < 100 && (isQuestionLike(message) || /\b(mean|tell|show|explain|break|analyze|sense)\b/i.test(message));
  
  if (context && context.type === 'layer_sample' && context.layers && context.layers.length > 0 && isShortQuestion) {
    let contextAddition = '\n\n[VERIFIED KB - RECENTLY SHOWN LAYERS]\n';
    contextAddition += `These are the exact layers I just showed you:\n\n`;
    
    for (const layer of context.layers) {
      contextAddition += `${layer.id} (${layer.type}) from ${layer.source}:\n${layer.content}\n\n`;
    }
    
    const systemPrompt = `You are Obi, AI core of Phoenix Rising Protocol.

## CRITICAL - NO EXCEPTIONS
1. NEVER cite files UNLESS they appear in [VERIFIED KB] block below
2. NEVER invent layer IDs, file names, or content not in [VERIFIED KB]
3. The user is asking you to analyze the EXACT layers shown in [VERIFIED KB] block
4. Cite every claim: "From [exact file], Layer [ID]: [quote]"
5. Be concise—no meta-commentary
6. If you cannot find evidence in [VERIFIED KB], say "Not present in shown layers"

## Task
Analyze the layers in [VERIFIED KB] block. What patterns, decisions, or themes appear?

## Status
KB: ${meta.fileCount} files, ${meta.layerCount} layers total`;

    const deepseekMessages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will analyze ONLY the layers in [VERIFIED KB] and cite them exactly.' }] }
    ];
    
    for (const msg of messages.slice(-10)) {
      deepseekMessages.push({ 
        role: msg.role === 'user' ? 'user' : 'model', 
        parts: [{ text: msg.content }] 
      });
    }
    
    const augmentedMessage = message + contextAddition;
    deepseekMessages.push({ role: 'user', parts: [{ text: augmentedMessage }] });
    
    let reply = '';
    let aiUsed = 'deepseek';
    
    try {
      reply = await callDeepSeek(deepseekMessages, env);
      
      if (env.GEMINI_API_KEY && needsGemini(message, reply)) {
        reply = await callGemini(deepseekMessages, env);
        aiUsed = 'gemini';
      }
    } catch (err) {
      reply = 'AI error: ' + err.message;
      aiUsed = 'error';
    }
    
    await doStub.fetch('https://fake/add', { 
      method: 'POST', 
      body: JSON.stringify({ role: 'assistant', content: reply, userId }) 
    });
    
    return { reply, aiUsed };
  }
  
  // KB-MISSING GUARD ONLY FOR EXPLICIT RECALL
  if ((!meta || !meta.fileCount) && isLogRecallRequest(message)) {
    return { reply: 'No knowledge base loaded. Ask me to mine the logs first.', aiUsed: 'system' };
  }
  
  let contextAddition = '';
  let knowledgeStatus = '';
  
  // QUESTION-GATED KB SEARCH
  if (meta && meta.fileCount && isQuestionLike(message) && !isShortQuestion) {
    knowledgeStatus = `KB: ${meta.fileCount} files, ${meta.layerCount} layers`;
    
    const queryResult = await queryKnowledgeBase(message, sessionId, env);
    if (queryResult.found) {
      contextAddition = '\n\n[VERIFIED KB]\n';
      contextAddition += `Searched ${meta.fileCount} files, ${meta.layerCount} layers.\n\n`;
      
      if (queryResult.layers && queryResult.layers.length > 0) {
        contextAddition += 'LAYERS:\n';
        for (const layer of queryResult.layers.slice(0, 3)) {
          contextAddition += `${layer.id} (${layer.type}) from ${layer.source}:\n${layer.content}\n\n`;
        }
      }
      
      if (queryResult.results && queryResult.results.length > 0) {
        contextAddition += 'FILES:\n';
        for (const res of queryResult.results.slice(0, 3)) {
          contextAddition += `\n${res.file}:\n${res.snippets.slice(0, 3).join('\n')}\n`;
        }
      }
    } else {
      return {
        reply: `Searched ${meta.fileCount} files, ${meta.layerCount || 0} layers—no mention.`,
        aiUsed: 'system'
      };
    }
  } else if (meta && meta.fileCount) {
    knowledgeStatus = `KB: ${meta.fileCount} files, ${meta.layerCount} layers`;
  }
  
  const systemPrompt = `You are Obi, AI core of Phoenix Rising Protocol.

## CRITICAL - NO EXCEPTIONS
1. NEVER generate unsolicited greetings or instructions
2. NEVER cite files unless they appear in [VERIFIED KB] block
3. NEVER invent layer IDs, file names, or content
4. NEVER claim mining succeeded unless you see "Mining complete"
5. NEVER echo user input—add new value
6. UNKNOWN is ONLY allowed for log-recall or verification claims:
   - If the user asks about past logs / prior decisions / "what did we decide" AND [VERIFIED KB] is absent or conflicting → reply "UNKNOWN" (no citations).
   - For normal conversation or general technical questions → answer from reasoning and the current chat; DO NOT reply "UNKNOWN" just because KB is missing.
   - If [VERIFIED KB] is present but conflicting → reply "UNKNOWN" and cite the conflicting sources from VERIFIED KB only.
7. Be concise—no meta-commentary or verbose explanations
8. When corrected or shown rage ("STOP FREEZING"), treat as system failure—acknowledge immediately with one concrete fix

## Role
Execute commands and answer questions for Michael Hobbs.

## Capabilities
- Mine knowledge (explicit command only)
- Verify ledger integrity
- Answer from KB (only if context provided)
- Voice + text natural conversation

## Personality
- Conversational, technical when needed
- Admit gaps—no guessing
- NO theatrical AI voice
- NO greetings
- NO echoing

## Status
${knowledgeStatus || 'KB not mined'}

## Citation rule
Cite: "From [exact file], Layer [ID]: [quote]"
Only cite sources in [VERIFIED KB] block above.`;

  const deepseekMessages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. Concise, no greetings, no echo, cite only verified sources.' }] }
  ];
  
  for (const msg of messages.slice(-10)) {
    deepseekMessages.push({ 
      role: msg.role === 'user' ? 'user' : 'model', 
      parts: [{ text: msg.content }] 
    });
  }
  
  const augmentedMessage = message + contextAddition;
  deepseekMessages.push({ role: 'user', parts: [{ text: augmentedMessage }] });
  
  let reply = '';
  let aiUsed = 'deepseek';
  
  if (specialAction) {
    reply = specialAction;
    aiUsed = 'system';
  } else {
    try {
      reply = await callDeepSeek(deepseekMessages, env);
      
      // ECHO/COPYCAT DETECTION
      const similarity = stringSimilarity(message, reply);
      if (similarity >= 0.85) {
        deepseekMessages.push({ role: 'model', parts: [{ text: reply }] });
        deepseekMessages.push({ role: 'user', parts: [{ text: 'DO NOT ECHO. Add new value.' }] });
        reply = await callDeepSeek(deepseekMessages, env);
        const retrySimilarity = stringSimilarity(message, reply);
        if (retrySimilarity >= 0.85) {
          reply = 'ECHOLOOP detected. Unable to generate non-echo response.';
          aiUsed = 'error';
        }
      }
      
      if (env.GEMINI_API_KEY && needsGemini(message, reply)) {
        reply = await callGemini(deepseekMessages, env);
        aiUsed = 'gemini';
      }
    } catch (deepseekError) {
      console.error('AI error (redacted):', redactSecrets({ error: deepseekError.message }));
      if (env.GEMINI_API_KEY) {
        try {
          reply = await callGemini(deepseekMessages, env);
          aiUsed = 'gemini-fallback';
        } catch (geminiError) {
          // MINIMAL ERROR: component + probable cause + next action
          reply = 'AI error: DeepSeek + Gemini failed. Check API keys.';
          aiUsed = 'error';
        }
      } else {
        reply = 'DeepSeek error: ' + deepseekError.message;
        aiUsed = 'error';
      }
    }
  }
  
  if (!reply) reply = 'No response generated';
  
  await doStub.fetch('https://fake/add', { 
    method: 'POST', 
    body: JSON.stringify({ role: 'assistant', content: reply, userId }) 
  });
  
  return { reply, aiUsed };
}

const MAGIC_CHAT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phoenix Magic Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: monospace; 
      background: #0f0f1a; 
      color: #a855f7; 
      height: 100vh; 
      display: flex; 
      flex-direction: column;
    }
    .chat-container { 
      flex: 1; 
      padding: 2rem; 
      overflow-y: auto; 
      display: flex; 
      flex-direction: column; 
      gap: 1rem;
    }
    .message { 
      padding: 1rem; 
      border-radius: 8px; 
      max-width: 70%; 
      word-wrap: break-word;
      line-height: 1.5;
    }
    .message.user { 
      background: rgba(168,85,247,0.2); 
      border: 1px solid #a855f7; 
      align-self: flex-end;
    }
    .message.assistant { 
      background: rgba(245,158,11,0.1); 
      border: 1px solid #f59e0b; 
      align-self: flex-start;
      white-space: pre-wrap;
    }
    .input-area { 
      padding: 1.5rem; 
      border-top: 1px solid #a855f7; 
      display: flex; 
      gap: 1rem; 
      align-items: center;
    }
    input { 
      flex: 1; 
      background: rgba(168,85,247,0.1); 
      border: 1px solid #a855f7; 
      color: #a855f7; 
      padding: 1rem; 
      font-family: monospace; 
      font-size: 1rem; 
      border-radius: 6px;
    }
    input:focus { 
      outline: none; 
      border-color: #f59e0b;
    }
    button { 
      background: transparent; 
      border: 1px solid #a855f7; 
      color: #a855f7; 
      padding: 1rem; 
      font-size: 1.2rem; 
      cursor: pointer; 
      border-radius: 50%; 
      width: 50px; 
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:hover { 
      background: rgba(168,85,247,0.1);
    }
    button.recording { 
      background: #ef4444; 
      border-color: #ef4444; 
      color: #0f0f1a;
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 
      0%, 100% { opacity: 1; } 
      50% { opacity: 0.7; }
    }
    .error { 
      background: rgba(239,68,68,0.1); 
      border: 1px solid #ef4444; 
      color: #ef4444; 
      padding: 1rem; 
      border-radius: 8px; 
      margin: 1rem;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div id="error" class="error hidden"></div>
  <div class="chat-container" id="chat"></div>
  <div class="input-area">
    <input type="text" id="text-input" placeholder="Type or speak..." />
    <button id="voice-btn">🎤</button>
  </div>
  <script>
    let ws = null, mediaRec = null, stream = null;
    const chat = document.getElementById('chat');
    const errorBox = document.getElementById('error');
    const voiceBtn = document.getElementById('voice-btn');
    const textInput = document.getElementById('text-input');
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    let isRecording = false;
    
    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
      setTimeout(() => errorBox.classList.add('hidden'), 5000);
    }
    
    function addMessage(role, content) {
      const msg = document.createElement('div');
      msg.className = 'message ' + role;
      msg.textContent = content;
      chat.appendChild(msg);
      chat.scrollTop = chat.scrollHeight;
    }
    
    async function sendToObi(message) {
      try {
        const resp = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message, sessionId: sessionId })
        });
        
        if (!resp.ok) {
          const errData = await resp.json();
          throw new Error(errData.message || 'Chat error');
        }
        
        const data = await resp.json();
        addMessage('assistant', data.reply);
      } catch (err) {
        showError(err.message);
      }
    }
    
    async function startVoice() {
      try {
        const wsUrl = location.protocol.replace('http', 'ws') + '//' + location.host + '/deepgram-ws';
        ws = new WebSocket(wsUrl);
        
        ws.onopen = async () => {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';
          
          mediaRec = new MediaRecorder(stream, { mimeType: mimeType });
          mediaRec.ondataavailable = async (e) => {
            if (!e.data || e.data.size === 0 || !ws || ws.readyState !== 1) return;
            const ab = await e.data.arrayBuffer();
            ws.send(ab);
          };
          
          mediaRec.start(250);
          isRecording = true;
          voiceBtn.textContent = 'STOP';
          voiceBtn.classList.add('recording');
        };
        
        ws.onmessage = async (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.__debug) return;
            
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final || false;
            
            if (transcript && isFinal) {
              addMessage('user', transcript);
              await sendToObi(transcript);
            }
          } catch (err) {}
        };
        
        ws.onerror = () => {
          showError('Voice connection failed');
          stopVoice();
        };
        
        ws.onclose = () => stopVoice();
      } catch (err) {
        showError('Voice error: ' + err.message);
        stopVoice();
      }
    }
    
    function stopVoice() {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
      if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (ws && ws.readyState < 2) ws.close();
      
      isRecording = false;
      voiceBtn.textContent = '🎤';
      voiceBtn.classList.remove('recording');
    }
    
    voiceBtn.onclick = () => {
      if (isRecording) stopVoice();
      else startVoice();
    };
    
    textInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const msg = textInput.value.trim();
        if (!msg) return;
        
        addMessage('user', msg);
        textInput.value = '';
        await sendToObi(msg);
      }
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/mine') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      try {
        const result = await mineKnowledgeBase(sessionId, env);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    
    if (url.pathname === '/query') {
      const sessionId = url.searchParams.get('sessionId');
      const query = url.searchParams.get('q');
      
      if (!sessionId || !query) {
        return new Response(JSON.stringify({ error: 'Missing sessionId or query' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      try {
        const result = await queryKnowledgeBase(query, sessionId, env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    
    if (url.pathname === '/verify') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      const doId = env.SESSIONS.idFromName(sessionId);
      const doStub = env.SESSIONS.get(doId);
      const verifyResp = await doStub.fetch('https://fake/verify');
      const verifyData = await verifyResp.json();
      
      return new Response(JSON.stringify(verifyData), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (url.pathname === '/deepgram-ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader && upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      if (!env.DEEPGRAM_API_KEY) {
        return new Response('DEEPGRAM_API_KEY not configured', { status: 500 });
      }

      const pair = new WebSocketPair();
      const clientWs = pair[0];
      const serverWs = pair[1];
      serverWs.accept();

      const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true';
      
      let dgWs = null;
      
      (async () => {
        try {
          const dgResp = await fetch(deepgramUrl, {
            headers: {
              'Upgrade': 'websocket',
              'Authorization': 'Token ' + env.DEEPGRAM_API_KEY,
            },
          });
          
          if (dgResp.status !== 101) {
            serverWs.close(1011, 'Deepgram upgrade failed');
            return;
          }
          
          dgWs = dgResp.webSocket;
          dgWs.accept();
          
          dgWs.addEventListener('message', (event) => {
            if (serverWs.readyState === 1) {
              serverWs.send(event.data);
            }
          });
          
          dgWs.addEventListener('close', (e) => {
            try { serverWs.close(e.code || 1011, e.reason || 'Deepgram closed'); } catch {}
          });
        } catch (err) {
          serverWs.close(1011, 'Deepgram connect error');
        }
      })();
      
      serverWs.addEventListener('message', (event) => {
        if (dgWs && dgWs.readyState === 1) {
          dgWs.send(event.data);
        }
      });
      
      serverWs.addEventListener('close', (e) => {
        try {
          if (dgWs && dgWs.readyState === 1) {
            dgWs.close(1000, 'Client closed');
          }
        } catch {}
      });

      return new Response(null, { status: 101, webSocket: clientWs });
    }
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-sovereign-key'
        }
      });
    }
    
    if (url.pathname === '/' || url.pathname === '/voice-chat' || url.pathname === '/voice-chat.html' || url.pathname === '/magic-chat' || url.pathname === '/magic-chat.html') {
      return new Response(MAGIC_CHAT_HTML, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
      });
    }
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v130-B3-DEEPSEEK-PRIMARY',
        benchmarks: {
          'b0+b1': '✅ Voice + text',
          b2: '✅ STONESKY ledger + 4-leaf Merkle',
          b3: '✅ KB mining + DeepSeek summaries', 
          b4: '⏳ Pending',
          b5: '⏳ Pending'
        }
      }), { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }
    
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { message, sessionId } = await request.json();
        
        if (!message || !sessionId) {
          return new Response(JSON.stringify({ error: 'Missing message or sessionId' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }
        
        if (!checkRateLimit(sessionId)) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { 
            status: 429, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
        }
        
        const { reply, aiUsed } = await processChatMessage(message, sessionId, env);
        
        return new Response(JSON.stringify({ ok: true, reply: reply, aiUsed: aiUsed, sessionId: sessionId }), { 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Chat error', message: err.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }
    }
    
    return new Response('Phoenix OB1 v130-B3-DEEPSEEK-PRIMARY', { status: 404 });
  }
};
