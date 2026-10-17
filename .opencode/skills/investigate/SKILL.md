---
name: investigate
description: "Reproduce, isolate, and fix bugs methodically. Use when the user reports a bug, an unexpected error, a failing test, or asks 'why does X happen'. Trigger words: bug, error, traceback, regression, broken, failing, crash, doesn't work, not working, undefined, null reference, exception, problem."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Investigate

Find the root cause before changing anything. A fix without diagnosis is a guess.

## Iron rules

- Never edit code before reproducing.
- Never change more than one hypothesis at a time.
- A fix is not "done" until a regression test exists for the bug.

## Phases (run in order; skip phases 2–3 only when the cause is obvious)

1. **Reproduce deterministically.** Smallest reproduction: inputs + observed output + expected output. If none exists, write a failing test first.
2. **Narrow the blast radius.** Binary search on inputs, commits or config until the suspect is one function or one line.
3. **Hypothesize one sentence:** "X happens because Y when Z." State the evidence for Y.
4. **Fix the smallest thing** that makes the test pass — not the "nice" change, the correct one.
5. **Verify three times:** the bug test passes, all existing tests pass, and the exact scenario from step 1 produces the expected output.
6. **Ratchet:** add a regression test pinned to the case that failed.

## Anti-patterns (do not do)

- "Fixing" by deleting the failing assertion.
- Changing a default to "avoid" the bug.
- Catching and swallowing an exception to silence it.
- Renaming a variable instead of fixing the logic.
- Adding `setTimeout` to mask a race.

## Escalation

If steps 1–3 take more than ~15 minutes, stop and ask the user for what's missing: which inputs, which environment, which recent change. Don't thrash.

## Output format

When closing out: one-sentence root cause, file + line, the diff, and the test name. Nothing else.
