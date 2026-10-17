---
name: safe-refactor
description: "Performance-preserving, behavior-safe code transformations (rename, extract, inline, delete dead code). Use when asked to 'clean up', 'improve', 'tidy', 'simplify', 'make readable', 'remove duplication', or refactor code. Distinct from feature work and bug fixes."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Safe Refactor

Change shape, never behavior. The diff should be testable as "equivalent".

## Ground rules

- Refactor and behavior change are **separate commits / PRs**. Never in one.
- A refactor starts with a passing test suite and ends with a passing suite. If it starts broken, stop.
- Rename via tools (LSP/IDE) — not find-and-replace. Search-and-replace breaks unrelated strings.
- Extract small; inline one-level unnecessary abstraction; delete dead code only when unused *and safe to undo*.

## Workflow

1. **Tests first.** If no tests, write characterisation ("golden master") tests for the current behavior before touching.
2. **One transformation.** Each commit is one named transformation (extract-function, rename, inline). Reversible.
3. **Mechanical only.** No "while I'm here, also..." — that's how refactors become bugs.
4. **Run tests after each step**, not at the end.
5. **Measure if performance-sensitive.** Refactors that look identical can change allocation order and regress.

## When NOT to refactor

- Mid-incident. Ship the bug fix under a deadline; clean up in a follow-up.
- Code you don't understand or that has no tests.
- Across a public API boundary (rename needs deprecation, not a PR).
- Last line of a function vs. extracted helper where the helper name is worse than the code.

## Smells that justify action

- Duplication with identical logic (not just similar).
- Nests deeper than 3 levels.
- Function > ~40 lines *for a real reason*, not because there's too much going on.
- Magic numbers used in 2+ places.
- "Utils"/"helpers" file growing past ~200 lines (it's been adopted by everything).

## Output format

Name the transformation, list the files touched, say what tests cover it. If tests are absent, say "NO TESTS — risk acknowledged."
