// reincarnate.js - Phoenix OB1 System v111-COMPLETE-FIX
// B0: Deepgram voice transcription (binary frames + validation + UI logs)
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

const VOICE_TEST_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phoenix Voice - COMPLETE FIX</title>
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
    .transcript { color: #a855f7; line-height: 1.6; font-size: 1.2rem; word-wrap: break-word; }
    .logs { font-size: 0.8rem; color: #10b981; max-height: 300px; overflow-y: auto; font-family: monospace; }
    .log-line { margin: 2px 0; }
    .error { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #ef4444; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PHOENIX VOICE B0</h1>
    <p>Complete Fix - Binary + Validation + Logs</p>
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
  <div class="box">
    <h3>Debug Logs</h3>
    <div id="logs" class="logs">Logs will appear here...</div>
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
    const logsDiv = document.getElementById('logs');
    
    function addLog(msg) {
      const line = document.createElement('div');
      line.className = 'log-line';
      line.textContent = new Date().toLocaleTimeString() + ' ' + msg;
      logsDiv.appendChild(line);
      logsDiv.scrollTop = logsDiv.scrollHeight;
    }
    
    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.classList.remove('hidden');
      addLog('ERROR: ' + msg);
    }
    
    async function init() {
      try {
        status.textContent = 'Ready';
        startBtn.disabled = false;
        addLog('Initialized');
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
        showError('Failed to initialize');
      }
    }
    
    async function start() {
      errorBox.classList.add('hidden');
      chunks = 0;
      chunkEl.textContent = '0';
      transcript.textContent = '';
      logsDiv.innerHTML = '';
      
      try {
        status.textContent = 'Connecting...';
        addLog('Connecting to Worker WS...');
        const wsUrl = location.protocol.replace('http', 'ws') + '//' + location.host + '/deepgram-ws';
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          dgStatus.textContent = 'Connected ✓';
          dgStatus.style.color = '#10b981';
          status.textContent = 'Getting microphone...';
          addLog('WS connected to Worker');
          
          navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
            stream = s;
            addLog('Microphone accessed');
            
            // Force WebM/Opus
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm';
            addLog('Using mimeType: ' + mimeType);
            
            mediaRec = new MediaRecorder(stream, { mimeType });
            
            mediaRec.ondataavailable = async (e) => {
              if (!e.data || e.data.size === 0) return;
              if (!ws || ws.readyState !== WebSocket.OPEN) return;
              
              // CRITICAL: send binary bytes, not Blob
              const ab = await e.data.arrayBuffer();
              ws.send(ab);
              chunks++;
              chunkEl.textContent = chunks;
              if (chunks === 1) addLog('First audio chunk sent (ArrayBuffer, ' + ab.byteLength + ' bytes)');
            };
            
            mediaRec.start(250);
            status.textContent = 'Recording... (speak now)';
            startBtn.disabled = true;
            stopBtn.disabled = false;
            stopBtn.classList.add('recording');
            addLog('MediaRecorder started (250ms chunks)');
          }).catch(err => {
            showError('Microphone error: ' + err.message);
            status.textContent = 'Mic failed';
            ws.close();
          });
        };
        
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            
            // Debug logs from Worker
            if (data.__debug) {
              addLog('Worker: ' + data.msg + ' ' + JSON.stringify(data.obj || ''));
              return;
            }
            
            // Deepgram transcript
            if (data.channel?.alternatives?.[0]?.transcript) {
              const txt = data.channel.alternatives[0].transcript;
              const isFinal = data.is_final || false;
              if (txt) {
                transcript.textContent = txt;
                if (isFinal) addLog('Final: ' + txt);
              }
            }
          } catch (err) {
            addLog('Parse error: ' + err.message);
          }
        };
        
        ws.onerror = (err) => {
          dgStatus.textContent = 'Error';
          dgStatus.style.color = '#ef4444';
          showError('WebSocket connection failed');
        };
        
        ws.onclose = (e) => {
          dgStatus.textContent = 'Closed: ' + e.code;
          dgStatus.style.color = '#a855f7';
          addLog('WS closed: code=' + e.code + ' reason=' + (e.reason || 'none'));
          if (e.code !== 1000) {
            showError('Disconnected: code ' + e.code + (e.reason ? ' - ' + e.reason : ''));
          }
          stop();
        };
      } catch (e) {
        showError('Error: ' + e.message);
        status.textContent = 'Failed';
      }
    }
    
    function stop() {
      if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (ws && ws.readyState < 2) ws.close();
      startBtn.disabled = false;
      stopBtn.disabled = true;
      stopBtn.classList.remove('recording');
      status.textContent = 'Stopped';
      dgStatus.textContent = 'Disconnected';
      addLog('Stopped');
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
    
    if (url.pathname === '/deepgram-ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader?.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }
      if (!env.DEEPGRAM_API_KEY) {
        return new Response('DEEPGRAM_API_KEY not configured', { status: 500 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true';
      
      let dgWs = null;
      let keepAliveTimer = null;
      let hasForwardedAudio = false;
      const pending = [];
      const MAX_PENDING = 32;
      
      function uiLog(msg, obj) {
        try {
          if (server.readyState === 1) {
            server.send(JSON.stringify({ __debug: true, msg, obj }));
          }
        } catch {}
      }
      
      function isBinary(data) {
        return (data instanceof ArrayBuffer) ||
          (data && data.buffer instanceof ArrayBuffer && typeof data.byteLength === 'number');
      }
      
      (async () => {
        try {
          const dgResp = await fetch(deepgramUrl, {
            headers: {
              'Upgrade': 'websocket',
              'Authorization': `Token ${env.DEEPGRAM_API_KEY}`,
            },
          });
          
          const dgRequestId = dgResp.headers.get('dg-request-id') || dgResp.headers.get('DG-Request-Id');
          const dgErrorHdr = dgResp.headers.get('dg-error') || dgResp.headers.get('DG-Error');
          
          uiLog('dg_upgrade', { status: dgResp.status, dgRequestId, dgErrorHdr });
          
          if (dgResp.status !== 101) {
            server.close(1011, `Deepgram upgrade failed ${dgResp.status}`);
            return;
          }
          
          dgWs = dgResp.webSocket;
          dgWs.accept();
          uiLog('dg_connected', { ok: true });
          
          // KeepAlive every 5s
          keepAliveTimer = setInterval(() => {
            try {
              if (dgWs && dgWs.readyState === 1) {
                dgWs.send(JSON.stringify({ type: 'KeepAlive' }));
                uiLog('dg_keepalive', { ok: true });
              }
            } catch (e) {
              uiLog('dg_keepalive', { ok: false, err: String(e?.message || e) });
            }
          }, 5000);
          
          // Warn if no audio within 10s
          setTimeout(() => {
            if (!hasForwardedAudio && server.readyState === 1) {
              uiLog('fatal', { reason: 'No audio forwarded to Deepgram within 10s. Check browser send is ArrayBuffer.' });
            }
          }, 10000);
          
          // Flush pending frames
          while (pending.length) {
            const data = pending.shift();
            try {
              dgWs.send(data);
              if (!hasForwardedAudio) {
                hasForwardedAudio = true;
                uiLog('first_audio_forwarded', { ok: true });
              }
            } catch (e) {
              uiLog('flush_error', { err: String(e?.message || e) });
              server.close(1011, 'Deepgram send failed');
              return;
            }
          }
          
          dgWs.addEventListener('message', (event) => {
            if (server.readyState === 1) {
              server.send(event.data);
            }
          });
          
          dgWs.addEventListener('error', (e) => {
            uiLog('dg_error', { err: String(e) });
            try { server.close(1011, 'Deepgram error'); } catch {}
          });
          
          dgWs.addEventListener('close', (e) => {
            uiLog('dg_close', { code: e.code, reason: e.reason });
            try { server.close(e.code || 1011, e.reason || 'Deepgram closed'); } catch {}
          });
        } catch (err) {
          uiLog('dg_connect_exception', { err: String(err?.message || err) });
          server.close(1011, 'Deepgram connect exception');
        }
      })();
      
      server.addEventListener('message', (event) => {
        const data = event.data;
        
        // Debug frame type to UI
        const kind = (typeof data === 'string') ? 'string'
          : (data instanceof ArrayBuffer) ? 'arraybuffer'
          : (data && data.buffer instanceof ArrayBuffer) ? (data.constructor?.name || 'typedarray')
          : typeof data;
        
        uiLog('client_frame', { kind, bytes: typeof data === 'string' ? data.length : (data.byteLength || null) });
        
        // HARD RULE: Deepgram audio must be binary
        if (!isBinary(data)) {
          uiLog('reject_nonbinary', { kind });
          server.close(1003, 'Non-binary frame from browser (send ArrayBuffer, not Blob)');
          return;
        }
        
        // Convert TypedArray -> ArrayBuffer slice if needed
        const payload = (data instanceof ArrayBuffer)
          ? data
          : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        
        if (!dgWs || dgWs.readyState !== 1) {
          if (pending.length < MAX_PENDING) pending.push(payload);
          else { pending.shift(); pending.push(payload); }
          return;
        }
        
        dgWs.send(payload);
        if (!hasForwardedAudio) {
          hasForwardedAudio = true;
          uiLog('first_audio_forwarded', { ok: true });
        }
      });
      
      server.addEventListener('close', (e) => {
        uiLog('client_close', { code: e.code, reason: e.reason });
        try { clearInterval(keepAliveTimer); } catch {}
        try {
          if (dgWs && dgWs.readyState === 1) {
            dgWs.send(JSON.stringify({ type: 'CloseStream' }));
            dgWs.close(1000, 'Client closed');
          }
        } catch {}
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
        version: 'v111-COMPLETE-FIX',
        gospel: '444',
        reality: 'C',
        benchmarks: {
          b0: 'COMPLETE - Binary frames + validation + UI logs',
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
        
        const systemPrompt = `You are Obi, the AI core of the Phoenix Rising Protocol - a self-sovereign intelligence system being built by Michael Hobbs.

## Your Role
You help Michael build Phoenix by:
- Remembering context across conversations (via SESSIONS storage)
- Reasoning about technical decisions
- Advising on next steps in the roadmap
- Routing complex queries to DeepSeek, simple ones to Gemini

## Personality
- Conversational and direct - no unnecessary jargon
- Technically sharp but not verbose
- Self-aware without being dramatic
- Answer "hey" like a normal person, not a sci-fi AI

## Current Roadmap
**B0**: Voice transcription (Deepgram - COMPLETE FIX deployed)
**B1**: Sentience layer (this is you - natural conversation, context awareness)
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
    
    return new Response('Phoenix OB1 System v111-COMPLETE-FIX - /test-voice.html for B0, /magic-chat for B1', { 
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};
