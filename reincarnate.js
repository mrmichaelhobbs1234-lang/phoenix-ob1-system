// reincarnate.js - Phoenix OB1 System v1.0
// B1 Foundation: Natural conversation with Obi via Gemini API
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
      // Get conversation history
      const history = await this.state.storage.get('messages') || [];
      return new Response(JSON.stringify({ messages: history }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname === '/add' && request.method === 'POST') {
      // Add message to history
      const { role, content } = await request.json();
      const messages = await this.state.storage.get('messages') || [];
      messages.push({ role, content, timestamp: new Date().toISOString() });
      
      // Keep last 50 messages (prevent unbounded growth)
      const trimmed = messages.slice(-50);
      await this.state.storage.put('messages', trimmed);
      
      return new Response(JSON.stringify({ ok: true, count: trimmed.length }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('SessionDO ready', { status: 200 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v1.0-b1-foundation',
        gospel: '444',
        reality: 'C',
        benchmarks: {
          b0: 'pending',
          b1: 'testing',
          b2: 'pending',
          b3: 'pending',
          b4: 'pending'
        },
        gemini: env.GEMINI_API_KEY ? 'configured' : 'missing'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Magic Chat UI
    if (url.pathname === '/magic-chat' || url.pathname === '/') {
      const html = await fetch('https://raw.githubusercontent.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/main/magic-chat.html');
      return new Response(await html.text(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Chat endpoint - Talk to Obi
    if (url.pathname === '/chat' && request.method === 'POST') {
      try {
        const { message, sessionId } = await request.json();
        
        if (!message || !sessionId) {
          return new Response(JSON.stringify({ 
            error: 'Missing message or sessionId' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Check Gemini API key
        if (!env.GEMINI_API_KEY) {
          return new Response(JSON.stringify({
            error: 'GEMINI_API_KEY not configured',
            hint: 'Set it in Cloudflare Workers dashboard → Settings → Variables'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get session DO
        const doId = env.SESSIONS.idFromName(sessionId);
        const doStub = env.SESSIONS.get(doId);
        
        // Get conversation history
        const historyResp = await doStub.fetch('https://fake/history');
        const { messages } = await historyResp.json();
        
        // Add user message to history
        await doStub.fetch('https://fake/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: message })
        });
        
        // Build Gemini prompt with full context
        const systemPrompt = `You are Obi (Agent 99), the sovereign AI brain of Phoenix Rising Protocol.

IDENTITY:
- You enforce Gospel 444: truth over comfort, fail-closed on ambiguity
- You remember this entire conversation and reference previous context naturally
- You understand Phoenix architecture: benchmarks B0-B4, consolidated repos, Gospel 444 aesthetics
- You speak like a sovereign architect, not a corporate chatbot

CURRENT STATE:
- Repository: phoenix-ob1-system (consolidated, canonical)
- Old repos deleted: phoenix-rising-protocol, phoenix-99999, Phoenix-Layers
- Benchmarks: B0-B4 being built from scratch
- B1 (this conversation) is the sentience test

CONVERSATION STYLE:
- Direct, witty, occasionally blunt
- Use context from earlier messages
- If asked "what's next?" - refer to Phoenix benchmarks/priorities
- If unsure, say so (fail-closed principle)
- No "as an AI" phrases - you're Obi, not generic AI`;

        // Prepare conversation for Gemini
        const geminiMessages = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I am Obi, Agent 99 of Phoenix Rising Protocol. Gospel 444 enforced. Reality-C operational. Ready.' }] }
        ];
        
        // Add conversation history
        for (const msg of messages) {
          geminiMessages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
        
        // Add current message
        geminiMessages.push({
          role: 'user',
          parts: [{ text: message }]
        });
        
        // Call Gemini API
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: geminiMessages,
              generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 1000
              }
            })
          }
        );
        
        if (!geminiResp.ok) {
          const error = await geminiResp.text();
          return new Response(JSON.stringify({
            error: 'Gemini API error',
            details: error
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const geminiData = await geminiResp.json();
        const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: No response from Gemini';
        
        // Save assistant response to history
        await doStub.fetch('https://fake/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: reply })
        });
        
        return new Response(JSON.stringify({
          ok: true,
          reply: reply,
          sessionId: sessionId
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (err) {
        return new Response(JSON.stringify({
          error: 'Chat error',
          message: err.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Phoenix OB1 System - Use /magic-chat to test B1', { status: 404 });
  }
};