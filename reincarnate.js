// reincarnate.js - Phoenix OB1 System v1.4-B0-LIVE
// B0: Deepgram voice transcription (browser direct)
// B1: Hybrid AI routing (Gemini free + DeepSeek precision)
// Gospel 444: #0f0f1a (void), #a855f7 (soul), #f59e0b (gold) - NO BLUE
// Fail-closed. Reality-C. Agent 99.

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
      const { role, content } = await request.json();
      const messages = await this.state.storage.get('messages') || [];
      messages.push({ role, content, timestamp: new Date().toISOString() });
      const trimmed = messages.slice(-50);
      await this.state.storage.put('messages', trimmed);
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('SessionDO ready', { status: 200 });
  }
}

// Detect if response needs DeepSeek fallback
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

// Call Gemini API
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

// Call DeepSeek API
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>B0 Voice Test - Phoenix OB1</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'SF Mono', 'Monaco', 'Courier New', monospace; background: #0f0f1a; color: #a855f7; min-height: 100vh; padding: 2rem; display: flex; flex-direction: column; align-items: center; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; color: #f59e0b; margin-bottom: 0.5rem; }
    .header p { color: #a855f7; font-size: 0.9rem; }
    .status { background: rgba(168, 85, 247, 0.1); border: 1px solid #a855f7; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; width: 100%; max-width: 600px; }
    .status-item { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem; }
    .status-item:last-child { margin-bottom: 0; }
    .status-value { color: #f59e0b; font-weight: bold; }
    .controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
    button { background: #a855f7; color: #0f0f1a; border: none; border-radius: 6px; padding: 1rem 2rem; font-size: 1rem; font-weight: bold; cursor: pointer; font-family: inherit; transition: all 0.2s; }
    button:hover:not(:disabled) { background: #f59e0b; transform: translateY(-2px); }
    button:disabled { background: rgba(168, 85, 247, 0.3); cursor: not-allowed; transform: none; }
    button.recording { background: #ef4444; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .transcripts { width: 100%; max-width: 600px; }
    .transcript-box { background: rgba(168, 85, 247, 0.05); border: 1px solid #a855f7; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; min-height: 100px; }
    .transcript-box h3 { color: #f59e0b; font-size: 0.9rem; margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 1px; }
    .transcript-text { color: #a855f7; line-height: 1.6; font-size: 0.95rem; }
    .transcript-text.interim { opacity: 0.6; font-style: italic; }
    .obi-response { background: rgba(245, 158, 11, 0.1); border: 1px solid #f59e0b; color: #f59e0b; }
    .error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; width: 100%; max-width: 600px; }
    .hidden { display: none; }
    .footer { margin-top: 2rem; text-align: center; color: rgba(168, 85, 247, 0.5); font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>B0 VOICE TEST</h1>
    <p>Phoenix OB1 System • Voice to Obi • v1.4-EMBEDDED</p>
  </div>
  <div class="status">
    <div class="status-item"><span>Config:</span><span class="status-value" id="config-status">Loading...</span></div>
    <div class="status-item"><span>Deepgram:</span><span class="status-value" id="dg-status">Not connected</span></div>
    <div class="status-item"><span>Microphone:</span><span class="status-value" id="mic-status">Not started</span></div>
    <div class="status-item"><span>Obi (B1):</span><span class="status-value" id="obi-status">Ready</span></div>
  </div>
  <div id="error-box" class="error hidden"></div>
  <div class="controls">
    <button id="start-btn" disabled>Start Recording</button>
    <button id="stop-btn" disabled>Stop Recording</button>
  </div>
  <div class="transcripts">
    <div class="transcript-box"><h3>Live Transcription (Deepgram)</h3><div id="transcript" class="transcript-text">Speak to see transcription...</div></div>
    <div class="transcript-box obi-response"><h3>Obi Response (B1)</h3><div id="obi-response" class="transcript-text">Waiting for voice input...</div></div>
  </div>
  <div class="footer">Gospel 444 • Reality-C • v1.4-EMBEDDED<br>Browser → Deepgram (B0) → Worker /chat (B1)</div>
  <script>
    const workerUrl = window.location.origin;
    let deepgramApiKey = null, deepgramWs = null, mediaRecorder = null, audioStream = null;
    const configStatus = document.getElementById('config-status'), startBtn = document.getElementById('start-btn'), stopBtn = document.getElementById('stop-btn');
    const dgStatus = document.getElementById('dg-status'), micStatus = document.getElementById('mic-status'), obiStatus = document.getElementById('obi-status');
    const transcriptEl = document.getElementById('transcript'), obiResponseEl = document.getElementById('obi-response'), errorBox = document.getElementById('error-box');
    function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }
    function hideError() { errorBox.classList.add('hidden'); }
    async function loadConfig() {
      try {
        const res = await fetch(workerUrl + '/deepgram-key');
        if (!res.ok) throw new Error('Failed to fetch key');
        deepgramApiKey = (await res.json()).key;
        configStatus.textContent = 'Ready'; configStatus.style.color = '#10b981'; startBtn.disabled = false;
      } catch (err) { configStatus.textContent = 'Error'; configStatus.style.color = '#ef4444'; showError('Config load failed'); }
    }
    async function startRecording() {
      hideError();
      if (!deepgramApiKey) { showError('Key not loaded'); return; }
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStatus.textContent = 'Active'; micStatus.style.color = '#10b981';
        const dgUrl = \`wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&token=\${deepgramApiKey}\`;
        deepgramWs = new WebSocket(dgUrl);
        deepgramWs.onopen = () => { dgStatus.textContent = 'Connected'; dgStatus.style.color = '#10b981'; };
        deepgramWs.onmessage = async (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.channel?.alternatives?.[0]?.transcript) {
              const txt = data.channel.alternatives[0].transcript, isFinal = data.is_final || false;
              transcriptEl.textContent = txt; transcriptEl.className = isFinal ? 'transcript-text' : 'transcript-text interim';
              if (isFinal && txt.trim()) {
                obiStatus.textContent = 'Processing...'; obiStatus.style.color = '#f59e0b';
                try {
                  const chatRes = await fetch(workerUrl + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt, sessionId: 'voice-session' }) });
                  if (chatRes.ok) { const d = await chatRes.json(); obiResponseEl.textContent = d.reply; obiStatus.textContent = \`Ready (\${d.aiUsed})\`; obiStatus.style.color = '#10b981'; }
                  else { obiStatus.textContent = 'Error'; obiStatus.style.color = '#ef4444'; }
                } catch { obiStatus.textContent = 'Error'; obiStatus.style.color = '#ef4444'; }
              }
            }
          } catch (err) { console.error('Parse error:', err); }
        };
        deepgramWs.onerror = () => { showError('Deepgram connection failed'); dgStatus.textContent = 'Error'; dgStatus.style.color = '#ef4444'; };
        deepgramWs.onclose = (e) => { dgStatus.textContent = 'Disconnected'; dgStatus.style.color = '#a855f7'; if (e.code !== 1000) showError(\`Disconnected: \${e.code}\`); };
        mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0 && deepgramWs?.readyState === 1) deepgramWs.send(e.data); };
        mediaRecorder.start(250);
        startBtn.disabled = true; stopBtn.disabled = false; stopBtn.classList.add('recording');
      } catch (err) { showError('Mic denied: ' + err.message); micStatus.textContent = 'Error'; micStatus.style.color = '#ef4444'; }
    }
    function stopRecording() {
      if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
      if (audioStream) { audioStream.getTracks().forEach(t => t.stop()); audioStream = null; }
      if (deepgramWs) { deepgramWs.close(); deepgramWs = null; }
      micStatus.textContent = 'Stopped'; micStatus.style.color = '#a855f7'; dgStatus.textContent = 'Disconnected'; dgStatus.style.color = '#a855f7';
      startBtn.disabled = false; stopBtn.disabled = true; stopBtn.classList.remove('recording');
    }
    startBtn.addEventListener('click', startRecording); stopBtn.addEventListener('click', stopRecording); loadConfig();
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // B0: Return Deepgram API key for browser
    if (url.pathname === '/deepgram-key') {
      if (!env.DEEPGRAM_API_KEY) {
        return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response(JSON.stringify({ key: env.DEEPGRAM_API_KEY }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // B0: Voice test UI - EMBEDDED, no external fetch
    if (url.pathname === '/test-voice.html') {
      return new Response(VOICE_TEST_HTML, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' }
      });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v1.4-B0-LIVE-EMBEDDED',
        gospel: '444',
        reality: 'C',
        benchmarks: {
          b0: env.DEEPGRAM_API_KEY ? 'LIVE-EMBEDDED' : 'missing-key',
          b1: 'operational',
          b2: 'pending', b3: 'pending', b4: 'pending'
        },
        ai: {
          gemini: env.GEMINI_API_KEY ? 'configured' : 'missing',
          deepseek: env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
          deepgram: env.DEEPGRAM_API_KEY ? 'configured' : 'missing'
        }
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    
    // Magic Chat UI
    if (url.pathname === '/magic-chat' || url.pathname === '/') {
      const html = await fetch('https://raw.githubusercontent.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/main/magic-chat.html');
      return new Response(await html.text(), { headers: { 'Content-Type': 'text/html' } });
    }
    
    // Chat endpoint
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { message, sessionId } = await request.json();
        if (!message || !sessionId) return new Response(JSON.stringify({ error: 'Missing message or sessionId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        if (!env.GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        
        const doId = env.SESSIONS.idFromName(sessionId);
        const doStub = env.SESSIONS.get(doId);
        const historyResp = await doStub.fetch('https://fake/history');
        const { messages } = await historyResp.json();
        await doStub.fetch('https://fake/add', { method: 'POST', body: JSON.stringify({ role: 'user', content: message }) });
        
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
**B0**: Voice transcription (Deepgram direct from browser - LIVE)
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
        for (const msg of messages) geminiMessages.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
        geminiMessages.push({ role: 'user', parts: [{ text: message }] });
        
        let reply = '', aiUsed = 'gemini';
        try {
          reply = await callGemini(geminiMessages, env);
          if (env.DEEPSEEK_API_KEY && needsDeepSeek(message, reply)) {
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek';
          }
        } catch (geminiError) {
          if (env.DEEPSEEK_API_KEY) {
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek-fallback';
          } else throw geminiError;
        }
        if (!reply) reply = 'Error: No response from AI';
        await doStub.fetch('https://fake/add', { method: 'POST', body: JSON.stringify({ role: 'assistant', content: reply }) });
        return new Response(JSON.stringify({ ok: true, reply, aiUsed, sessionId }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Chat error', message: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    return new Response('Phoenix OB1 System - /magic-chat for B1, /test-voice.html for B0', { status: 404 });
  }
};