/**
 * ============================================================================
 *  Udhaar — Google Apps Script backend
 * ============================================================================
 *  Bridges your Android quick-capture shortcut and the Udhaar mobile UI to a
 *  single Google Sheet (the source of truth).
 *
 *  Deploy: Extensions ▸ Apps Script ▸ Deploy ▸ New deployment ▸ Web app
 *    - Execute as:  Me
 *    - Who has access:  Anyone
 *  Then set the secret token (see SETUP.md) in Project Settings ▸ Script
 *  properties as  UDHAAR_TOKEN = <your-secret>.
 * ============================================================================
 */

/** Spreadsheet + tab definitions. */
var SHEET_ID = ''; // optional: leave '' to use the bound spreadsheet
var TOKEN_PROP = 'UDHAAR_TOKEN';

var TABS = {
  Transactions:  ['id', 'date', 'type', 'amount', 'currency', 'category', 'method', 'note', 'created_at'],
  Contacts:      ['id', 'name', 'phone', 'created_at'],
  Ledger:        ['id', 'contact_id', 'kind', 'amount', 'currency', 'date', 'note'],
  Subscriptions: ['id', 'name', 'amount', 'currency', 'cycle', 'next_due', 'category', 'active'],
  Budgets:       ['id', 'category', 'currency', 'limit'],
};

/* ------------------------------- helpers --------------------------------- */

function ss() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheetFor(name) {
  var book = ss();
  var sh = book.getSheetByName(name);
  if (!sh) {
    sh = book.insertSheet(name);
  }
  var headers = TABS[name];
  var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  if (first.join('') === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function ensureTabs() {
  Object.keys(TABS).forEach(sheetFor);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkToken(token) {
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROP);
  if (!expected) return { ok: false, error: 'Server token not configured' };
  if (String(token || '') !== String(expected)) return { ok: false, error: 'Invalid token' };
  return { ok: true };
}

function uid() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

function nowISO() {
  return new Date().toISOString();
}

/** Read a whole tab as an array of objects. */
function readTab(name) {
  var sh = sheetFor(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var headers = TABS[name];
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.filter(function (row) {
    return row.join('') !== '';
  }).map(function (row) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

/** Append rows (objects) to a tab. Returns count appended. */
function appendRows(name, rows) {
  if (!rows || !rows.length) return 0;
  var sh = sheetFor(name);
  var headers = TABS[name];
  var out = rows.map(function (r) {
    return headers.map(function (h) {
      if (h === 'id' && !r[h]) return uid();
      if (h === 'created_at' && !r[h]) return nowISO();
      var v = r[h];
      return v === undefined || v === null ? '' : v;
    });
  });
  sh.getRange(sh.getLastRow() + 1, 1, out.length, headers.length).setValues(out);
  return out.length;
}

/* ------------------------------- GET (read) ------------------------------ */

function doGet(e) {
  ensureTabs();
  var p = e && e.parameter ? e.parameter : {};
  var auth = checkToken(p.token);
  if (!auth.ok) return json({ ok: false, error: auth.error });

  if (p.action === 'ping') return json({ ok: true, pong: true, time: nowISO() });

  var data = {};
  Object.keys(TABS).forEach(function (name) { data[name] = readTab(name); });
  return json({ ok: true, data: data });
}

/* ------------------------------ POST (write) ----------------------------- */

function doPost(e) {
  ensureTabs();
  var body = {};
  try {
    body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    return json({ ok: false, error: 'Malformed JSON body' });
  }
  // allow token in body or query string
  var token = body.token || (e.parameter && e.parameter.token);
  var auth = checkToken(token);
  if (!auth.ok) return json({ ok: false, error: auth.error });

  var action = body.action || 'addTransaction';
  var payload = body.data || body;

  switch (action) {
    case 'addTransaction':
      // Accept a single transaction or an array.
      var txs = Array.isArray(payload) ? payload : [payload];
      var n = appendRows('Transactions', txs.map(normaliseTx));
      return json({ ok: true, action: action, inserted: n });

    case 'addLedger': {
      var en = appendRows('Ledger', Array.isArray(payload) ? payload : [payload]);
      return json({ ok: true, action: action, inserted: en });
    }

    case 'addContact': {
      var cn = appendRows('Contacts', Array.isArray(payload) ? payload : [payload]);
      return json({ ok: true, action: action, inserted: cn });
    }

    case 'addSubscription': {
      var sn = appendRows('Subscriptions', Array.isArray(payload) ? payload : [payload]);
      return json({ ok: true, action: action, inserted: sn });
    }

    case 'addBudget': {
      var bn = appendRows('Budgets', Array.isArray(payload) ? payload : [payload]);
      return json({ ok: true, action: action, inserted: bn });
    }

    case 'batch': {
      // { action:'batch', data:{ Transactions:[...], Ledger:[...] , ... } }
      var counts = {};
      Object.keys(TABS).forEach(function (name) {
        if (payload && payload[name]) counts[name] = appendRows(name, payload[name]);
      });
      return json({ ok: true, action: action, inserted: counts });
    }

    case 'test':
      return json({ ok: true, action: action, message: 'Udhaar backend reachable' });

    default:
      return json({ ok: false, error: 'Unknown action: ' + action });
  }
}

function normaliseTx(t) {
  return {
    id: t.id || uid(),
    date: t.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    type: t.type || 'expense',
    amount: t.amount || 0,
    currency: t.currency || 'PKR',
    category: t.category || 'Other',
    method: t.method || '',
    note: t.note || '',
    created_at: t.created_at || nowISO(),
  };
}

/* --------------------------- one-time setup ------------------------------ */
/**
 * Run once from the editor to create all tabs with headers.
 * Also run setToken() to store your secret.
 */
function setup() {
  ensureTabs();
  SpreadsheetApp.getActiveSpreadsheet().toast('Udhaar tabs ready');
}

function setToken() {
  var t = 'CHANGE-ME-to-a-long-random-string';
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROP, t);
  Logger.log('Token set to: ' + t);
}
