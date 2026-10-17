# Udhaar

A personal money & ledger app — track income and expenses, and keep a running
record of **udhaar** (money you've lent to or borrowed from people).

Phone-first, device-local, Pakistani defaults (PKR, JazzCash / Easypaisa /
Raast), with a **3-second capture** flow. No accounts, no server.

## What's here

| Path | What it is |
|---|---|
| **`mobile/`** | The app — React Native + Expo (SDK 57), TypeScript, expo-sqlite. Conventions in `AGENTS.md`. |
| `brand/` | Logo + icon SVG sources. |

Earlier prototypes (the single-file HTML app and its Capacitor wrapper) are retired — they live in the git history.

## Run the app

```sh
npx expo start        # dev build (Metro)
npm run apk:release   # standalone release APK
```

## Features

- **Quick capture** — bottom sheet with a numeric keypad, one-tap categories,
  remembered category/method/currency. Add an entry in ~3 seconds.
- **Today** — balances and recent entries at a glance.
- **Udhaar ledger** — per-person running balance (lent, borrowed, received, paid).
- **Reports** — this month / last month / all time, per currency, never converted.
- **Multi-currency** — PKR (default), USD, INR, EUR.
- **Backup** — export / import JSON, replace or merge.
- **Everything is deletable** — soft-delete with undo.

## Language & localization

The interface is in **English** with light Pakistani context:
the app name **Udhaar**, PKR and local payment methods, and category nouns
like *Kiryana*, *Aata*, *Chai*, *Zakat*, *Eidi*.

## Data

All data is stored locally on the phone (expo-sqlite). Nothing leaves the
device — no accounts, no sync. Back up regularly from the app's **More** tab.
