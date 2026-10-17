# Project conventions for Udhaar

## Agents / skills
- Six generalized skills live in `.opencode/skills/`. Reuse before reinventing:
  - `investigate` — bugs and unexpected errors
  - `code-review` — pre-merge review
  - `safe-refactor` — tidy without changing behavior
  - `web-research` — current docs, versions, comparisons
  - `release-and-changelog` — versions, changelog, tagging
  - `data-layer-design` — schema decisions
- Rule: load the relevant skill *before* touching the area it covers.

## Stack (current)
- Single HTML file + Capacitor for Android APK. No bundler, no framework. Keep it that way unless there is a measured reason.
- Chart.js + Inter sourced from CDN + vendored under `app/www/` for the APK.
- Storage: localStorage (device-only) — do not add a server dependency without user consent.

## Conventions
- Indian-flavored categories incl. Petrol/CNG, Kiryana, Aata, WAPDA.
- Payment methods: Cash, JazzCash, Easypaisa, Raast, Card, Bank.
- Currencies: PKR, USD, INR, EUR; **never convert across currencies**, show per-currency totals.
- UI text: English with light Pakistani context (Assalam-o-Alaikum, Eidi). Avoid transliteration and emoji.
- Money is always integer minor-units conceptually (display formatted via `money(v, cur)`).

## Don't do
- No emojis in UI; use inline SVG.
- No new color accents beyond `--accent` #22c55e.
- Don't rename columns / schema keys without migration notes.
