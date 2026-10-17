# Project conventions for Udhaar

Udhaar is a device-local money + udhaar (IOU) ledger: pure black & white, iOS-like
motion on Android, ~3-second capture. No accounts, no server. Everything deletable.

## Repo layout
- `mobile/` — **the real app**: React Native + Expo (SDK 57), TypeScript, expo-router. All new work happens here.
- `mobile.html`, `app/`, `build-apk.sh` — the retired HTML/Capacitor prototype. Reference only; do not extend. Fully retires at cutover.
- `brand/` — logo sources (green launcher identity) + mono mark used inside the app.
- `Code.gs` + `SETUP.md` + `http-shortcuts.json` — optional Google Sheet experiment. Out of scope; note the token foot-gun before resuming.

## Agents / skills
- Six generalized skills live in `.opencode/skills/`. Reuse before reinventing:
  - `investigate` — bugs and unexpected errors
  - `code-review` — pre-merge review
  - `safe-refactor` — tidy without changing behavior
  - `web-research` — current docs, versions, comparisons
  - `release-and-changelog` — versions, changelog, tagging
  - `data-layer-design` — schema decisions
- Rule: load the relevant skill *before* touching the area it covers.

## Stack (`mobile/`)
- Expo SDK 57 · React Native 0.86 · React 19 · TypeScript strict · expo-router (typed routes).
- Reanimated 4 + react-native-gesture-handler for all motion; expo-haptics for touch feedback.
- expo-sqlite for the data layer (device-only). Inter via `@expo-google-fonts/inter`. `react-native-svg` for icons.
- Metro only. No bundler or framework beyond Expo unless there is a measured reason.

## Design system (`mobile/src/design/`)
- Pure mono, dark-first. Return to **tokens only** — never hardcode colors, fonts, spacing or springs in screens.
- No hues anywhere. Emphasis = white surfaces, hairlines, weight, spacing. Never add accent colors.
- Every animation runs through a spring preset in `motion.ts`. No linear easing.
- 4pt spacing grid (`spacing.ts`). 2× hairline borders for structure.
- Money is always integer minor units; display via `formatMoney` (`mobile/src/lib/money.ts`).

## Product conventions
- Indian-flavored default categories incl. Petrol/CNG, Kiryana, Aata, WAPDA.
- Payment methods: Cash, JazzCash, Easypaisa, Raast, Card, Bank.
- Currencies: PKR, USD, INR, EUR; **never convert across currencies** — show per-currency totals.
- UI text: English with light Pakistani context (Assalam-o-Alaikum, Eidi). No transliteration.
- Everything is deletable: transactions, contacts (cascade their ledger), ledger entries. Soft-delete + undo.

## Data model (`mobile/src/lib/db/`) — invariants, do not break
- `accounts` (money places) + `transactions` are the single source of truth. **Balances are never stored** — both place balances and person balances come from the SQL views `v_account_deltas` / `v_contact_deltas`, so an edit or delete can never desync a total.
- Money = integer minor units, always. Amounts are stored **positive**; the tx `type` carries the sign:
  - out of a place: `expense`, `lend`, `repay_out`, transfer source
  - into a place: `income`, `borrow`, `repay_in`, transfer destination
  - person delta (positive = they owe you): `lend` +, `repay_out` +, `borrow` −, `repay_in` −
- Nothing is hard-deleted: nullable `deleted_at` (all rows) and `archived_at` (places with entries). Deleting a person cascades their ledger (soft, one transaction) and undo restores both.
- No FK constraints: dangling links (removed place/person) render as text, never crash. Currency always follows the place; cross-currency transfers are refused.
- Migrations are numbered arrays in `schema.ts` (append-only, each with a rollback note). `schema.ts` must stay import-free (scripts/db-check.mjs imports it under node type-stripping).
- Reactivity contract: screens read with `useMemo(fn, [rev])` from `useDb()`; every mutation ends with `bump()`. Keep SQLite calls synchronous.
- `npm run db-check` replays the real schema against node:sqlite and asserts the money math — run it after any schema/repo change.
- Backups: `src/lib/backupFormat.ts` is pure (node-testable) — versioned v1 header + legacy prototype mapping; `src/lib/backup.ts` is the db glue. Import is always describe (dry-run) → choose replace/merge; replace is undoable once via toast snapshot.

## Commands
- `cd mobile && npx expo start` — dev server (scan with Expo Go).
- `cd mobile && npx tsc --noEmit` — typecheck.
- `cd mobile && npm run lint` — lint.
- `cd mobile && npm run db-check` — schema + money-invariant checks (node:sqlite).

## Don't do
- No emojis in UI; use the `Icon` stroke set.
- No new server dependencies without user consent. Data stays device-local.
- Don't rename schema keys/columns without migration notes.
