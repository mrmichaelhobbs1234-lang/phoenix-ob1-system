# MASTER CONTRACT: PHOENIX DRONE BOOT LAW V1

**Status**: SEALED  
**Date**: 2026-02-27  
**Source**: phoenix-99999 repo

---

## Executive Summary

This contract codifies the 9 stubborn threats identified in the Phoenix overlay scan plus 11+ follow-up hardens that close the "looks good, still breaks" gap between detection and enforcement.

All rules are **fail-closed by default**. Violations trigger HALT, FAILCLOSED_DIAG, or ABORT_SEV1 routes.

---

## The 9 Stubborn Threats (Core Fixes)

### 1. ECHOLOOP Detection Missing from Sonar Scanner

**Threat**: ECHOLOOP is a core anti-drift event but pattern detection didn't exist.

**Fix**: Add to FAILUREEVENTS detect patterns

### 2. NONCE Replay Enforcement

**Threat**: NONCEREPLAY appears in gates but no detection trigger.

**Fix**: Add nonce replay detection patterns

### 3. Authority Hallucination Claims

**Threat**: HIGH severity ("claims it ran stuff") but no automated detection.

**Fix**: Detect phrases like "I verified", "I confirmed" without evidence

### 4. Error Budget Tracking

**Threat**: Referenced but no accumulator.

**Fix**: Track budget usage across nodes

### 5. Genesis Lock

**Threat**: Mentioned but no write-once verification.

**Fix**: Add genesis modification detection

### 6. Secret Leak Detection

**Threat**: Claims exist but no pattern matching.

**Fix**: Regex patterns for API keys, tokens, passwords

### 7. Anchor Saturation Risk

**Threat**: Acknowledged but no density metric.

**Fix**: Add anchordensity metric to index

### 8. Drift Detected Event

**Threat**: Logged but no auto-reincarnation trigger.

**Fix**: Cumulative drift tracking → REINCARNATIONREQUIRED

### 9. Chaos Module Coverage

**Threat**: Heatmap shows missing primitives but doesn't verify harness code exists.

**Fix**: Add harness existence check

---

## 11+ Follow-Up Hardens

10. Regex-Based Evidence Is Not Evidence
11. Case Drift Breaks Determinism Silently
12. Excerpt-Based Harness Detection Is Brittle
13. Authority Hallucination Will False-Flag Legitimate Tool Output
14. Secret Scanning Needs Redaction-Before-Write
15. Node ID Stability Must Be Path-Relative
16. Newline Normalization Must Happen Before Hashing
17. Heatmap Coverage Ratio Can Divide by Zero
18. CLI Parsing Is Currently Broken
19. Missing Schema Validation on OVERLAYPACK
20. Drift Threshold Should Be Weighted

---

## Turn-Key Integration Pattern

1. `scanFile(fp)` → `normalizedText, hitlist, snippets, triggers, predictedfailures`
2. `emitNode` writes **only redacted snippets** + hashes
3. `buildIndex` and `buildHeatmap` rely on `hitlist` and `triggers`
4. Minimal node fields for drones

---

## Deploy Confirm: All Benchmarks Binary (PASS/FAIL)

**Scanner commands:**
```bash
node sonar-scan-space.js --in .space --out .out --strict
node overlay-runner.js --space .space --out .out --strict
```

**Flyable Map Criteria (ALL must be true):**
- `HEATMAP.missing.gategroups.length === 0`
- `HEATMAP.missing.eventcodes.length === 0`
- `chaosharnesscoverage.missingharnesses.length === 0`
- `systemalerts` empty OR only LOW

---

**SHA-LOCK COMPLETE. DEPLOY READY.**

**END OF MASTER CONTRACT V1**
