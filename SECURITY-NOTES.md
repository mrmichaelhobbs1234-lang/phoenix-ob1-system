# SECURITY ARCHITECTURE — OB(1) SYSTEM

**Version**: v109.2  
**Updated**: March 1, 2026

---

## Security Principles

### 1. Fail-Closed by Default

All validation failures halt execution. No degraded modes.

### 2. No Secret Exposure

- Secrets never logged
- Error messages sanitized
- No secret material in responses

### 3. Constant-Time Comparisons

All auth checks use constant-time equality to prevent timing attacks.

### 4. Strict Schemas

All POST bodies validated against exact key sets. Extra keys rejected.

### 5. Rate Limiting

Token bucket algorithm (10 capacity, 1/sec refill) per session/IP.

---
## Auth Mechanisms

### Worker Auth: `x-sovereign-key`

**Used for**: All non-webhook endpoints

**Implementation**:
```javascript
const provided = request.headers.get("x-sovereign-key") || "";
const expected = env.SOVEREIGNKEY;
if (!constantTimeEqualUtf8(provided, expected)) {
  return jsonError(401, "UNAUTHORIZED", "Unauthorized", requestId);
}
```

### Webhook Auth: HMAC-SHA256

**Used for**: `/make/incoming` endpoint

**Implementation**:
```javascript
const sigHex = request.headers.get("x-make-signature");
const tsRaw = request.headers.get("x-make-timestamp");
const mac = await hmacSha256HexAsync(env.MAKE_SECRET, rawBody);
if (!constantTimeEqualHex(mac, sigHex)) {
  return jsonError(401, "UNAUTHORIZED", "Signature mismatch", requestId);
}
```

**Timestamp window**: 300 seconds max skew

---

## Banned Headers

### `x-deathstar-key`

**Purpose**: Test that banned header enforcement works

**Implementation**:
```javascript
if (request.headers.has("x-deathstar-key")) {
  return jsonError(401, "BANNED_HEADER", "Banned header present", requestId);
}
```

---

## Ledger Security

### Merkle Chain Integrity

Every entry:
```javascript
const hash = await sha256HexAsync(
  prevHash + "|" + ts + "|" + action + "|" + canonicalJson(payload)
);
```

### Idempotency via `commandId`

Duplicate `commandId` → return existing entry, no re-execution.

### Canonical JSON

Keys sorted recursively, undefined removed, numbers normalized.

---

## Rate Limiting

### Token Bucket Algorithm

- **Capacity**: 10 tokens
- **Refill rate**: 1 token/second
- **Cost per request**: 1 token (configurable 1-5)

### Implementation

```javascript
const elapsedSec = (now - lastMs) / 1000;
const refill = elapsedSec * refillPerSec;
const tokens = Math.min(capacity, currentTokens + refill);
const allowed = tokens >= cost;
```

---

## Durable Object Timeouts

**Timeout**: 2500ms per DO fetch

**Implementation**:
```javascript
const controller = new AbortController();
const t = setTimeout(() => controller.abort("timeout"), DO_TIMEOUT_MS);
const res = await stub.fetch(url, { ...init, signal: controller.signal });
```

---

## Input Validation

### POST Body Size Limit

**Max**: 10KB (10,240 bytes)

### Message Length

**Max**: 2048 characters

### Session ID Format

**Pattern**: `^[a-zA-Z0-9._:-]+$`  
**Length**: 1-64 characters

### Action Name

**Length**: 1-64 characters

### Command ID

**Length**: 1-128 characters

---

## CORS Policy

**Allowed origins**: `*` (public API)  
**Allowed methods**: `GET`, `POST`, `OPTIONS`  
**Allowed headers**: `content-type`, `x-sovereign-key`, `x-session-id`, `x-make-signature`, `x-make-timestamp`

---

## Secret Rotation

To rotate secrets:

```bash
wrangler secret put [SECRET_NAME]
# Enter new value
```

**Note**: Old value remains active until next deployment.

---

## Gospel 444 Compliance

### Colors

- Deep Void Dark: `#0f0f1a` (background)
- Neon Purple: `#a855f7` (primary)
- Imperial Gold: `#f59e0b` (accent)
- **NO BLUE** (forbidden)

### Rules

1. Fail-closed (deny by default)
2. No secret prints
3. Strict schemas
4. Banned headers enforced
5. Every rule is immutable

---

**SECURITY AUDIT COMPLETE**
