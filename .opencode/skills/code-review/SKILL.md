---
name: code-review
description: "Review code changes for correctness, security, edge cases, naming, and test gaps before merging. Use when asked to 'review', 'critique', 'audit', 'check this PR/diff/code', or when a pull request needs merging."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Code Review

Find what's wrong and what's risky — not just congratulate the author.

## Review order (highest-to-lowest impact)

1. **Correctness** — does it do what it claims? Off-by-one, concurrency, null/undefined, stale state, incorrect assumptions.
2. **Security** — input validation, injection, secrets, authz, path traversal, CSRF, unsafe deserialization. Assume inputs are hostile.
3. **Edge cases** — empty arrays, zero, negative, huge numbers, unicode, RTL, slow network, offline, first-run, locale, timezone.
4. **API / breaking changes** — signatures, default values, serialization contracts, wire format, backward compat.
5. **Tests** — coverage of the new behavior; do tests assert the *right* thing or just the happy path?
6. **Performance** — N+1, unbounded loops, excessive re-renders, large bundle size.
7. **Style** — only flag when it harms readability. Never nitpick formatting a linter already handles.

## Comment format

Prefix each comment with severity:

- `[blocker]` — must fix before merge
- `[major]` — should fix, or justified exemption
- `[minor]` — nice-to-fix, can be a follow-up issue
- `[question]` — ask, don't assert
- `[nit]` — optional; use rarely

Format: `[blocker] file:line — description. Suggested fix: …`

A review without at least one `[question]` or `[major]` is usually a rubber-stamp. If you genuinely see nothing, say so explicitly.

## What NOT to do

- Don't restate what the diff does — the author already knows.
- Don't propose large refactors inside a bugfix PR.
- Don't flag linter territory (indentation, quote style) — fix the linter config once instead.
- Don't approve "just tests" that snapshot unchanged behavior.

## Output format

Summarise in two sections: **Blockers & majors** first (grouped), then **minors/questions**. End with: `LGTM` / `Request changes: <list>` / `Needs discussion`.
