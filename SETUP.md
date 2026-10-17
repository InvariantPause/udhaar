# Udhaar — Setup Guide

Udhaar is a phone-first personal money & ledger app with a **3-second capture**
path on Android. There are three pieces:

| Piece | File | What it does |
|---|---|---|
| Mobile UI | `mobile.html` | View/enter everything on your phone |
| Backend | `Code.gs` | Google Apps Script that reads/writes your Sheet |
| Android shortcut | `http-shortcuts.json` | Home-screen button → instant capture |

Everything lives in **one Google Sheet** you own.

---

## 1. Create the Google Sheet

1. Go to <https://sheets.google.com> and create a blank spreadsheet.
2. Name it e.g. **Udhaar**.
3. You don't need to add tabs by hand — the script creates them
   (`Transactions`, `Contacts`, `Ledger`, `Subscriptions`, `Budgets`).

## 2. Add the Apps Script backend

1. In the Sheet: **Extensions ▸ Apps Script**.
2. Delete the default code, paste the entire contents of `Code.gs`.
3. Click **Save** (💾), name the project **Udhaar Backend**.
4. In the function dropdown pick **setup** and click **Run** once.
   - Approve the permissions prompt (it's your own script acting as you).
   - This creates all five tabs with headers.

## 3. Set your secret token

1. Still in Apps Script, open **Project Settings** (⚙️) ▸ **Script properties**.
2. Add a property:
   - Name: `UDHAAR_TOKEN`
   - Value: a long random string, e.g. `udhaar_9f3k2m8xq1p7`
3. Copy this string — you'll paste it into the phone and into HTTP Shortcuts.

> Tip: generate one with `openssl rand -hex 16` in a terminal.

## 4. Deploy the Web App

1. **Deploy ▸ New deployment** ▸ choose type **Web app**.
2. Settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
3. Click **Deploy**, then copy the **Web app URL**
   (`https://script.google.com/macros/s/…/exec`).

> "Anyone" here just means the URL is reachable; your token is what actually
> authorises each request. Keep the token private.

### Test it first (optional but recommended)

Paste this in a browser (replace both values):

```
https://script.google.com/macros/s/…/exec?token=YOUR_TOKEN&action=ping
```

You should see `{"ok":true,"pong":true,...}`. If you see
`Invalid token`, re-check step 3.

---

## 5. Connect the mobile app

1. Open `mobile.html` on your phone (see "Hosting" below).
2. Go to **More ▸ Settings**.
3. Paste the **Web App URL** and the **token**, tap **Save**.
4. (Phase 3 wiring) **Test connection** will confirm the link.

### Hosting `mobile.html`

Simplest options, in order of ease:

- **Just open the file** from your phone's storage. Works, but some browsers
  block `localStorage` on `file://`.
- **Serve it locally** from a computer on the same Wi-Fi:
  ```bash
  cd path/to/udhaar
  python3 -m http.server 8080
  ```
  then visit `http://<your-computer-ip>:8080/mobile.html` on the phone.
- **Host on GitHub Pages / Netlify drop** for a permanent URL. You can then
  "Add to Home Screen" and it behaves like an app.

---

## 6. Set up the Android quick-capture shortcut

Install **HTTP Shortcuts** (free) from the Play Store, then:

### Option A — import the template

1. Copy `http-shortcuts.json` to your phone (email it to yourself, Drive, etc.).
2. In HTTP Shortcuts: **⋮ ▸ Import/Export ▸ Import from file**, pick the JSON.
3. You'll get three shortcuts: **Log Expense**, **Log Income**, **Test**.
4. Edit each one and replace:
   - `REPLACE_WITH_DEPLOYMENT_ID` → the ID from your Web app URL
     (`…/macros/s/**THIS_PART**/exec`)
   - `REPLACE_WITH_YOUR_SECRET` → your token

### Option B — build it by hand

Create a new shortcut:

- **Method:** POST
- **URL:** your Web App URL
- **Request body type:** Custom JSON
- **Request body:**
  ```json
  {"token":"YOUR_TOKEN","action":"addTransaction","data":{"type":"expense","amount":"{{amount}}","currency":"{{currency}}","category":"{{category}}","method":"{{method}}","note":"{{note}}"}}
  ```
- **Variables** (in order): `amount` (number, required), `category` (list),
  `method` (list), `note` (text), `currency` (list, default PKR).

### Put it on your home screen

1. Long-press the HTTP Shortcuts shortcut → **Add to home screen**.
2. Now one tap → type amount → pick category → **go**. ~3 seconds.

### Even faster (optional)

- Add **two** home-screen icons: one for Expenses, one for Income.
- In HTTP Shortcuts each shortcut can have a **default category**, so common
  entries (Petrol, Chai) need only the amount typed.
- Android 12+: long-press the HTTP Shortcuts app icon to jump straight to a
  shortcut.
- Voice: in HTTP Shortcuts you can enable a **widget** or use its Tasker/
  Assistant integration to trigger the same shortcut hands-free.

---

## The Sheet schema (the contract)

Everything, including the phone UI, obeys these columns.

**Transactions**
`id · date · type (income|expense) · amount · currency · category · method · note · created_at`

**Contacts**
`id · name · phone · created_at`

**Ledger**
`id · contact_id · kind (lent|borrowed|received|paid) · amount · currency · date · note`

**Subscriptions**
`id · name · amount · currency · cycle (monthly|yearly|weekly) · next_due · category · active`

**Budgets**
`id · category · currency · limit`

### Balance rule (Udhaar)

For each contact and currency:

```
balance = lent + paid − borrowed − received
```

- `balance > 0` → they owe **you**
- `balance < 0` → you owe **them**
- `balance = 0` → settled

`received` = they repaid you · `paid` = you repaid them.

---

## API reference

All requests include `token`. `GET` reads, `POST` writes.

**GET**
```
?token=…&action=ping          → { ok:true, pong:true }
?token=…                       → { ok:true, data:{ Transactions:[…], … } }
```

**POST** (JSON body)
```json
{ "token":"…", "action":"addTransaction", "data":{ "type":"expense", … } }
{ "token":"…", "action":"addLedger",      "data":{ "contact_id":"…", … } }
{ "token":"…", "action":"addContact",     "data":{ "name":"Ahmed" } }
{ "token":"…", "action":"addSubscription","data":{ "name":"Netflix", … } }
{ "token":"…", "action":"addBudget",      "data":{ "category":"…", … } }
{ "token":"…", "action":"batch",          "data":{ "Transactions":[ … ] } }
{ "token":"…", "action":"test" }
```
`data` may also be an **array** to insert many rows at once.

---

## Phase roadmap

- [x] **Phase 1** — phone-first `mobile.html` prototype (local data)
- [x] **Phase 2** — `Code.gs` backend + Sheet schema + this guide
- [ ] **Phase 3** — wire `mobile.html` ↔ Sheet (GET/POST, offline cache, sync status)
- [x] **Phase 4** — `http-shortcuts.json` template

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Invalid token` | Token in request ≠ `UDHAAR_TOKEN` script property |
| `Server token not configured` | Add the `UDHAAR_TOKEN` script property (step 3) |
| `Malformed JSON body` | Body must be valid JSON with `Content-Type: application/json` |
| Changes not saving on phone | `localStorage` blocked — host via `http://`, not `file://` |
| Charts missing in app | Chart.js loads from CDN — needs internet on first open |
| New deployment made changes but phone still hits old code | Re-deploy and use the **new** URL, or manage versions in Apps Script |
