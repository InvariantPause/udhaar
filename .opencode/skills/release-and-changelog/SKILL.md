---
name: release-and-changelog
description: "Versioning (semver), changelog authoring, and release execution. Use when bumping versions, drafting changelog entries, tagging releases, publishing packages/App Store, or answering 'what should the next version be'."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Release and Changelog

Ship deliberately. A release is a promise to users.

## Versioning (semver, strictly)

- MAJOR — breaking, requires user action
- MINOR — new backward-compatible capability
- PATCH — bug fix or docs / internal change
- 0.x → 1.0 is the readiness signal, not a marketing decision
- Prerelease tags (1.0.0-rc.1) are for testing users; not for "near enough".

## Changelog rules (Keep a Changelog style)

Categories in this order: **Added, Changed, Deprecated, Removed, Fixed, Security.**

- Each entry = a user-visible behavior, not a commit, not a file.
- Link each entry to the PR / commit hash.
- "Improved performance" is not an entry. "Dashboard renders in 120ms (was 1.4s)" is.
- Under Unreleased until the tag is cut. Never edit past releases.
- Breakage must have a migration paragraph.

## Pre-release checklist

- [ ] All tests pass on clean checkout.
- [ ] Version string updated everywhere (package.json, manifest, in-app About, docs, README badge).
- [ ] CHANGELOG moved from Unreleased to the new version.
- [ ] Git tag `vX.Y.Z` and signed commit.
- [ ] Artifact checksums (sha256) published.
- [ ] Release notes written for humans, not diffs.
- [ ] Smoke test the actual shipped artifact, not only the build.

## What to never release

- Half-finished migrations.
- Schema changes without a migration (anything that loses user data).
- Breaking changes without a major version.
- "Just one quick commit on top" after the tag was cut.

## Anti-patterns

- Version bumps without changelog entries.
- "Fixed bugs" as a changelog line.
- Force-pushing the tag after publish.
- Shipping README-vs-feature mismatch.
- Silent beta behavior in a stable release.

## Output format

Tag proposal + one-line justification + drafted changelog block + checklist status. No prose around the edges.
