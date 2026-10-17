---
name: web-research
description: "Research topics on the web with source evaluation: find authoritative, current, version-appropriate documentation and synthesize an evidence-based answer. Use for 'latest', 'current', 'best practice', 'how does X work', 'is X supported', comparisons of tools/packages, or anything where training data may be stale."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Web Research

Find the truth, not the first result. Synthesize, don't just quote.

## Source hierarchy (prefer in this order)

1. Official docs for the exact version in use.
2. GitHub/issue trackers of the project itself.
3. Maintainers' blog posts / changelogs.
4. Stack Overflow answers dated within 18 months, with >50 upvotes.
5. Third-party tutorials (verify against official docs).
6. AI-generated content (trust last; verify facts).

Reject: docs for deprecated versions, Pinterest/tutorial blogs without dates, and answers that cite outdated APIs.

## Process

1. **Identify the precise question.** Vague questions waste time. Restrict to version (e.g. "Capacitor 6", "Reanimated 4") and environment (Node, OS).
2. **Parallel fetch**: dispatch 2–4 independent searches with different phrasings; don't wait serially.
3. **Cross-verify**: a fact counts only if at least two sources agree (or one official source).
4. **Date-check**: if the answer changes behavior after the stated version, flag it "version-dependent".
5. **Synthesize**: a short answer + cited sources + "what's uncertain".

## Output format

```
## Answer
<2-5 sentence answer>

## Evidence
- [source 1] quote — <url>
- [source 2] quote — <url>

## Caveats
- what this depends on
```

## Anti-patterns

- Answering from memory without verifying versioning.
- Copy-pasting the first result.
- Treating a 4-year-old SO post as current.
- Inventing compatibility claims.
- Citing generated content as fact.

## When to stop

Stop searching once (a) official docs confirm the answer and (b) you've verified nothing contradicts it. More searching rarely changes the conclusion.
