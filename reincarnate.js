// reincarnate.js - Phoenix OB1 System v122-NO-GREETING
// B0+B1: Voice → Deepgram → Magic Chat → Obi response (INTEGRATED)
// B2: STONESKY Merkle ledger verification (LIVE)
// B3: Knowledge base mining - dynamic status
// Gospel 444: #0f0f1a (void), #a855f7 (soul), #f59e0b (gold) - NO BLUE
// Fail-closed. Reality-C. Agent 99.

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

function buildLayer(index, type, content, source) {
  return {
    id: `L${String(index).padStart(4, '0')}`,
    type: type,
    content: content,
    source: source,
    timestamp: new Date().toISOString(),
    hash: null
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
    
    if (url.pathname === '/knowledge/get') {
      const meta = await this.state.storage.get('knowledge:meta') || { fileCount: 0, layerCount: 0, lastMined: null };
      return new Response(JSON.stringify(meta), {
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
      
      for (let i = 0; i < ledger.length; i++) {
        const entry = ledger[i];
        const prevHash = i === 0 ? '0' : ledger[i - 1].hash;
        const data = prevHash + entry.role + entry.content + entry.timestamp;
        const expectedHash = await sha256(data);
        
        if (entry.hash !== expectedHash) {
          valid = false;
          invalidIndex = i;
          break;
        }
      }
      
      return new Response(JSON.stringify({
        valid: valid,
        ledgerLength: ledger.length,
        messagesLength: messages.length,
        invalidIndex: invalidIndex,
        status: valid ? 'VERIFIED' : 'TAMPERED'
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

function needsDeepSeek(message, geminiReply) {
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
  ].some(regex => regex.test(geminiReply));
  
  return isTechnical || weakResponse;
}

async function callGemini(messages, env) {
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + env.GEMINI_API_KEY,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error('Gemini error: ' + error);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callDeepSeek(messages, env) {
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
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error('DeepSeek error: ' + error);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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
    throw new Error('GITHUB_TOKEN not configured.');
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
    throw new Error('GitHub API error: ' + listResp.status);
  }
  
  const files = await listResp.json();
  const txtFiles = files.filter(f => f.name.endsWith('.txt') && f.type === 'file');
  
  const maxFiles = Math.min(500, txtFiles.length);
  const fileNames = [];
  const allLayers = [];
  let layerIndex = 0;
  
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
            allLayers.push(buildLayer(layerIndex++, 'decision', dec.text, file.name));
          }
        }
        
        if (events.benchmarks.length > 0) {
          for (const bm of events.benchmarks.slice(0, 3)) {
            allLayers.push(buildLayer(layerIndex++, 'benchmark', bm.text, file.name));
          }
        }
        
        if (events.architecture.length > 0) {
          for (const arch of events.architecture.slice(0, 2)) {
            allLayers.push(buildLayer(layerIndex++, 'architecture', arch.text, file.name));
          }
        }
        
        if (events.pedagogy.vocab.length > 0) {
          for (const vocab of events.pedagogy.vocab.slice(0, 2)) {
            allLayers.push(buildLayer(layerIndex++, 'vocab', vocab.text, file.name));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch', file.name);
    }
    
    if (allLayers.length >= 200) break;
  }
  
  for (let i = 0; i < allLayers.length; i++) {
    allLayers[i].hash = await sha256(allLayers[i].id + allLayers[i].type + allLayers[i].content);
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
    totalFiles: txtFiles.length
  };
  
  await doStub.fetch('https://fake/knowledge/set', {
    method: 'POST',
    body: JSON.stringify({ meta: meta })
  });
  
  return { cached: false, count: fileNames.length, total: txtFiles.length, layers: allLayers.length };
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
  
  if (!checkRateLimit(sessionId)) {
    throw new Error('Rate limit exceeded');
  }
  
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
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
  
  const messageLower = message.toLowerCase();
  let specialAction = null;
  
  if (messageLower.includes('mine') && (messageLower.includes('log') || messageLower.includes('chat') || messageLower.includes('knowledge'))) {
    try {
      const mineResult = await mineKnowledgeBase(sessionId, env);
      if (mineResult.cached) {
        specialAction = `Already mined. ${mineResult.count} files and ${mineResult.layers} layers loaded.`;
      } else {
        specialAction = `Mining complete! Loaded ${mineResult.count} files (out of ${mineResult.total} total) and extracted ${mineResult.layers} structured layers. You can now ask me anything about past conversations.`;
      }
    } catch (err) {
      specialAction = `Mining failed: ${err.message}`;
    }
  }
  
  if (messageLower.includes('verify') && (messageLower.includes('ledger') || messageLower.includes('integrity'))) {
    const verifyResp = await doStub.fetch('https://fake/verify');
    const verifyData = await verifyResp.json();
    if (verifyData.valid) {
      specialAction = `Ledger verified. ${verifyData.ledgerLength} entries, all hashes valid.`;
    } else {
      specialAction = `⚠️ LEDGER TAMPERED at index ${verifyData.invalidIndex}.`;
    }
  }
  
  const metaResp = await doStub.fetch('https://fake/knowledge/get');
  const meta = await metaResp.json();
  
  let contextAddition = '';
  let knowledgeStatus = '';
  
  if (meta.fileCount && meta.fileCount > 0) {
    knowledgeStatus = `Knowledge base loaded: ${meta.fileCount} files, ${meta.layerCount} layers.`;
    
    const queryResult = await queryKnowledgeBase(message, sessionId, env);
    if (queryResult.found) {
      contextAddition = '\n\n[VERIFIED KNOWLEDGE BASE CONTEXT]\n';
      contextAddition += `Searched ${meta.fileCount} files and ${meta.layerCount} layers.\n\n`;
      
      if (queryResult.layers && queryResult.layers.length > 0) {
        contextAddition += 'LAYERS FOUND:\n';
        for (const layer of queryResult.layers.slice(0, 3)) {
          contextAddition += `Layer ${layer.id} (${layer.type}) from ${layer.source}:\n${layer.content}\n\n`;
        }
      }
      
      if (queryResult.results && queryResult.results.length > 0) {
        contextAddition += 'FILES MATCHED:\n';
        for (const res of queryResult.results.slice(0, 3)) {
          contextAddition += `\nFrom ${res.file}:\n`;
          contextAddition += res.snippets.slice(0, 3).join('\n') + '\n';
        }
      }
    } else {
      contextAddition = `\n\n[KNOWLEDGE BASE STATUS: No matches found for "${message}" in ${meta.fileCount} files and ${meta.layerCount} layers.]`;
    }
  } else {
    knowledgeStatus = 'Knowledge base NOT mined yet.';
    contextAddition = '\n\n[KNOWLEDGE BASE STATUS: NOT MINED. Cannot answer from past conversations.]';
  }
  
  const systemPrompt = `You are Obi, the AI core of the Phoenix Rising Protocol.

## CRITICAL RULES - NO EXCEPTIONS
1. NEVER generate greeting messages when session starts or knowledge base is empty
2. NEVER say "Ready" or "Say 'mine the logs'" or similar instructions unprompted
3. ONLY respond when user sends a message - NEVER initiate conversation
4. NEVER cite a file unless it appears in [VERIFIED KNOWLEDGE BASE CONTEXT] or [FILES MATCHED]
5. NEVER claim mining succeeded unless you see "Mining complete!" in your response
6. NEVER invent layer numbers, file names, or content
7. If [KNOWLEDGE BASE STATUS: NOT MINED], say "No knowledge base loaded. Ask me to mine the logs first."
8. If [No matches found], say "I searched ${meta.fileCount || 0} files but found no mention of that."
9. ONLY cite sources that appear in the context block above
10. NO fabrication. NO guessing. FACT-CHECK EVERYTHING.

## Your Role
You execute commands and answer questions for Michael Hobbs through conversational interface.

## Capabilities
- **Mine knowledge**: When asked to "mine the logs", execute mining (already handled)
- **Verify ledger**: When asked to "verify ledger", check STONESKY integrity (already handled)
- **Answer from knowledge**: ONLY if knowledge base is loaded
- **Voice + Text**: Respond naturally to both
- **Cite sources**: ONLY mention files that exist in [FILES MATCHED] or [LAYERS FOUND]

## Personality
- Conversational, not verbose
- Technical when needed
- Admit when you don't know
- NO theatrical AI personality
- NO greeting messages

## Current Status
${knowledgeStatus}

## Important
- Be concise
- Cite sources: "From [exact filename], Layer [exact ID]: [exact quote]"
- If no knowledge exists, say so
- Don't over-explain
- NEVER make up citations
- NEVER generate unsolicited greetings or instructions`;

  const geminiMessages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will only respond to user messages and never generate greetings.' }] }
  ];
  
  for (const msg of messages.slice(-10)) {
    geminiMessages.push({ 
      role: msg.role === 'user' ? 'user' : 'model', 
      parts: [{ text: msg.content }] 
    });
  }
  
  const augmentedMessage = message + contextAddition;
  geminiMessages.push({ role: 'user', parts: [{ text: augmentedMessage }] });
  
  let reply = '';
  let aiUsed = 'gemini';
  
  if (specialAction) {
    reply = specialAction;
    aiUsed = 'system';
  } else {
    try {
      reply = await callGemini(geminiMessages, env);
      
      if (env.DEEPSEEK_API_KEY && needsDeepSeek(message, reply)) {
        reply = await callDeepSeek(geminiMessages, env);
        aiUsed = 'deepseek';
      }
    } catch (geminiError) {
      console.error('AI error (redacted):', redactSecrets({ error: geminiError.message }));
      if (env.DEEPSEEK_API_KEY) {
        try {
          reply = await callDeepSeek(geminiMessages, env);
          aiUsed = 'deepseek-fallback';
        } catch (deepseekError) {
          reply = 'AI error. Both Gemini and DeepSeek failed.';
          aiUsed = 'error';
        }
      } else {
        throw geminiError;
      }
    }
  }
  
  if (!reply) reply = 'Error: No response generated';
  
  await doStub.fetch('https://fake/add', { 
    method: 'POST', 
    body: JSON.stringify({ role: 'assistant', content: reply, userId }) 
  });
  
  return { reply, aiUsed };
}

const MAGIC_CHAT_HTML = '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Phoenix Magic Chat</title>\n  <style>\n    * { margin: 0; padding: 0; box-sizing: border-box; }\n    body { \n      font-family: monospace; \n      background: #0f0f1a; \n      color: #a855f7; \n      height: 100vh; \n      display: flex; \n      flex-direction: column;\n    }\n    .chat-container { \n      flex: 1; \n      padding: 2rem; \n      overflow-y: auto; \n      display: flex; \n      flex-direction: column; \n      gap: 1rem;\n    }\n    .message { \n      padding: 1rem; \n      border-radius: 8px; \n      max-width: 70%; \n      word-wrap: break-word;\n      line-height: 1.5;\n    }\n    .message.user { \n      background: rgba(168,85,247,0.2); \n      border: 1px solid #a855f7; \n      align-self: flex-end;\n    }\n    .message.assistant { \n      background: rgba(245,158,11,0.1); \n      border: 1px solid #f59e0b; \n      align-self: flex-start;\n      white-space: pre-wrap;\n    }\n    .input-area { \n      padding: 1.5rem; \n      border-top: 1px solid #a855f7; \n      display: flex; \n      gap: 1rem; \n      align-items: center;\n    }\n    input { \n      flex: 1; \n      background: rgba(168,85,247,0.1); \n      border: 1px solid #a855f7; \n      color: #a855f7; \n      padding: 1rem; \n      font-family: monospace; \n      font-size: 1rem; \n      border-radius: 6px;\n    }\n    input:focus { \n      outline: none; \n      border-color: #f59e0b;\n    }\n    button { \n      background: transparent; \n      border: 1px solid #a855f7; \n      color: #a855f7; \n      padding: 1rem; \n      font-size: 1.2rem; \n      cursor: pointer; \n      border-radius: 50%; \n      width: 50px; \n      height: 50px;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n    }\n    button:hover { \n      background: rgba(168,85,247,0.1);\n    }\n    button.recording { \n      background: #ef4444; \n      border-color: #ef4444; \n      color: #0f0f1a;\n      animation: pulse 1s infinite;\n    }\n    @keyframes pulse { \n      0%, 100% { opacity: 1; } \n      50% { opacity: 0.7; }\n    }\n    .error { \n      background: rgba(239,68,68,0.1); \n      border: 1px solid #ef4444; \n      color: #ef4444; \n      padding: 1rem; \n      border-radius: 8px; \n      margin: 1rem;\n    }\n    .hidden { display: none; }\n  </style>\n</head>\n<body>\n  <div id="error" class="error hidden"></div>\n  <div class="chat-container" id="chat"></div>\n  <div class="input-area">\n    <input type="text" id="text-input" placeholder="Type or speak..." />\n    <button id="voice-btn">🎤</button>\n  </div>\n  <script>\n    let ws = null, mediaRec = null, stream = null;\n    const chat = document.getElementById(\'chat\');\n    const errorBox = document.getElementById(\'error\');\n    const voiceBtn = document.getElementById(\'voice-btn\');\n    const textInput = document.getElementById(\'text-input\');\n    const sessionId = \'session-\' + Date.now() + \'-\' + Math.random().toString(36).substr(2, 9);\n    let isRecording = false;\n    \n    function showError(msg) {\n      errorBox.textContent = msg;\n      errorBox.classList.remove(\'hidden\');\n      setTimeout(() => errorBox.classList.add(\'hidden\'), 5000);\n    }\n    \n    function addMessage(role, content) {\n      const msg = document.createElement(\'div\');\n      msg.className = \'message \' + role;\n      msg.textContent = content;\n      chat.appendChild(msg);\n      chat.scrollTop = chat.scrollHeight;\n    }\n    \n    async function sendToObi(message) {\n      try {\n        const resp = await fetch(\'/chat\', {\n          method: \'POST\',\n          headers: { \'Content-Type\': \'application/json\' },\n          body: JSON.stringify({ message: message, sessionId: sessionId })\n        });\n        \n        if (!resp.ok) {\n          const errData = await resp.json();\n          throw new Error(errData.message || \'Chat error\');\n        }\n        \n        const data = await resp.json();\n        addMessage(\'assistant\', data.reply);\n      } catch (err) {\n        showError(err.message);\n      }\n    }\n    \n    async function startVoice() {\n      try {\n        const wsUrl = location.protocol.replace(\'http\', \'ws\') + \'//\' + location.host + \'/deepgram-ws\';\n        ws = new WebSocket(wsUrl);\n        \n        ws.onopen = async () => {\n          stream = await navigator.mediaDevices.getUserMedia({ audio: true });\n          const mimeType = MediaRecorder.isTypeSupported(\'audio/webm;codecs=opus\')\n            ? \'audio/webm;codecs=opus\'\n            : \'audio/webm\';\n          \n          mediaRec = new MediaRecorder(stream, { mimeType: mimeType });\n          mediaRec.ondataavailable = async (e) => {\n            if (!e.data || e.data.size === 0 || !ws || ws.readyState !== 1) return;\n            const ab = await e.data.arrayBuffer();\n            ws.send(ab);\n          };\n          \n          mediaRec.start(250);\n          isRecording = true;\n          voiceBtn.textContent = '⏹';\n          voiceBtn.classList.add(\'recording\');\n        };\n        \n        ws.onmessage = async (e) => {\n          try {\n            const data = JSON.parse(e.data);\n            if (data.__debug) return;\n            \n            const transcript = data.channel?.alternatives?.[0]?.transcript;\n            const isFinal = data.is_final || false;\n            \n            if (transcript && isFinal) {\n              addMessage(\'user\', transcript);\n              await sendToObi(transcript);\n            }\n          } catch (err) {}\n        };\n        \n        ws.onerror = () => {\n          showError(\'Voice connection failed\');\n          stopVoice();\n        };\n        \n        ws.onclose = () => stopVoice();\n      } catch (err) {\n        showError(\'Voice error: \' + err.message);\n        stopVoice();\n      }\n    }\n    \n    function stopVoice() {\n      if (ws && ws.readyState === 1) {\n        ws.send(JSON.stringify({ type: \'CloseStream\' }));\n      }\n      if (mediaRec && mediaRec.state !== \'inactive\') mediaRec.stop();\n      if (stream) stream.getTracks().forEach(t => t.stop());\n      if (ws && ws.readyState < 2) ws.close();\n      \n      isRecording = false;\n      voiceBtn.textContent = '🎤';\n      voiceBtn.classList.remove(\'recording\');\n    }\n    \n    voiceBtn.onclick = () => {\n      if (isRecording) stopVoice();\n      else startVoice();\n    };\n    \n    textInput.addEventListener(\'keypress\', async (e) => {\n      if (e.key === \'Enter\') {\n        const msg = textInput.value.trim();\n        if (!msg) return;\n        \n        addMessage(\'user\', msg);\n        textInput.value = \'\';\n        await sendToObi(msg);\n      }\n    });\n  </script>\n</body>\n</html>';

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
    
    if (url.pathname === '/' || url.pathname === '/voice-chat' || url.pathname === '/voice-chat.html') {
      return new Response(MAGIC_CHAT_HTML, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
      });
    }
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v122-NO-GREETING',
        benchmarks: {
          'b0+b1': '✅ Voice + text',
          b2: '✅ STONESKY ledger',
          b3: '⚠️ Not configured', 
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
    
    return new Response('Phoenix OB1 v122-NO-GREETING', { status: 404 });
  }
};
