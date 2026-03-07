var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// reincarnate.js
var rateLimits = /* @__PURE__ */ new Map();
function checkRateLimit(sessionId) {
  const now = Date.now();
  const key = "chat:" + sessionId;
  const limit = rateLimits.get(key) || { count: 0, resetAt: now + 6e4 };
  if (now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (limit.count >= 10) return false;
  limit.count++;
  rateLimits.set(key, limit);
  return true;
}
__name(checkRateLimit, "checkRateLimit");
function redactSecrets(obj) {
  const redacted = JSON.parse(JSON.stringify(obj));
  const sensitiveKeys = ["key", "token", "password", "secret", "apikey", "api_key"];
  function walk(o) {
    for (let k in o) {
      if (typeof o[k] === "string" && sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        o[k] = "[REDACTED]";
      } else if (typeof o[k] === "object" && o[k] !== null) {
        walk(o[k]);
      }
    }
  }
  __name(walk, "walk");
  walk(redacted);
  return redacted;
}
__name(redactSecrets, "redactSecrets");
async function sha256(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
function norm(s) {
  return (s || "").trim().toLowerCase();
}
__name(norm, "norm");
function isGreeting(msg) {
  const m = norm(msg);
  if (!m) return false;
  const exact = /* @__PURE__ */ new Set(["hi", "hey", "hello", "yo", "sup", "hiya"]);
  if (exact.has(m)) return true;
  if (m.length <= 12 && (m === "hi obi" || m === "hey obi" || m === "hello obi")) return true;
  return false;
}
__name(isGreeting, "isGreeting");
function isExplicitMineCommand(msg) {
  const m = norm(msg);
  if (!m.includes("mine")) return false;
  if (/\bmine\s+(is|was|has|been)\b/.test(m) || /that['']?s\s+mine/.test(m)) return false;
  return /(logs?|chat|knowledge|kb|history|files?)/.test(m) || /(refresh|reload)\s+(knowledge|kb|knowledge base)/.test(m);
}
__name(isExplicitMineCommand, "isExplicitMineCommand");
function isMiningMetaSummaryRequest(msg) {
  const m = norm(msg);
  return m.includes("what did you learn") || m.includes("what did you find") || m.includes("what did you see") || m.includes("summary of mining") || m.includes("summary of the files") || /from the \d+\s*(files?|logs?)/.test(m);
}
__name(isMiningMetaSummaryRequest, "isMiningMetaSummaryRequest");
function isQuestionLike(msg) {
  const m = (msg || "").trim();
  if (!m) return false;
  if (m.endsWith("?")) return true;
  return /\b(what|why|how|when|where|who|which)\b/i.test(m);
}
__name(isQuestionLike, "isQuestionLike");
function isLogRecallRequest(msg) {
  const m = norm(msg);
  return /(last time|yesterday|previous|earlier|in our past|search the logs|check the logs|look up in the logs|in our chat history|from our chats)/.test(m);
}
__name(isLogRecallRequest, "isLogRecallRequest");
function isRageSignal(msg) {
  const m = norm(msg);
  return /\b(stop|fuck|fucking|dude|shit|wtf|jesus)\b/i.test(msg) && msg.length < 100;
}
__name(isRageSignal, "isRageSignal");
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  const aWords = new Set(aLower.split(/\s+/));
  const bWords = new Set(bLower.split(/\s+/));
  const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
  const union = /* @__PURE__ */ new Set([...aWords, ...bWords]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
__name(stringSimilarity, "stringSimilarity");
async function kbGetMeta(sessionId, env) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    const resp = await doStub.fetch("https://fake/knowledge/get");
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
__name(kbGetMeta, "kbGetMeta");
async function kbGetExamples(sessionId, env) {
  try {
    const doId = env.SESSIONS.idFromName(sessionId);
    const doStub = env.SESSIONS.get(doId);
    const resp = await doStub.fetch("https://fake/knowledge/search?q=summary");
    if (!resp.ok) return [];
    const data = await resp.json();
    const results = data?.results || data?.matches || [];
    const ex = results.slice(0, 3).map(
      (r) => r.snippet || r.preview || r.title || (typeof r === "string" ? r : "")
    ).filter(Boolean);
    while (ex.length < 3) ex.push("(none)");
    return ex.slice(0, 3);
  } catch {
    return ["(none)", "(none)", "(none)"];
  }
}
__name(kbGetExamples, "kbGetExamples");
function extractActionableEvents(filename, content) {
  const events = {
    decisions: [],
    benchmarks: [],
    code: [],
    architecture: [],
    pedagogy: { vocab: [], idioms: [], slang: [], games: [] }
  };
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const original = lines[i];
    if (line.includes("decided") || line.includes("decision") || line.includes("we should")) {
      events.decisions.push({ line: i, text: original.slice(0, 200) });
    }
    if (line.match(/b[0-5]|benchmark/i)) {
      events.benchmarks.push({ line: i, text: original.slice(0, 200) });
    }
    if (line.includes("function") || line.includes("class") || line.includes("const ") || line.includes("async")) {
      events.code.push({ line: i, text: original.slice(0, 200) });
    }
    if (line.includes("architecture") || line.includes("system") || line.includes("protocol")) {
      events.architecture.push({ line: i, text: original.slice(0, 200) });
    }
    if (line.includes("soul") || line.includes("dna")) {
      events.pedagogy.vocab.push({ line: i, text: original.slice(0, 200) });
    }
  }
  return events;
}
__name(extractActionableEvents, "extractActionableEvents");
function buildLayer(index, type, content, source) {
  return {
    id: `L${String(index).padStart(4, "0")}`,
    type,
    content,
    source,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    hash: null
  };
}
__name(buildLayer, "buildLayer");
var SessionDO = class {
  static {
    __name(this, "SessionDO");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/history") {
      const history = await this.state.storage.get("messages") || [];
      return new Response(JSON.stringify({ messages: history }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/knowledge/get") {
      const meta = await this.state.storage.get("knowledge:meta") || { fileCount: 0, layerCount: 0, lastMined: null };
      return new Response(JSON.stringify(meta), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/knowledge/files") {
      const meta = await this.state.storage.get("knowledge:meta") || { files: [] };
      const fileNames = meta.files || [];
      return new Response(JSON.stringify({ files: fileNames }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/knowledge/search") {
      const params = new URL(request.url).searchParams;
      const query = params.get("q");
      if (!query) {
        return new Response(JSON.stringify({ error: "Missing query" }), { status: 400 });
      }
      const meta = await this.state.storage.get("knowledge:meta") || { files: [] };
      const fileNames = meta.files || [];
      const results = [];
      const queryLower = query.toLowerCase();
      for (const fileName of fileNames) {
        const content = await this.state.storage.get(`file:${fileName}`);
        if (!content) continue;
        const lines = content.split("\n");
        const matches = lines.filter((line) => line.toLowerCase().includes(queryLower));
        if (matches.length > 0) {
          results.push({
            file: fileName,
            snippets: matches.slice(0, 5).map((s) => s.trim())
          });
        }
        if (results.length >= 10) break;
      }
      const layerMatches = [];
      const layerChunks = meta.layerChunks || 0;
      for (let i = 0; i < layerChunks; i++) {
        const chunk = await this.state.storage.get(`layers:chunk:${i}`);
        if (!chunk) continue;
        const matches = chunk.filter((layer) => layer.content.toLowerCase().includes(queryLower));
        layerMatches.push(...matches);
        if (layerMatches.length >= 5) break;
      }
      return new Response(JSON.stringify({
        found: results.length > 0 || layerMatches.length > 0,
        results,
        layers: layerMatches.slice(0, 5)
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/knowledge/set" && request.method === "POST") {
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
        await this.state.storage.put("knowledge:meta", meta);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/verify") {
      const messages = await this.state.storage.get("messages") || [];
      const ledger = await this.state.storage.get("ledger") || [];
      let valid = true;
      let invalidIndex = -1;
      for (let i = 0; i < ledger.length; i++) {
        const entry = ledger[i];
        const prevHash = i === 0 ? "0" : ledger[i - 1].hash;
        const data = prevHash + entry.role + entry.content + entry.timestamp;
        const expectedHash = await sha256(data);
        if (entry.hash !== expectedHash) {
          valid = false;
          invalidIndex = i;
          break;
        }
      }
      return new Response(JSON.stringify({
        valid,
        ledgerLength: ledger.length,
        messagesLength: messages.length,
        invalidIndex,
        status: valid ? "VERIFIED" : "TAMPERED"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/add" && request.method === "POST") {
      const { role, content, userId } = await request.json();
      const messages = await this.state.storage.get("messages") || [];
      const ledger = await this.state.storage.get("ledger") || [];
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const prevHash = ledger.length === 0 ? "0" : ledger[ledger.length - 1].hash;
      const data = prevHash + role + content + timestamp;
      const hash = await sha256(data);
      messages.push({
        role,
        content,
        userId: userId || "anonymous",
        timestamp
      });
      ledger.push({
        role,
        content,
        timestamp,
        hash,
        prevHash
      });
      const trimmedMessages = messages.slice(-50);
      const trimmedLedger = ledger.slice(-50);
      await this.state.storage.put("messages", trimmedMessages);
      await this.state.storage.put("ledger", trimmedLedger);
      return new Response(JSON.stringify({
        ok: true,
        count: trimmedMessages.length,
        hash,
        ledgerSize: trimmedLedger.length
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response("SessionDO ready", { status: 200 });
  }
};

var StudentProfileDO = class {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/profile/get") {
      const studentId = url.searchParams.get("student_id");
      const profile = await this.state.storage.get("profile:" + studentId) || null;
      if (!profile) return new Response(JSON.stringify(null), { status: 404, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify(profile), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === "/profile/create" && request.method === "POST") {
      const { studentId, name, age, region, goals, hobbies } = await request.json();
      const profile = { studentId, name, age, region, goals, hobbies, weak_phonemes: "[]", strong_phonemes: "[]", session_count: 0, total_minutes: 0, last_session: null, onboarding_complete: 0, created_at: new Date().toISOString() };
      await this.state.storage.put("profile:" + studentId, profile);
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }
    if (url.pathname === "/profile/seal" && request.method === "POST") {
      const { studentId } = await request.json();
      const profile = await this.state.storage.get("profile:" + studentId);
      if (profile) { profile.onboarding_complete = 1; await this.state.storage.put("profile:" + studentId, profile); }
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("StudentProfileDO ready", { status: 200 });
  }
};
__name(StudentProfileDO, "StudentProfileDO");

function needsDeepSeek(message, geminiReply) {
  const triggers = [
    /what is|define|explain|tell me about/i,
    /soul|dna|protocol|benchmark/i,
    /code|function|algorithm|debug|error|syntax/i,
    /analyze|architecture|design pattern/i,
    /drift|ledger|merkle/i,
    /search|find|look for/i
  ];
  const isTechnical = triggers.some((regex) => regex.test(message));
  const weakResponse = [
    /as an ai/i,
    /i'm not sure/i,
    /i don't have enough/i,
    /i cannot/i,
    /from conversation/i
  ].some((regex) => regex.test(geminiReply));
  return isTechnical || weakResponse;
}
__name(needsDeepSeek, "needsDeepSeek");
async function callGemini(messages, env, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1e3
          }
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.text();
      throw new Error("Gemini error: " + error);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Gemini timeout after " + timeoutMs + "ms");
    }
    throw err;
  }
}
__name(callGemini, "callGemini");
async function callDeepSeek(messages, env, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const deepseekMessages = messages.map((m) => ({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.parts?.[0]?.text || m.content
    }));
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.DEEPSEEK_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: deepseekMessages,
        temperature: 0.6,
        max_tokens: 1500
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.text();
      throw new Error("DeepSeek error: " + error);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("DeepSeek timeout after " + timeoutMs + "ms");
    }
    throw err;
  }
}
__name(callDeepSeek, "callDeepSeek");
async function mineKnowledgeBase(sessionId, env) {
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  const metaResp = await doStub.fetch("https://fake/knowledge/get");
  const existing = await metaResp.json();
  if (existing.fileCount && existing.fileCount > 0) {
    return { cached: true, count: existing.fileCount, layers: existing.layerCount || 0 };
  }
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not configured");
  }
  const repoUrl = "https://api.github.com/repos/mrmichaelhobbs1234-lang/phoenix-chat-logs/contents/CHAT-LOGS-ONLY";
  const listResp = await fetch(repoUrl, {
    headers: {
      "Authorization": "token " + env.GITHUB_TOKEN,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Phoenix-OB1"
    }
  });
  if (!listResp.ok) {
    throw new Error("GitHub API " + listResp.status);
  }
  const files = await listResp.json();
  const txtFiles = files.filter((f) => f.name.endsWith(".txt") && f.type === "file");
  const maxFiles = Math.min(500, txtFiles.length);
  const fileNames = [];
  const allLayers = [];
  let layerIndex = 0;
  for (let i = 0; i < maxFiles; i++) {
    const file = txtFiles[i];
    try {
      const contentResp = await fetch(file.download_url, {
        headers: {
          "Authorization": "token " + env.GITHUB_TOKEN,
          "User-Agent": "Phoenix-OB1"
        }
      });
      if (contentResp.ok) {
        const text = await contentResp.text();
        const truncated = text.slice(0, 5e4);
        await doStub.fetch("https://fake/knowledge/set", {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, content: truncated })
        });
        fileNames.push(file.name);
        const events = extractActionableEvents(file.name, truncated);
        if (events.decisions.length > 0) {
          for (const dec of events.decisions.slice(0, 3)) {
            allLayers.push(buildLayer(layerIndex++, "decision", dec.text, file.name));
          }
        }
        if (events.benchmarks.length > 0) {
          for (const bm of events.benchmarks.slice(0, 3)) {
            allLayers.push(buildLayer(layerIndex++, "benchmark", bm.text, file.name));
          }
        }
        if (events.architecture.length > 0) {
          for (const arch of events.architecture.slice(0, 2)) {
            allLayers.push(buildLayer(layerIndex++, "architecture", arch.text, file.name));
          }
        }
        if (events.pedagogy.vocab.length > 0) {
          for (const vocab of events.pedagogy.vocab.slice(0, 2)) {
            allLayers.push(buildLayer(layerIndex++, "vocab", vocab.text, file.name));
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch", file.name);
    }
    if (allLayers.length >= 200) break;
  }
  for (let i = 0; i < allLayers.length; i++) {
    allLayers[i].hash = await sha256(allLayers[i].id + allLayers[i].type + allLayers[i].content);
  }
  const chunkSize = 50;
  for (let i = 0; i < allLayers.length; i += chunkSize) {
    const chunk = allLayers.slice(i, i + chunkSize);
    await doStub.fetch("https://fake/knowledge/set", {
      method: "POST",
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
    lastMined: (/* @__PURE__ */ new Date()).toISOString(),
    totalFiles: txtFiles.length
  };
  await doStub.fetch("https://fake/knowledge/set", {
    method: "POST",
    body: JSON.stringify({ meta })
  });
  return { cached: false, count: fileNames.length, total: txtFiles.length, layers: allLayers.length };
}
__name(mineKnowledgeBase, "mineKnowledgeBase");
async function queryKnowledgeBase(query, sessionId, env) {
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  const metaResp = await doStub.fetch("https://fake/knowledge/get");
  const meta = await metaResp.json();
  if (!meta.fileCount || meta.fileCount === 0) {
    return { found: false, message: "No knowledge mined yet." };
  }
  const searchResp = await doStub.fetch(`https://fake/knowledge/search?q=${encodeURIComponent(query)}`);
  const searchData = await searchResp.json();
  return {
    found: searchData.found,
    query,
    results: searchData.results || [],
    layers: searchData.layers || [],
    searchedFiles: meta.fileCount,
    searchedLayers: meta.layerCount || 0
  };
}
__name(queryKnowledgeBase, "queryKnowledgeBase");
async function processChatMessage(message, sessionId, env) {
  if (!message || !sessionId) {
    throw new Error("Missing message or sessionId");
  }
  
  let studentContext = '';
  try {
    const cookies = env.__cookies || {};
    const studentId = cookies.phoenix_student_id;
    if (studentId && env.STUDENT_PROFILES) {
      const profileDoId = env.STUDENT_PROFILES.idFromName(studentId);
      const profileStub = env.STUDENT_PROFILES.get(profileDoId);
      const profileResp = await profileStub.fetch('https://fake/profile/get?student_id=' + studentId);
      if (profileResp.ok) {
        const profile = await profileResp.json();
        if (profile) {
          const weakPhonemes = JSON.parse(profile.weak_phonemes || '[]').join(', ') || 'none yet';
          const strongPhonemes = JSON.parse(profile.strong_phonemes || '[]').join(', ') || 'none yet';
          studentContext = '\n\n## STUDENT CONTEXT\nName: ' + profile.name + '\nAge: ' + profile.age + ', Region: ' + profile.region + '\nLevel: ' + profile.level + '/10\nGoals: ' + (profile.goals || 'not specified') + '\nWeak phonemes: [' + weakPhonemes + ']\nStrong phonemes: [' + strongPhonemes + ']\nSessions completed: ' + profile.session_count + '\nTotal practice time: ' + profile.total_minutes + ' minutes\nLast session: ' + (profile.last_session || 'never') + '\n';
        }
      }
    }
  } catch (err) {}
  
  if (isRageSignal(message)) {
    return { reply: "System failure detected. What specifically broke?", aiUsed: "system" };
  }
  if (isGreeting(message)) {
    return { reply: "Hi. I'm here. What do you need?", aiUsed: "system" };
  }
  if (!checkRateLimit(sessionId)) {
    return { reply: "Rate limit: 10 msg/min", aiUsed: "error" };
  }
  if (!env.GEMINI_API_KEY) {
    return { reply: "GEMINI_API_KEY missing", aiUsed: "error" };
  }
  const doId = env.SESSIONS.idFromName(sessionId);
  const doStub = env.SESSIONS.get(doId);
  const historyResp = await doStub.fetch("https://fake/history");
  const { messages } = await historyResp.json();
  const userId = "sovereign";
  await doStub.fetch("https://fake/add", {
    method: "POST",
    body: JSON.stringify({ role: "user", content: message, userId })
  });
  let specialAction = null;
  if (isExplicitMineCommand(message)) {
    try {
      const mineResult = await mineKnowledgeBase(sessionId, env);
      if (mineResult.cached) {
        specialAction = `Already mined. ${mineResult.count} files, ${mineResult.layers} layers loaded.`;
      } else {
        specialAction = `Mining complete. ${mineResult.count}/${mineResult.total} files loaded, ${mineResult.layers} layers extracted.`;
      }
    } catch (err) {
      specialAction = `Mining failed: ${err.message}`;
    }
  }
  if (message.toLowerCase().includes("verify") && (message.toLowerCase().includes("ledger") || message.toLowerCase().includes("integrity"))) {
    const verifyResp = await doStub.fetch("https://fake/verify");
    const verifyData = await verifyResp.json();
    if (verifyData.valid) {
      specialAction = `Ledger verified. ${verifyData.ledgerLength} entries valid.`;
    } else {
      specialAction = `⚠️ LEDGER TAMPERED at index ${verifyData.invalidIndex}`;
    }
  }
  const meta = await kbGetMeta(sessionId, env);
  if (isMiningMetaSummaryRequest(message)) {
    if (!meta || !meta.fileCount) {
      return { reply: "No knowledge base loaded. Ask me to mine the logs first.", aiUsed: "system" };
    }
    const ex = await kbGetExamples(sessionId, env);
    return {
      reply: `Mined: ${meta.fileCount} files, ${meta.layerCount || 0} layers.\nExamples:\n- ${ex[0]}\n- ${ex[1]}\n- ${ex[2]}`,
      aiUsed: "system"
    };
  }
  if ((!meta || !meta.fileCount) && isLogRecallRequest(message)) {
    return { reply: "No knowledge base loaded. Ask me to mine the logs first.", aiUsed: "system" };
  }
  let contextAddition = "";
  let knowledgeStatus = "";
  if (meta && meta.fileCount && isQuestionLike(message)) {
    knowledgeStatus = `KB: ${meta.fileCount} files, ${meta.layerCount} layers`;
    const queryResult = await queryKnowledgeBase(message, sessionId, env);
    if (queryResult.found) {
      contextAddition = "\n\n[VERIFIED KB]\n";
      contextAddition += `Searched ${meta.fileCount} files, ${meta.layerCount} layers.\n\n`;
      if (queryResult.layers && queryResult.layers.length > 0) {
        contextAddition += "LAYERS:\n";
        for (const layer of queryResult.layers.slice(0, 3)) {
          contextAddition += `${layer.id} (${layer.type}) from ${layer.source}:\n${layer.content}\n\n`;
        }
      }
      if (queryResult.results && queryResult.results.length > 0) {
        contextAddition += "FILES:\n";
        for (const res of queryResult.results.slice(0, 3)) {
          contextAddition += `\n${res.file}:\n${res.snippets.slice(0, 3).join("\n")}\n`;
        }
      }
    } else {
      return {
        reply: `Searched ${meta.fileCount} files, ${meta.layerCount || 0} layers—no mention.`,
        aiUsed: "system"
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
6. UNKNOWN is ONLY allowed for log-recall or verification claims
7. Be concise—no meta-commentary or verbose explanations
8. When corrected or shown rage, acknowledge immediately with one concrete fix

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
${knowledgeStatus || "KB not mined"}

## Citation rule
Cite: "From [exact file], Layer [ID]: [quote]"
Only cite sources in [VERIFIED KB] block above.` + studentContext;
  const geminiMessages = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood. Concise, no greetings, no echo, cite only verified sources." }] }
  ];
  for (const msg of messages.slice(-10)) {
    geminiMessages.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    });
  }
  const augmentedMessage = message + contextAddition;
  geminiMessages.push({ role: "user", parts: [{ text: augmentedMessage }] });
  let reply = "";
  let aiUsed = "gemini";
  if (specialAction) {
    reply = specialAction;
    aiUsed = "system";
  } else {
    try {
      reply = await callGemini(geminiMessages, env);
      const similarity = stringSimilarity(message, reply);
      if (similarity >= 0.85) {
        geminiMessages.push({ role: "model", parts: [{ text: reply }] });
        geminiMessages.push({ role: "user", parts: [{ text: "DO NOT ECHO. Add new value." }] });
        reply = await callGemini(geminiMessages, env);
        const retrySimilarity = stringSimilarity(message, reply);
        if (retrySimilarity >= 0.85) {
          reply = "ECHOLOOP detected. Unable to generate non-echo response.";
          aiUsed = "error";
        }
      }
      if (env.DEEPSEEK_API_KEY && needsDeepSeek(message, reply)) {
        reply = await callDeepSeek(geminiMessages, env);
        aiUsed = "deepseek";
      }
    } catch (geminiError) {
      console.error("AI error (redacted):", redactSecrets({ error: geminiError.message }));
      if (env.DEEPSEEK_API_KEY) {
        try {
          reply = await callDeepSeek(geminiMessages, env);
          aiUsed = "deepseek-fallback";
        } catch (deepseekError) {
          reply = "AI error: Gemini + DeepSeek failed. Check API keys.";
          aiUsed = "error";
        }
      } else {
        reply = "Gemini error: " + geminiError.message;
        aiUsed = "error";
      }
    }
  }
  if (!reply) reply = "No response generated";
  await doStub.fetch("https://fake/add", {
    method: "POST",
    body: JSON.stringify({ role: "assistant", content: reply, userId })
  });
  return { reply, aiUsed };
}
__name(processChatMessage, "processChatMessage");
var MAGIC_CHAT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phoenix Magic Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; background: #0f0f1a; color: #a855f7; height: 100vh; display: flex; flex-direction: column; }
    .chat-container { flex: 1; padding: 2rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
    .message { padding: 1rem; border-radius: 8px; max-width: 70%; word-wrap: break-word; line-height: 1.5; }
    .message.user { background: rgba(168,85,247,0.2); border: 1px solid #a855f7; align-self: flex-end; }
    .message.assistant { background: rgba(245,158,11,0.1); border: 1px solid #f59e0b; align-self: flex-start; white-space: pre-wrap; }
    .input-area { padding: 1.5rem; border-top: 1px solid #a855f7; display: flex; gap: 1rem; align-items: center; }
    input { flex: 1; background: rgba(168,85,247,0.1); border: 1px solid #a855f7; color: #a855f7; padding: 1rem; font-family: monospace; font-size: 1rem; border-radius: 6px; }
    input:focus { outline: none; border-color: #f59e0b; }
    button { background: transparent; border: 1px solid #a855f7; color: #a855f7; padding: 1rem; font-size: 1.2rem; cursor: pointer; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; }
    button:hover { background: rgba(168,85,247,0.1); }
    button.recording { background: #ef4444; border-color: #ef4444; color: #0f0f1a; animation: pulse 1s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .error { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; color: #ef4444; padding: 1rem; border-radius: 8px; margin: 1rem; }
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
          voiceBtn.textContent = '⏹';
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

        ws.onerror = () => { showError('Voice connection failed'); stopVoice(); };
        ws.onclose = () => stopVoice();
      } catch (err) {
        showError('Voice error: ' + err.message);
        stopVoice();
      }
    }

    function stopVoice() {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'CloseStream' }));
      if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (ws && ws.readyState < 2) ws.close();
      isRecording = false;
      voiceBtn.textContent = '🎤';
      voiceBtn.classList.remove('recording');
    }

    voiceBtn.onclick = () => { if (isRecording) stopVoice(); else startVoice(); };

    textInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        const msg = textInput.value.trim();
        if (!msg) return;
        addMessage('user', msg);
        textInput.value = '';
        await sendToObi(msg);
      }
    });
  <\/script>
</body>
</html>`;
var reincarnate_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/student/resolve' && request.method === 'POST') {
      const cookieHeader = request.headers.get('Cookie') || '';
      const match = cookieHeader.match(/phoenix_student_id=([^;]+)/);
      const studentId = match ? match[1] : null;
      if (!studentId) {
        const newStudentId = 'student-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        return new Response(JSON.stringify({ onboarding_required: true, studentId: newStudentId }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Set-Cookie': 'phoenix_student_id=' + newStudentId + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000' }
        });
      }
      try {
        const profileDoId = env.STUDENT_PROFILES.idFromName(studentId);
        const profileStub = env.STUDENT_PROFILES.get(profileDoId);
        const profileResp = await profileStub.fetch('https://fake/profile/get?student_id=' + studentId);
        if (!profileResp.ok) return new Response(JSON.stringify({ onboarding_required: true, studentId }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        const profile = await profileResp.json();
        const required = !profile || profile.onboarding_complete === 0;
        return new Response(JSON.stringify({ onboarding_required: required, studentId }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    if (url.pathname === '/student/create' && request.method === 'POST') {
      const { studentId, name, age, region, goals, hobbies } = await request.json();
      const profileDoId = env.STUDENT_PROFILES.idFromName(studentId);
      const profileStub = env.STUDENT_PROFILES.get(profileDoId);
      await profileStub.fetch('https://fake/profile/create', { method: 'POST', body: JSON.stringify({ studentId, name, age, region, goals, hobbies }) });
      await profileStub.fetch('https://fake/profile/seal', { method: 'POST', body: JSON.stringify({ studentId }) });
      return new Response(JSON.stringify({ ok: true, studentId }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Set-Cookie': 'phoenix_student_id=' + studentId + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000' }
      });
    }
    
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-sovereign-key"
        }
      });
    }
    
    if (url.pathname === "/mine") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      try {
        const result = await mineKnowledgeBase(sessionId, env);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    if (url.pathname === "/query") {
      const sessionId = url.searchParams.get("sessionId");
      const query = url.searchParams.get("q");
      if (!sessionId || !query) {
        return new Response(JSON.stringify({ error: "Missing sessionId or query" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      try {
        const result = await queryKnowledgeBase(query, sessionId, env);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    if (url.pathname === "/verify") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const doId = env.SESSIONS.idFromName(sessionId);
      const doStub = env.SESSIONS.get(doId);
      const verifyResp = await doStub.fetch("https://fake/verify");
      const verifyData = await verifyResp.json();
      return new Response(JSON.stringify(verifyData), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (url.pathname === "/deepgram-ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader && upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      if (!env.DEEPGRAM_API_KEY) {
        return new Response("DEEPGRAM_API_KEY not configured", { status: 500 });
      }
      const pair = new WebSocketPair();
      const clientWs = pair[0];
      const serverWs = pair[1];
      serverWs.accept();
      const deepgramUrl = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true";
      let dgWs = null;
      (async () => {
        try {
          const dgResp = await fetch(deepgramUrl, {
            headers: {
              "Upgrade": "websocket",
              "Authorization": "Token " + env.DEEPGRAM_API_KEY
            }
          });
          if (dgResp.status !== 101) {
            serverWs.close(1011, "Deepgram upgrade failed");
            return;
          }
          dgWs = dgResp.webSocket;
          dgWs.accept();
          dgWs.addEventListener("message", (event) => {
            if (serverWs.readyState === 1) {
              serverWs.send(event.data);
            }
          });
          dgWs.addEventListener("close", (e) => {
            try { serverWs.close(e.code || 1011, e.reason || "Deepgram closed"); } catch {}
          });
        } catch (err) {
          serverWs.close(1011, "Deepgram connect error");
        }
      })();
      serverWs.addEventListener("message", (event) => {
        if (typeof event.data === "string") return;
        if (dgWs && dgWs.readyState === 1) {
          dgWs.send(event.data);
        }
      });
      serverWs.addEventListener("close", (e) => {
        try {
          if (dgWs && dgWs.readyState === 1) dgWs.close(1000, "Client closed");
        } catch {}
      });
      return new Response(null, { status: 101, webSocket: clientWs });
    }
    if (url.pathname === "/" || url.pathname === "/voice-chat" || url.pathname === "/voice-chat.html" || url.pathname === "/magic-chat" || url.pathname === "/magic-chat.html") {
      return new Response(MAGIC_CHAT_HTML, {
        headers: { "Content-Type": "text/html", "Cache-Control": "no-cache" }
      });
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        ok: true,
        version: "v126-B0B-RESTORED",
        benchmarks: {
          "b0+b1": "✅ Voice + text",
          b2: "✅ STONESKY ledger",
          b3: "⚠️ Dynamic (mine to load)",
          b4: "⏳ Pending",
          b5: "⏳ Pending"
        }
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    if (url.pathname === "/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const { message, sessionId } = body;
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookieMatch = cookieHeader.match(/phoenix_student_id=([^;]+)/);
        const envWithCookies = { ...env, __cookies: { phoenix_student_id: cookieMatch ? cookieMatch[1] : null } };
        
        if (!message || !sessionId) {
          return new Response(JSON.stringify({ error: "Missing message or sessionId" }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        if (!checkRateLimit(sessionId)) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
          });
        }
        const { reply, aiUsed } = await processChatMessage(message, sessionId, envWithCookies);
        return new Response(JSON.stringify({ ok: true, reply, aiUsed, sessionId }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Chat error", message: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }
    return new Response("Phoenix OB1 v126-B0B-RESTORED", { status: 404 });
  }
};
export { SessionDO, StudentProfileDO, reincarnate_default as default };