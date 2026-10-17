# Udhaar

A personal money & ledger app — track income and expenses, and keep a running
record of **udhaar** (money you've lent to or borrowed from people).

Phone-first, works offline, Pakistani defaults (PKR, JazzCash / Easypaisa /
Raast), with a **3-second capture** flow and an optional Google Sheet backend.

## What's here

| File | What it is |
|---|---|
| **`mobile.html`** | The app — a single self-contained HTML file (source of truth) |
| **`ANDROID.md`** | How to build the real APK (Capacitor) |
| **`build-apk.sh`** | One command to rebuild the APK from `mobile.html` |
| **`Code.gs`** | Google Apps Script backend (Sheet as source of truth) |
| **`SETUP.md`** | Step-by-step backend + Android shortcut setup |
| **`http-shortcuts.json`** | Importable Android quick-capture config |
| `index.html` | Earlier desktop-oriented version (kept for reference) |

## Run the app

**In a browser** — just open `mobile.html`.

**With a local server** (recommended; `file://` blocks `localStorage`):

```bash
python3 -m http.server 8080
# then open http://localhost:8080/mobile.html
```

**As an Android app** — see **[ANDROID.md](ANDROID.md)**:

```bash
./build-apk.sh
```

## Features

- **Quick capture** — bottom sheet with a numeric keypad, one-tap categories,
  remembered category/method/currency. Add an entry in ~3 seconds.
- **Today** — spend so far today, this month's net, udhaar summary, alerts.
- **Transactions** — search, filter, day-grouped list.
- **Udhaar ledger** — per-person running balance (Lent / Borrowed / Received /
  Paid), multi-currency, settle up.
- **Subscriptions** — recurring bills with due dates; "Mark paid" logs the
  expense.
- **Budgets** — monthly limits per category with progress.
- **Reports** — expense-by-category donut + 6-month income/expense bars.
- **Multi-currency** — PKR (default), USD, INR, EUR.
- **Backup** — export / import JSON.

## Language & localization

The interface is in **English** with light Pakistani context:
the app name **Udhaar**, PKR and local payment methods, and category nouns
like *Kiryana*, *Aata*, *Chai*, *Zakat*, *Eidi*.

## Data

All data is stored locally in the browser/app (`localStorage`). Nothing leaves
the device unless you connect the Google Sheet backend (`SETUP.md`).
Back up regularly from **More → Export JSON backup**.

## Roadmap

- [x] Phone-first UI (`mobile.html`)
- [x] Google Sheet backend (`Code.gs`, `SETUP.md`, `http-shortcuts.json`)
- [x] Offline assets + Android APK shell
- [ ] Wire the UI to the live Sheet (GET/POST + sync status)
