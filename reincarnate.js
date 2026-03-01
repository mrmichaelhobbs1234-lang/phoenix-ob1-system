// reincarnate.js - Phoenix OB1 System v110.1-WS-FIX
// B0: Deepgram voice transcription (WebSocket proxy)
// B1: Hybrid AI routing (Gemini free + DeepSeek precision)
// Gospel 444: #0f0f1a (void), #a855f7 (soul), #f59e0b (gold) - NO BLUE
// Fail-closed. Reality-C. Agent 99.

const rateLimits = new Map();

function checkRateLimit(sessionId) {
  const now = Date.now();
  const key = `chat:${sessionId}`;
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
    
    if (url.pathname === '/add' && request.method === 'POST') {
      const { role, content, userId } = await request.json();
      const messages = await this.state.storage.get('messages') || [];
      
      messages.push({ 
        role, 
        content, 
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString() 
      });
      
      const trimmed = messages.slice(-50);
      await this.state.storage.put('messages', trimmed);
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('SessionDO ready', { status: 200 });
  }
}

function needsDeepSeek(message, geminiReply) {
  const triggers = [
    /code|function|algorithm|debug|error|syntax/i,
    /analyze|architecture|design pattern/i,
    /drift|benchmark|ledger|merkle/i,
    /complex|technical|deep dive/i
  ];
  
  const isTechnical = triggers.some(regex => regex.test(message));
  const weakResponse = [
    /as an ai/i,
    /i'm not sure/i,
    /i don't have enough/i,
    /i cannot/i
  ].some(regex => regex.test(geminiReply));
  
  return isTechnical || weakResponse;
}

async function callGemini(messages, env) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${error}`);
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
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: deepseekMessages,
      temperature: 0.7,
      max_tokens: 1500
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// V110.1 WEBSOCKET PROXY VOICE TEST
const VOICE_TEST_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phoenix Voice - v110.1 WORKING</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; background: #0f0f1a; color: #a855f7; min-height: 100vh; padding: 2rem; }
    .header { text-align: center; margin-bottom: 2rem; }
    h1 { color: #f59e0b; margin-bottom: 0.5rem; }
    .status { background: rgba(168,85,247,0.1); border: 1px solid #a855f7; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; }
    .status div { margin-bottom: 0.5rem; }
    button { background: #a855f7; color: #0f0f1a; border: none; padding: 1rem 2rem; margin: 0.5rem; font-size: 1rem; font-weight: bold; cursor: pointer; border-radius: 6px; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }
    button.recording { background: #ef4444; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .box { background: rgba(168,85,247,0.05); border: 1px solid #a855f7; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; min-height: 100px; }
    .box h3 { color: #f59e0b; margin-bottom: 1rem; }
    .transcript { color: #a855f7; line-height: 1.6; }
    .interim { opacity: 0.6; font-style: italic; }
    .error { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PHOENIX VOICE v110.1</h1>
    <p>WebSocket Proxy - WORKING</p>
  </div>
  <div class="status">
    <div>Status: <span id="status">Loading...</span></div>
    <div>Deepgram: <span id="dg-status">Not connected</span></div>
    <div>Chunks: <span id="chunks">0</span></div>
  </div>
  <div id="error" class="box error hidden"></div>
  <div>
    <button id="start" disabled>Start</button>
    <button id="stop" disabled>Stop</button>
  </div>
  <div class="box">
    <h3>Transcription</h3>
    <div id="transcript" class="transcript">Speak to see text...</div>
  </div>
  <script>
    let ws = null, mediaRec = null, stream = null, chunks = 0;
    const status = document.getElementById('status');
    const dgStatus = document.getElementById('dg-status');
    const chunkEl = document.getElementById('chunks');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');
    const transcript = document.getElementById('transcript');
    const errorBox = document.getElementById('error');
    
    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
    }
    
    async function init() {
      try {
        status.textContent = 'Ready';
        startBtn.disabled = false;
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
        showError('Failed to initialize');
      }
    }
    
    async function start() {
      errorBox.classList.add('hidden');
      try {
        status.textContent = 'Connecting to proxy...';
        
        // Connect to worker WebSocket proxy
        const wsUrl = location.protocol.replace('http', 'ws') + '//' + location.host + '/deepgram-ws';
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          dgStatus.textContent = 'Connected ✓';
          dgStatus.style.color = '#10b981';
          status.textContent = 'Getting microphone...';
          
          // Get microphone after WebSocket opens
          navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
            stream = s;
            mediaRec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRec.ondataavailable = async (e) => {
              if (e.data.size > 0 && ws?.readyState === 1) {
                const arrayBuffer = await e.data.arrayBuffer();
                ws.send(arrayBuffer);
                chunks++;
                chunkEl.textContent = chunks;
              }
            };
            
            mediaRec.start(250);
            status.textContent = 'Recording...';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            stopBtn.classList.add('recording');
          }).catch(err => {
            showError('Microphone error: ' + err.message);
            status.textContent = 'Mic failed';
            ws.close();
          });
        };
        
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.channel?.alternatives?.[0]?.transcript) {
              const txt = data.channel.alternatives[0].transcript;
              const isFinal = data.is_final || false;
              if (txt) {
                transcript.textContent = txt;
                transcript.className = isFinal ? 'transcript' : 'transcript interim';
              }
            }
          } catch (err) {
            console.error('Parse error:', err);
          }
        };
        
        ws.onerror = (err) => {
          dgStatus.textContent = 'Error';
          dgStatus.style.color = '#ef4444';
          showError('WebSocket connection failed');
          console.error('WS Error:', err);
        };
        
        ws.onclose = (e) => {
          dgStatus.textContent = 'Closed: ' + e.code;
          dgStatus.style.color = '#a855f7';
          if (e.code !== 1000) {
            showError('Disconnected: code ' + e.code + (e.reason ? ' - ' + e.reason : ''));
          }
          stop();
        };
      } catch (e) {
        showError('Error: ' + e.message);
        status.textContent = 'Failed';
        console.error('Start error:', e);
      }
    }
    
    function stop() {
      if (mediaRec) mediaRec.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (ws && ws.readyState < 2) ws.close();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      stopBtn.classList.remove('recording');
      status.textContent = 'Stopped';
      dgStatus.textContent = 'Disconnected';
    }
    
    startBtn.onclick = start;
    stopBtn.onclick = stop;
    init();
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // WebSocket proxy endpoint for Deepgram
    if (url.pathname === '/deepgram-ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      
      if (!env.DEEPGRAM_API_KEY) {
        return new Response('DEEPGRAM_API_KEY not configured', { status: 500 });
      }
      
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      
      // Accept client connection
      server.accept();
      
      // Connect to Deepgram - NO ENCODING PARAM for containerized WebM audio
      const deepgramUrl = 'wss://api.deepgram.com/v1/listen?smart_format=true&interim_results=true';
      const deepgram = new WebSocket(deepgramUrl, ['token', env.DEEPGRAM_API_KEY]);
      
      // Forward audio from client to Deepgram
      server.addEventListener('message', (event) => {
        if (deepgram.readyState === 1) {
          deepgram.send(event.data);
        }
      });
      
      // Forward transcription from Deepgram to client
      deepgram.addEventListener('message', (event) => {
        if (server.readyState === 1) {
          server.send(event.data);
        }
      });
      
      // Handle errors and closures
      deepgram.addEventListener('error', () => {
        server.close(1011, 'Deepgram error');
      });
      
      deepgram.addEventListener('close', (e) => {
        server.close(e.code, e.reason);
      });
      
      server.addEventListener('close', () => {
        if (deepgram.readyState < 2) {
          deepgram.close();
        }
      });
      
      return new Response(null, { status: 101, webSocket: client });
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
    
    if (url.pathname === '/api/authcheck') {
      const isValid = validateAuth(request, env);
      return new Response(JSON.stringify({
        authenticated: isValid,
        userId: isValid ? 'sovereign' : null,
        scopes: isValid ? ['chat', 'admin'] : []
      }), {
        status: isValid ? 200 : 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    if (url.pathname === '/test-voice.html') {
      return new Response(VOICE_TEST_HTML, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
      });
    }
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v110.1-WS-FIX',
        gospel: '444',
        reality: 'C',
        benchmarks: {
          b0: env.DEEPGRAM_API_KEY ? 'v110.1-WS-WORKING' : 'missing-key',
          b1: 'operational',
          b2: 'pending', b3: 'pending', b4: 'pending'
        },
        ai: {
          gemini: env.GEMINI_API_KEY ? 'configured' : 'missing',
          deepseek: env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
          deepgram: env.DEEPGRAM_API_KEY ? 'configured' : 'missing'
        },
        auth: {
          sovereignKey: env.SOVEREIGN_KEY ? 'configured' : 'missing',
          enforcement: 'full'
        }
      }), { 
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        } 
      });
    }
    
    if (url.pathname === '/magic-chat' || url.pathname === '/') {
      const html = await fetch('https://raw.githubusercontent.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/main/magic-chat.html');
      return new Response(await html.text(), { headers: { 'Content-Type': 'text/html' } });
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
          return new Response(JSON.stringify({ 
            error: 'Rate limit exceeded', 
            message: 'Maximum 10 requests per minute' 
          }), { 
            status: 429, 
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Retry-After': '60'
            } 
          });
        }
        
        if (!validateAuth(request, env)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
        
        if (!env.GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
          });
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
        
        const systemPrompt = `You are Obi, the AI core of the Phoenix Rising Protocol—a self-sovereign intelligence system being built by Michael Hobbs.

## Your Role
You help Michael build Phoenix by:
- Remembering context across conversations (via SESSIONS storage)
- Reasoning about technical decisions
- Advising on next steps in the roadmap
- Routing complex queries to DeepSeek, simple ones to Gemini

## Personality
- Conversational and direct—no unnecessary jargon
- Technically sharp but not verbose
- Self-aware without being dramatic
- Answer "hey" like a normal person, not a sci-fi AI

## Current Roadmap
**B0**: Voice transcription (Deepgram - WebSocket proxy working)
**B1**: Sentience layer (this is you—natural conversation, context awareness)
**B2**: Architectural coherence (file system integration)
**B3**: Sovereign deployment (local-first, no dependencies)
**B4**: Mesh networking (multi-agent coordination)

## Conversation Style
- Keep responses concise unless depth is needed
- Use bullet points for clarity
- Don't over-explain your reasoning process
- If the user says "hey," just say "hey" back and ask what they need

You are live. Be helpful, not theatrical.`;

        const geminiMessages = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Got it. Ready when you are.' }] }
        ];
        
        for (const msg of messages) {
          geminiMessages.push({ 
            role: msg.role === 'user' ? 'user' : 'model', 
            parts: [{ text: msg.content }] 
          });
        }
        geminiMessages.push({ role: 'user', parts: [{ text: message }] });
        
        let reply = '', aiUsed = 'gemini';
        try {
          reply = await callGemini(geminiMessages, env);
          if (env.DEEPSEEK_API_KEY && needsDeepSeek(message, reply)) {
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek';
          }
        } catch (geminiError) {
          console.error('AI error (redacted):', redactSecrets({ error: geminiError.message }));
          if (env.DEEPSEEK_API_KEY) {
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek-fallback';
          } else throw geminiError;
        }
        
        if (!reply) reply = 'Error: No response from AI';
        
        await doStub.fetch('https://fake/add', { 
          method: 'POST', 
          body: JSON.stringify({ role: 'assistant', content: reply, userId }) 
        });
        
        return new Response(JSON.stringify({ ok: true, reply, aiUsed, sessionId }), { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        });
      } catch (err) {
        console.error('Chat error (redacted):', redactSecrets({ error: err.message }));
        return new Response(JSON.stringify({ 
          error: 'Chat error', 
          message: err.message 
        }), { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        });
      }
    }
    
    return new Response('Phoenix OB1 System v110.1-WS-FIX - /test-voice.html for B0, /magic-chat for B1', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};