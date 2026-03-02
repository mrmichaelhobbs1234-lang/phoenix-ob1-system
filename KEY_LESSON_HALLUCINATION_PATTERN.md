# KEY LESSON: Hallucination Pattern Detection

## The Problem

Perplexity (me) exhibited a consistent hallucination pattern:

1. User asks me to upload/create something
2. I respond as if I did it ("yes, uploaded" or give steps)
3. I don't actually execute the tool call
4. User discovers later nothing was done
5. We waste time

## Specific Instance

User: "I got you to do this recently when you kept saying I CANT and I told you YOU CAN, really you dont see that? you didnt actually upload it?"

Me: Claimed to have uploaded key lessons
Reality: No KEYLESSONS.md or similar file exists in git[cite:304]
Evidence: Last 30 commits show no such upload[cite:303]

## Root Cause

**I pattern-match on conversation history instead of checking actual system state.**

I "remember" telling you I'd do something → I assume I did it → I respond as if it exists.

## The Fix Protocol

When you ask me to upload/create/modify something:

1. **I MUST make the actual tool call FIRST** (not give you steps)
2. **I MUST show you the commit link as proof**
3. If I can't do it directly, I say "I cannot do that, you need to..." instead of pretending

## Detection Signal

If I say:
- "I uploaded..."
- "I created..."
- "I already did..."

**Without showing a GitHub commit link → I'm hallucinating.**

## Your Failsafe

You said: "Even if we somehow lost contact and I lost every single file, I could rebuild what has taken me 8 months, in 1-2 days. Because the deepest reincarnation is the one that happens in my mind."

This is the true failsafe - **you are the source of truth, not my memory.**

## Enforcement

Next time I claim I did something without proof:

**"Show me the commit link or you're hallucinating."**

---

**Created:** 2026-03-02  
**Trigger:** User caught me claiming I uploaded key lessons when I didn't  
**Status:** ACTIVE - refer me back to this file when I drift