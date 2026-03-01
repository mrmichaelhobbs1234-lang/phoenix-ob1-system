// reincarnate.js - Phoenix OB1 System v1.3
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // B0: Return Deepgram API key for browser
    if (url.pathname === '/deepgram-key') {
      if (!env.DEEPGRAM_API_KEY) {
        return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      return new Response(JSON.stringify({ key: env.DEEPGRAM_API_KEY }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // B0: Voice test UI
    if (url.pathname === '/test-voice.html') {
      const html = await fetch('https://raw.githubusercontent.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/main/test-voice.html');
      return new Response(await html.text(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // DEBUG: Show what env keys exist
    if (url.pathname === '/debug-env') {
      const envKeys = Object.keys(env);
      return new Response(JSON.stringify({
        availableKeys: envKeys,
        hasGemini: 'GEMINI_API_KEY' in env,
        hasDeepseek: 'DEEPSEEK_API_KEY' in env,
        hasDeepgram: 'DEEPGRAM_API_KEY' in env,
        geminiValue: env.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.substring(0, 10)}...` : 'undefined',
        deepseekValue: env.DEEPSEEK_API_KEY ? `${env.DEEPSEEK_API_KEY.substring(0, 10)}...` : 'undefined',
        deepgramValue: env.DEEPGRAM_API_KEY ? `${env.DEEPGRAM_API_KEY.substring(0, 10)}...` : 'undefined'
      }, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        version: 'v1.3-b0-auto-config',
        gospel: '444',
        reality: 'C',
        benchmarks: {
          b0: env.DEEPGRAM_API_KEY ? 'operational' : 'missing-key',
          b1: 'operational',
          b2: 'pending',
          b3: 'pending',
          b4: 'pending'
        },
        ai: {
          gemini: env.GEMINI_API_KEY ? 'configured' : 'missing',
          deepseek: env.DEEPSEEK_API_KEY ? 'configured' : 'missing',
          deepgram: env.DEEPGRAM_API_KEY ? 'configured' : 'missing'
        },
        endpoints: {
          deepgramKey: '/deepgram-key (GET)',
          chat: '/chat (POST)',
          magicChat: '/magic-chat (UI)',
          testVoice: '/test-voice.html (UI)'
        },
        debug: 'Visit /debug-env to see environment keys'
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Magic Chat UI
    if (url.pathname === '/magic-chat' || url.pathname === '/') {
      const html = await fetch('https://raw.githubusercontent.com/mrmichaelhobbs1234-lang/phoenix-ob1-system/main/magic-chat.html');
      return new Response(await html.text(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Chat endpoint - Hybrid routing
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
        
        // Check API keys
        if (!env.GEMINI_API_KEY) {
          return new Response(JSON.stringify({
            error: 'GEMINI_API_KEY not configured',
            hint: 'Visit /debug-env to see what keys are available',
            envKeys: Object.keys(env)
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Get session
        const doId = env.SESSIONS.idFromName(sessionId);
        const doStub = env.SESSIONS.get(doId);
        
        // Get history
        const historyResp = await doStub.fetch('https://fake/history');
        const { messages } = await historyResp.json();
        
        // Add user message
        await doStub.fetch('https://fake/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: message })
        });
        
        // System prompt
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

        // Build message array
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
        
        geminiMessages.push({
          role: 'user',
          parts: [{ text: message }]
        });
        
        // Try Gemini first (free)
        let reply = '';
        let aiUsed = 'gemini';
        
        try {
          reply = await callGemini(geminiMessages, env);
          
          // Check if DeepSeek needed
          if (env.DEEPSEEK_API_KEY && needsDeepSeek(message, reply)) {
            console.log('Gemini weak response detected, routing to DeepSeek');
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek';
          }
        } catch (geminiError) {
          // Gemini failed, try DeepSeek if available
          if (env.DEEPSEEK_API_KEY) {
            console.log('Gemini failed, fallback to DeepSeek:', geminiError.message);
            reply = await callDeepSeek(geminiMessages, env);
            aiUsed = 'deepseek-fallback';
          } else {
            throw geminiError;
          }
        }
        
        if (!reply) {
          reply = 'Error: No response from AI';
        }
        
        // Save response
        await doStub.fetch('https://fake/add', {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: reply })
        });
        
        return new Response(JSON.stringify({
          ok: true,
          reply: reply,
          aiUsed: aiUsed,
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
    
    return new Response('Phoenix OB1 System - Use /magic-chat for B1, /test-voice.html for B0', { status: 404 });
  }
};