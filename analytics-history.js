(function () {
  "use strict";

  var APP_DB = "expiry_manager_app";
  var APP_DB_VERSION = 1;
  var STORE_SETTINGS = "settings";
  var HISTORY_KEY = "analyticsHistoryV1";
  var EVENT_TYPES = { added: true, edited: true, deleted: true, expired: true };

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(APP_DB, APP_DB_VERSION);
      req.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function getSetting(key) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_SETTINGS, "readonly");
      var req = tx.objectStore(STORE_SETTINGS).get(key);
      req.onsuccess = function () { resolve(req.result ? req.result.value : null); };
      req.onerror = function () { reject(req.error); };
      tx.oncomplete = function () { db.close(); };
    });
  }

  async function setSetting(key, value) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_SETTINGS, "readwrite");
      tx.objectStore(STORE_SETTINGS).put({ key: key, value: value });
      tx.oncomplete = function () { db.close(); resolve(); };
      tx.onerror = function () { db.close(); reject(tx.error); };
      tx.onabort = function () { db.close(); reject(tx.error); };
    });
  }

  function emptyHistory() { return { version: 1, events: [], months: {} }; }
  function number(value) { return Math.max(0, Number(value) || 0); }
  function category(value) { return String(value || "").trim() || "未分類"; }
  function monthKey(value) {
    var date = value instanceof Date ? value : new Date(value || Date.now());
    if (isNaN(date.getTime())) date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }
  function expiryDate(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : null;
  }
  function isExpired(product) {
    var date = expiryDate(product && product.expiryDate);
    if (!date) return false;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }
  function emptyMonth(key) {
    return { monthKey: key, added: 0, edited: 0, deleted: 0, expired: 0, categories: {}, distribution: {}, snapshotAt: "", updatedAt: "" };
  }
  function ensureMonth(history, key) {
    if (!history.months[key]) history.months[key] = emptyMonth(key);
    return history.months[key];
  }
  function normalizeHistory(value) {
    var input = value && typeof value === "object" ? value : emptyHistory();
    var output = emptyHistory();
    (Array.isArray(input.events) ? input.events : []).forEach(function (event) {
      if (!event || !EVENT_TYPES[event.type] || !event.id) return;
      output.events.push({ id: String(event.id), type: event.type, productId: String(event.productId || ""), category: category(event.category), occurredAt: String(event.occurredAt || new Date().toISOString()) });
    });
    Object.keys(input.months || {}).forEach(function (key) {
      var source = input.months[key] || {}; var target = ensureMonth(output, key);
      ["added", "edited", "deleted", "expired"].forEach(function (name) { target[name] = number(source[name]); });
      target.categories = source.categories && typeof source.categories === "object" ? source.categories : {};
      target.distribution = source.distribution && typeof source.distribution === "object" ? source.distribution : {};
      target.snapshotAt = String(source.snapshotAt || ""); target.updatedAt = String(source.updatedAt || "");
    });
    return output;
  }
  function distribution(products) {
    var result = {};
    (Array.isArray(products) ? products : []).forEach(function (product) { var key = category(product && product.category); result[key] = number(result[key]) + 1; });
    return result;
  }
  function hasEvent(history, id) { return history.events.some(function (event) { return event.id === id; }); }
  function addEvent(history, input) {
    if (!input || !EVENT_TYPES[input.type] || !input.product) return false;
    var product = input.product;
    var occurredAt = input.occurredAt || new Date().toISOString();
    var id = input.type === "expired" ? "expired:" + String(product.id || "") : input.type + ":" + String(product.id || "") + ":" + occurredAt + ":" + history.events.length;
    if (hasEvent(history, id)) return false;
    var event = { id: id, type: input.type, productId: String(product.id || ""), category: category(product.category), occurredAt: occurredAt };
    history.events.push(event);
    var month = ensureMonth(history, monthKey(occurredAt));
    month[event.type] += 1;
    if (!month.categories[event.category]) month.categories[event.category] = { added: 0, edited: 0, deleted: 0, expired: 0 };
    month.categories[event.category][event.type] += 1;
    month.updatedAt = new Date().toISOString();
    return true;
  }
  function snapshot(history, products) {
    var month = ensureMonth(history, monthKey(new Date()));
    month.distribution = distribution(products);
    month.snapshotAt = new Date().toISOString();
    month.updatedAt = month.snapshotAt;
    return history;
  }
  function applyEvents(history, inputs, products) {
    var output = normalizeHistory(history);
    (Array.isArray(inputs) ? inputs : []).forEach(function (input) {
      if (!input || !input.product) return;
      addEvent(output, input);
      if (input.type !== "expired" && isExpired(input.product)) {
        var date = expiryDate(input.product.expiryDate);
        addEvent(output, { type: "expired", product: input.product, occurredAt: date ? date.toISOString() : new Date().toISOString() });
      }
    });
    return snapshot(output, products);
  }
  async function load() { return normalizeHistory(await getSetting(HISTORY_KEY)); }
  async function save(history) { await setSetting(HISTORY_KEY, normalizeHistory(history)); }
  async function record(events, products) { var history = applyEvents(await load(), events, products); await save(history); return history; }
  async function reconcileExpired(products) {
    var events = [];
    (Array.isArray(products) ? products : []).forEach(function (product) {
      if (!isExpired(product)) return;
      var date = expiryDate(product.expiryDate);
      events.push({ type: "expired", product: product, occurredAt: date ? date.toISOString() : new Date().toISOString() });
    });
    return record(events, products);
  }
  function merge(first, second) {
    var result = emptyHistory();
    [normalizeHistory(first), normalizeHistory(second)].forEach(function (history) {
      history.events.forEach(function (event) {
        if (hasEvent(result, event.id)) return;
        result.events.push(event);
        var month = ensureMonth(result, monthKey(event.occurredAt));
        month[event.type] += 1;
        if (!month.categories[event.category]) month.categories[event.category] = { added: 0, edited: 0, deleted: 0, expired: 0 };
        month.categories[event.category][event.type] += 1;
      });
      Object.keys(history.months).forEach(function (key) {
        var source = history.months[key]; var target = ensureMonth(result, key);
        if (String(source.snapshotAt || "") >= String(target.snapshotAt || "")) { target.distribution = source.distribution || {}; target.snapshotAt = source.snapshotAt || ""; }
      });
    });
    return result;
  }
  function monthRows(history) { return Object.keys(normalizeHistory(history).months).sort().map(function (key) { return normalizeHistory(history).months[key]; }); }
  window.AnalyticsHistoryStore = { load: load, save: save, record: record, reconcileExpired: reconcileExpired, snapshot: async function (products) { var history = snapshot(await load(), products); await save(history); return history; }, merge: merge, monthRows: monthRows, key: HISTORY_KEY };
})();
