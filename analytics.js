(function () {
  "use strict";

  var APP_DB = "expiry_manager_app";
  var APP_DB_VERSION = 1;
  var STORE_PRODUCTS = "products";
  var STORE_SETTINGS = "settings";
  var MODE_SETTING_KEY = "storageMode";
  var FILE_HANDLE_SETTING_KEY = "storageFileHandle";
  var CATEGORY_SETTING_KEY = "categories";
  var DEFAULT_CATEGORIES = ["飲料", "零食", "泡麵", "糖果"];
  var DEFAULT_APP_TITLE = "商品終期電馭監管裝置";
  var CUSTOM_APP_TITLE_KEY = "customAppTitle";
  var DEFAULT_MODE = "indexeddb";
  var ONE_DAY_MS = 24 * 60 * 60 * 1000;
  var MONTH_WINDOW = 12;
  var BACKUP_CHANGE_COUNT_KEY = "productChangeCountSinceBackup";

  var state = {
    products: [],
    categories: [],
    storageMode: DEFAULT_MODE,
    fileHandle: null,
    source: "indexeddb",
    backupChangeCount: 0,
    history: null
  };

  var ui = {
    fallbackNotice: document.getElementById("analyticsFallbackNotice"),
    exportJsonBtn: document.getElementById("analyticsExportJsonBtn"),
    expiryOverview: document.getElementById("expiryOverview"),
    overviewMetrics: document.getElementById("overviewMetrics"),
    backupOverview: document.getElementById("backupOverview"),
    categoryCountBody: document.getElementById("categoryCountBody"),
    expiryHeatmap: document.getElementById("expiryHeatmap"),
    categoryRiskBody: document.getElementById("categoryRiskBody"),
    averageDaysBody: document.getElementById("averageDaysBody"),
    monthlyExpiryHistoryBody: document.getElementById("monthlyExpiryHistoryBody"),
    categoryHistoryBody: document.getElementById("categoryHistoryBody"),
    toast: document.getElementById("analyticsToast")
  };

  var nativeBridge = createNativeBridge();

  function createNativeBridge() {
    if (!window.AndroidBridge || typeof window.AndroidBridge.requestExportJsonFile !== "function") {
      return null;
    }
    var bridge = window.AndroidBridge;
    return {
      exportJson: function (filename, content) {
        return new Promise(function (resolve, reject) {
          var handler = function (event) {
            window.removeEventListener("android-json-exported", handler);
            var detail = event.detail || {};
            if (detail.ok) {
              resolve(true);
            } else {
              reject(new Error(detail.error || "JSON 備份失敗"));
            }
          };
          window.addEventListener("android-json-exported", handler, { once: true });
          try {
            bridge.requestExportJsonFile(String(filename || "expiry-backup.json"), String(content || ""));
          } catch (error) {
            window.removeEventListener("android-json-exported", handler);
            reject(error);
          }
        });
      }
    };
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(APP_DB, APP_DB_VERSION);
      req.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function withStore(storeName, mode, workFn) {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, mode);
      var store = tx.objectStore(storeName);
      var output = workFn(store, tx);
      tx.oncomplete = function () {
        db.close();
        resolve(output);
      };
      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };
      tx.onabort = function () {
        db.close();
        reject(tx.error || new Error("transaction aborted"));
      };
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
      tx.onerror = function () { db.close(); };
      tx.onabort = function () { db.close(); };
    });
  }

  async function setSetting(key, value) {
    await withStore(STORE_SETTINGS, "readwrite", function (store) {
      store.put({ key: key, value: value });
    });
  }

  async function getCategories() {
    var saved = await getSetting(CATEGORY_SETTING_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return DEFAULT_CATEGORIES.slice();
  }

  async function getAllProductsFromIndexedDb() {
    var db = await openDb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE_PRODUCTS, "readonly");
      var req = tx.objectStore(STORE_PRODUCTS).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
      tx.oncomplete = function () { db.close(); };
      tx.onerror = function () { db.close(); };
      tx.onabort = function () { db.close(); };
    });
  }

  function parseProductsPayload(text) {
    if (!text || !String(text).trim()) {
      return [];
    }
    var parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.products)) {
      return parsed.products;
    }
    return [];
  }

  async function hasSelectedFile(fileHandle) {
    // Android now stores product data only in IndexedDB; local browser file handles are not reusable there.
    if (window.AndroidBridge) {
      return false;
    }
    return !!fileHandle;
  }

  async function readProductsFromSelectedFile(fileHandle) {
    var file = await fileHandle.getFile();
    return parseProductsPayload(await file.text());
  }

  async function loadStorageState(defaultMode) {
    var savedMode = (await getSetting(MODE_SETTING_KEY)) || defaultMode || DEFAULT_MODE;
    var fileHandle = await getSetting(FILE_HANDLE_SETTING_KEY);
    var storageMode = savedMode === "file" || savedMode === "indexeddb" ? savedMode : DEFAULT_MODE;
    if (storageMode === "file" && !(await hasSelectedFile(fileHandle))) {
      storageMode = "indexeddb";
      fileHandle = null;
      await setSetting(MODE_SETTING_KEY, "indexeddb");
      await setSetting(FILE_HANDLE_SETTING_KEY, null);
    }
    return { storageMode: storageMode, fileHandle: fileHandle };
  }

  async function loadProductsForCurrentStorage(options) {
    var opts = options || {};
    var storageMode = opts.storageMode || DEFAULT_MODE;
    var fileHandle = opts.fileHandle || null;
    var fallbackReason = "";
    if (storageMode === "file") {
      try {
        if (await hasSelectedFile(fileHandle)) {
          return { products: await readProductsFromSelectedFile(fileHandle), source: "file", fallbackReason: "" };
        }
        fallbackReason = "no-file";
      } catch (error) {
        fallbackReason = error && error.message ? error.message : "file-read-failed";
      }
    }
    return {
      products: await getAllProductsFromIndexedDb(),
      source: storageMode === "file" ? "indexeddb-fallback" : "indexeddb",
      fallbackReason: fallbackReason
    };
  }

  function t(text) {
    if (window.AppI18n && typeof window.AppI18n.translateText === "function") {
      return window.AppI18n.translateText(String(text || ""));
    }
    return String(text || "");
  }

  function getLanguage() {
    if (window.AppI18n && typeof window.AppI18n.getLanguage === "function") {
      return window.AppI18n.getLanguage();
    }
    return document.documentElement.getAttribute("lang") || "zh-Hant";
  }

  function normalizeCustomAppTitle(value) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  }

  function getEffectiveAppTitle() {
    return normalizeCustomAppTitle(localStorage.getItem(CUSTOM_APP_TITLE_KEY) || "") || DEFAULT_APP_TITLE;
  }

  function syncDocumentTitle() {
    document.title = t("商品效期趨勢分析") + " | " + getEffectiveAppTitle();
  }

  function showToast(message, isError) {
    if (!ui.toast) {
      return;
    }
    ui.toast.textContent = t(message);
    ui.toast.classList.toggle("error", !!isError);
    ui.toast.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      ui.toast.classList.add("hidden");
      ui.toast.classList.remove("error");
    }, isError ? 4200 : 2600);
  }

  function showErrorModal(message) {
    showToast(message || "程式發生未預期錯誤", true);
  }

  function toLocalDate(value) {
    var text = String(value || "").trim();
    var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function todayStart() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function daysUntil(date, today) {
    return Math.ceil((date.getTime() - today.getTime()) / ONE_DAY_MS);
  }

  function normalizeCategory(value) {
    var category = String(value || "").trim();
    return category || "未分類";
  }

  function collectCategories(products, configuredCategories) {
    var seen = Object.create(null);
    var categories = [];
    function add(category) {
      var normalized = normalizeCategory(category);
      if (!seen[normalized]) {
        seen[normalized] = true;
        categories.push(normalized);
      }
    }
    (Array.isArray(configuredCategories) ? configuredCategories : []).forEach(add);
    (Array.isArray(products) ? products : []).forEach(function (product) {
      add(product && product.category);
    });
    if (!categories.length) {
      categories.push("未分類");
    }
    return categories;
  }

  function createEmptyStats(category) {
    return {
      category: category,
      total: 0,
      expired: 0,
      within30: 0,
      within60: 0,
      dated: 0,
      remainingSum: 0
    };
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function monthLabel(date) {
    var lang = getLanguage();
    if (lang === "en") {
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
    }
    if (lang === "ja") {
      return date.getFullYear() + "年" + (date.getMonth() + 1) + "月";
    }
    return date.getFullYear() + "年" + (date.getMonth() + 1) + "月";
  }

  function buildAnalytics(products, categories) {
    var scopedProducts = Array.isArray(products) ? products : [];
    var today = todayStart();
    var categoryList = collectCategories(scopedProducts, categories);
    var statsByCategory = Object.create(null);
    var overview = {
      total: scopedProducts.length,
      expired: 0,
      within30: 0,
      within60: 0
    };
    var monthBuckets = [];
    var monthMap = Object.create(null);
    var maxMonthCount = 0;

    for (var i = 0; i < MONTH_WINDOW; i += 1) {
      var monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      var key = monthKey(monthDate);
      var bucket = { key: key, label: monthLabel(monthDate), count: 0 };
      monthBuckets.push(bucket);
      monthMap[key] = bucket;
    }

    categoryList.forEach(function (category) {
      statsByCategory[category] = createEmptyStats(category);
    });

    scopedProducts.forEach(function (product) {
      var category = normalizeCategory(product && product.category);
      if (!statsByCategory[category]) {
        statsByCategory[category] = createEmptyStats(category);
        categoryList.push(category);
      }
      var stats = statsByCategory[category];
      stats.total += 1;
      var expiryDate = toLocalDate(product && product.expiryDate);
      if (!expiryDate) {
        return;
      }
      var days = daysUntil(expiryDate, today);
      stats.dated += 1;
      stats.remainingSum += Math.max(0, days);
      if (days < 0) {
        overview.expired += 1;
        stats.expired += 1;
      } else if (days <= 30) {
        overview.within30 += 1;
        stats.within30 += 1;
      } else if (days <= 60) {
        overview.within60 += 1;
        stats.within60 += 1;
      }
      if (days >= 0) {
        var key = monthKey(expiryDate);
        if (monthMap[key]) {
          monthMap[key].count += 1;
          maxMonthCount = Math.max(maxMonthCount, monthMap[key].count);
        }
      }
    });

    return {
      overview: overview,
      categories: categoryList,
      statsByCategory: statsByCategory,
      monthBuckets: monthBuckets,
      maxMonthCount: maxMonthCount
    };
  }

  function formatOverview(overview) {
    var lang = getLanguage();
    if (lang === "en") {
      return "There are " + overview.total + " product records: " + overview.expired + " expired, " + overview.within30 + " due within 30 days, and " + overview.within60 + " due in 31-60 days.";
    }
    if (lang === "ja") {
      return "現在の商品記録は全" + overview.total + "件です。このうち期限切れは" + overview.expired + "件、30日以内に期限を迎える商品は" + overview.within30 + "件、31〜60日以内に期限を迎える商品は" + overview.within60 + "件です。";
    }
    return "目前共有" + overview.total + "筆商品紀錄，其中" + overview.expired + "筆已過期、" + overview.within30 + "筆 30 天內到期、" + overview.within60 + "筆 60 天內到期。";
  }

  function renderOverviewMetrics(overview) {
    if (!ui.overviewMetrics) return;
    clearNode(ui.overviewMetrics);
    [
      { label: "總筆數", value: overview.total, tone: "total" },
      { label: "已過期筆數", value: overview.expired, tone: "expired" },
      { label: "30天內即期", value: overview.within30, tone: "warning" },
      { label: "31-60天內到期", value: overview.within60, tone: "upcoming" }
    ].forEach(function (metric) {
      var card = document.createElement("div");
      card.className = "analytics-overview-metric analytics-overview-" + metric.tone;
      card.setAttribute("aria-label", t(metric.label) + " " + metric.value + t("筆"));
      var label = document.createElement("span");
      label.className = "analytics-overview-label";
      label.textContent = t(metric.label);
      var value = document.createElement("strong");
      value.className = "analytics-overview-value";
      value.textContent = String(metric.value);
      card.appendChild(label);
      card.appendChild(value);
      ui.overviewMetrics.appendChild(card);
    });
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function appendCell(row, text, label) {
    var cell = document.createElement("td");
    if (label) cell.setAttribute("data-label", t(label));
    cell.textContent = text;
    row.appendChild(cell);
  }

  function appendMetricCell(row, text, ratio, meterClass, label) {
    var cell = document.createElement("td");
    if (label) cell.setAttribute("data-label", t(label));
    var value = document.createElement("strong");
    value.className = "analytics-value";
    value.textContent = text;
    var meter = document.createElement("span");
    meter.className = "analytics-value-meter " + meterClass;
    var fill = document.createElement("span");
    fill.style.width = String(Math.max(0, Math.min(1, Number(ratio) || 0)) * 100) + "%";
    meter.appendChild(fill);
    cell.appendChild(value);
    cell.appendChild(meter);
    row.appendChild(cell);
  }


  function getCategoryStatsRows(data) {
    return data.categories.map(function (category, index) {
      var stats = data.statsByCategory[category] || createEmptyStats(category);
      return { category: category, stats: stats, index: index };
    });
  }

  function compareCategoryName(a, b) {
    return String(a.category || "").localeCompare(String(b.category || ""), "zh-Hant");
  }

  function compareWithEmptyLast(a, b, getValue, hasData) {
    var aHasData = hasData(a);
    var bHasData = hasData(b);
    if (aHasData !== bHasData) {
      return aHasData ? -1 : 1;
    }
    var delta = getValue(b) - getValue(a);
    if (delta !== 0) {
      return delta;
    }
    return compareCategoryName(a, b) || (a.index - b.index);
  }

  function riskRank(risk) {
    if (risk === "高風險") {
      return 3;
    }
    if (risk === "中等風險") {
      return 2;
    }
    return 1;
  }
  function renderCategoryCounts(data) {
    clearNode(ui.categoryCountBody);
    var categoryRows = getCategoryStatsRows(data);
    var maxTotal = Math.max.apply(null, categoryRows.map(function (item) { return item.stats.total; }).concat([1]));
    categoryRows
      .sort(function (a, b) {
        return compareWithEmptyLast(
          a,
          b,
          function (row) { return row.stats.total; },
          function (row) { return row.stats.total > 0; }
        );
      })
      .forEach(function (item) {
        var row = document.createElement("tr");
        var stats = item.stats;
        row.className = "analytics-data-card analytics-rank-card analytics-mobile-rank-row analytics-category-count-row";
        appendCell(row, item.category === "未分類" ? t("未分類") : item.category, "商品類別");
        appendMetricCell(row, String(stats.total) + t("筆"), stats.total / maxTotal, "analytics-count-meter", "商品筆數");
        ui.categoryCountBody.appendChild(row);
      });
  }

  function formatExpiredRatio(stats) {
    if (!stats || stats.total <= 0) {
      return t("無資料");
    }
    return String(Math.round((stats.expired / stats.total) * 100)) + "%";
  }

  function renderExpiredRatio(data) {
    clearNode(ui.categoryRiskBody);
    var ratioRows = getCategoryStatsRows(data);
    ratioRows
      .map(function (item) {
        item.expiredRatio = item.stats.total > 0 ? item.stats.expired / item.stats.total : null;
        return item;
      })
      .sort(function (a, b) {
        return compareWithEmptyLast(
          a,
          b,
          function (row) {
            return (row.expiredRatio === null ? -1 : row.expiredRatio * 1000000) + row.stats.expired * 100 + row.stats.total;
          },
          function (row) { return row.stats.total > 0; }
        );
      })
      .forEach(function (item) {
        var row = document.createElement("tr");
        var stats = item.stats;
        row.className = "analytics-data-card analytics-ratio-card analytics-mobile-ratio-row";
        appendCell(row, item.category === "未分類" ? t("未分類") : item.category, "商品分類");
        appendCell(row, String(stats.total), "筆數");
        appendCell(row, String(stats.expired), "過期數");
        appendMetricCell(row, formatExpiredRatio(stats), item.expiredRatio || 0, "analytics-expired-meter", "比例");
        ui.categoryRiskBody.appendChild(row);
      });
  }

  function renderAverageDays(data) {
    clearNode(ui.averageDaysBody);
    var averageRows = getCategoryStatsRows(data);
    var maxDays = Math.max.apply(null, averageRows.map(function (item) { return item.stats.dated > 0 ? Math.round(item.stats.remainingSum / item.stats.dated) : 0; }).concat([1]));
    averageRows
      .map(function (item) {
        item.averageDays = item.stats.dated > 0 ? Math.round(item.stats.remainingSum / item.stats.dated) : null;
        return item;
      })
      .sort(function (a, b) {
        return compareWithEmptyLast(
          a,
          b,
          function (row) { return row.averageDays === null ? -1 : row.averageDays; },
          function (row) { return row.averageDays !== null; }
        );
      })
      .forEach(function (item) {
        var row = document.createElement("tr");
        var value = item.averageDays !== null ? String(item.averageDays) + t("天") : t("無資料");
        var risk = item.averageDays === null ? "unknown" : (item.averageDays <= 0 ? "danger" : (item.averageDays <= 30 ? "warning" : "safe"));
        row.className = "analytics-data-card analytics-rank-card analytics-mobile-rank-row analytics-average-row risk-" + risk;
        appendCell(row, item.category === "未分類" ? t("未分類") : item.category, "商品類別");
        appendMetricCell(row, value, item.averageDays === null ? 0 : item.averageDays / maxDays, "analytics-average-meter", "平均效期天數");
        ui.averageDaysBody.appendChild(row);
      });
  }

  function heatLevel(count, maxCount) {
    if (!count || maxCount <= 0) {
      return 0;
    }
    return Math.max(1, Math.min(4, Math.ceil((count / maxCount) * 4)));
  }

  function renderHeatmap(data) {
    clearNode(ui.expiryHeatmap);
    data.monthBuckets.forEach(function (bucket) {
      var cell = document.createElement("div");
      var level = heatLevel(bucket.count, data.maxMonthCount);
      cell.className = "analytics-heat-cell heat-level-" + level;
      var label = document.createElement("span");
      label.className = "analytics-heat-label";
      label.textContent = bucket.label;
      var count = document.createElement("strong");
      count.className = "analytics-heat-count";
      count.textContent = String(bucket.count);
      var unit = document.createElement("span");
      unit.className = "analytics-heat-unit";
      unit.textContent = t("筆到期");
      cell.appendChild(label);
      cell.appendChild(count);
      cell.appendChild(unit);
      ui.expiryHeatmap.appendChild(cell);
    });
  }

  function formatBackupOverview() {
    var count = Math.max(0, Number(state.backupChangeCount) || 0);
    var status = count > 0 ? "尚未備份" : "已備份";
    return "已新增或編輯" + count + "筆商品，" + status;
  }

  function buildBackupJsonPayload(products, analyticsHistory) {
    var now = new Date().toISOString();
    return {
      schema: "expiry-manager-backup",
      version: 1,
      exportedAt: now,
      app: {
        db: APP_DB,
        mode: state.storageMode || DEFAULT_MODE
      },
      settings: {
        categories: Array.isArray(state.categories) ? state.categories : [],
        theme: localStorage.getItem("uiTheme") || "dark-1"
      },
      products: Array.isArray(products) ? products : [],
      analyticsHistory: analyticsHistory || null
    };
  }

  function normalizeFilePickerError(error) {
    if (error && error.name === "AbortError") {
      return new Error("已取消選擇檔案");
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error || "檔案寫入失敗"));
  }

  function requestBrowserSaveFile(filename) {
    if (typeof window.showSaveFilePicker !== "function") {
      var unsupportedRequest = Promise.reject(new Error("瀏覽器不支援確認檔案儲存"));
      unsupportedRequest.catch(function () {});
      return unsupportedRequest;
    }
    var request = window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: "JSON",
        accept: { "application/json": [".json"] }
      }]
    }).catch(function (error) {
      throw normalizeFilePickerError(error);
    });
    request.catch(function () {});
    return request;
  }

  async function writeBrowserFile(saveRequest, content) {
    var handle = await saveRequest;
    var writable = null;
    try {
      writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      if (writable) {
        try {
          await writable.abort();
        } catch (abortError) {
          // 寫入已關閉時無需額外處理。
        }
      }
      throw normalizeFilePickerError(error);
    }
  }

  async function downloadJson(filename, payloadObj, browserSaveRequest) {
    var content = JSON.stringify(payloadObj, null, 2);
    if (nativeBridge && typeof nativeBridge.exportJson === "function") {
      await nativeBridge.exportJson(filename, content);
      return;
    }
    await writeBrowserFile(browserSaveRequest, content);
  }

  async function backupJsonFromAnalytics(filename, browserSaveRequest) {
    var payload = buildBackupJsonPayload(state.products, state.history);
    await downloadJson(filename, payload, browserSaveRequest);
    await setSetting("indexedDbAddCountSinceBackup", 0);
    await setSetting(BACKUP_CHANGE_COUNT_KEY, 0);
    state.backupChangeCount = 0;
    if (ui.backupOverview) {
      ui.backupOverview.textContent = formatBackupOverview();
    }
  }

  function renderHistoryTables() {
    var rows = window.AnalyticsHistoryStore ? window.AnalyticsHistoryStore.monthRows(state.history || {}) : [];
    clearNode(ui.monthlyExpiryHistoryBody);
    clearNode(ui.categoryHistoryBody);
    var recent = rows.slice(-12);
    if (!recent.length) {
      var empty = document.createElement("tr"); appendCell(empty, t("尚無歷史紀錄"), "月份"); appendCell(empty, "-", "過期數"); appendCell(empty, "-", "過期率"); ui.monthlyExpiryHistoryBody.appendChild(empty);
      return;
    }
    recent.forEach(function (month) {
      var total = Object.keys(month.distribution || {}).reduce(function (sum, key) { return sum + (Number(month.distribution[key]) || 0); }, 0);
      var rateValue = total > 0 ? (Number(month.expired) || 0) / total : 0;
      var rate = total > 0 ? String(Math.round(rateValue * 100)) + "%" : t("無資料");
      var row = document.createElement("tr");
      row.className = "analytics-data-card analytics-history-card analytics-mobile-history-row";
      appendCell(row, month.monthKey, "月份");
      appendCell(row, String(month.expired || 0), "過期數");
      appendMetricCell(row, rate, rateValue, "analytics-history-meter", "過期率");
      ui.monthlyExpiryHistoryBody.appendChild(row);
    });
    var categories = {};
    rows.forEach(function (month) { Object.keys(month.categories || {}).forEach(function (key) { var source = month.categories[key] || {}; if (!categories[key]) categories[key] = { added: 0, expired: 0, deleted: 0 }; categories[key].added += Number(source.added) || 0; categories[key].expired += Number(source.expired) || 0; categories[key].deleted += Number(source.deleted) || 0; }); });
    Object.keys(categories).sort(function (a, b) { return categories[b].expired - categories[a].expired || String(a).localeCompare(String(b)); }).forEach(function (key) {
      var item = categories[key];
      var row = document.createElement("tr");
      row.className = "analytics-data-card analytics-history-category-card analytics-mobile-history-category-row";
      appendCell(row, key === "未分類" ? t("未分類") : key, "分類");
      appendCell(row, String(item.added), "新增數");
      appendCell(row, String(item.expired), "過期數");
      appendCell(row, String(item.deleted), "刪除數");
      ui.categoryHistoryBody.appendChild(row);
    });
  }
  function renderAnalytics() {
    var data = buildAnalytics(state.products, state.categories);
    if (ui.expiryOverview) {
      ui.expiryOverview.textContent = formatOverview(data.overview);
    }
    renderOverviewMetrics(data.overview);
    if (ui.backupOverview) {
      ui.backupOverview.textContent = formatBackupOverview();
    }
    renderCategoryCounts(data);
    renderHeatmap(data);
    renderExpiredRatio(data);
    renderAverageDays(data);
    renderHistoryTables();
  }

  async function loadData() {
    var storageState = await loadStorageState(DEFAULT_MODE);
    state.storageMode = storageState.storageMode;
    state.fileHandle = storageState.fileHandle;
    state.categories = await getCategories();
    state.backupChangeCount = Number(await getSetting(BACKUP_CHANGE_COUNT_KEY)) || 0;
    var result = await loadProductsForCurrentStorage({
      storageMode: state.storageMode,
      fileHandle: state.fileHandle
    });
    state.products = Array.isArray(result.products) ? result.products : [];
    state.source = result.source;
    state.history = window.AnalyticsHistoryStore ? await window.AnalyticsHistoryStore.load() : null;
    if (ui.fallbackNotice) {
      ui.fallbackNotice.classList.toggle("hidden", result.source !== "indexeddb-fallback");
    }
  }

  async function finishAppBoot() {
    if (!window.AppBoot || typeof window.AppBoot.ready !== "function") {
      return;
    }
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_error) {
      }
    }
    window.AppBoot.ready();
    if (window.AppRouter && typeof window.AppRouter.markRouteReady === "function") {
      window.AppRouter.markRouteReady("analytics");
    }
  }

  function clearLoadedAnalyticsData() {
    state.products = [];
    state.categories = [];
    state.fileHandle = null;
    state.source = "indexeddb";
    state.backupChangeCount = 0;
  }

  function goBackToHome() {
    if (window.AppRouter && window.AppRouter.isActive && window.AppRouter.isActive()) {
      window.AppRouter.navigate("home", { replace: true });
      return;
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.prepareTransitionCover === "function") {
      try {
        window.AndroidBridge.prepareTransitionCover();
      } catch (_error) {
      }
      window.setTimeout(function () {
        window.location.href = "./inventory-management-app.html";
      }, 120);
      return;
    }
    window.location.href = "./inventory-management-app.html";
  }

  window.AppNativeBack = {
    handleBack: function () {
      goBackToHome();
      return true;
    }
  };

  window.AppAnalyticsPage = {
    prepareRoute: function () {
      return loadData().then(function () {
        renderAnalytics();
        if (window.AppI18n && typeof window.AppI18n.translateDocument === "function") {
          window.AppI18n.translateDocument();
        }
      });
    }
  };

  async function init() {
    syncDocumentTitle();
    if (ui.exportJsonBtn) {
      ui.exportJsonBtn.addEventListener("click", function () {
        var today = new Date().toISOString().slice(0, 10);
        var filename = "expiry-backup-" + today + ".json";
        var browserSaveRequest = nativeBridge ? null : requestBrowserSaveFile(filename);
        backupJsonFromAnalytics(filename, browserSaveRequest).then(function () {
          showToast("JSON 備份成功");
        }).catch(function (error) {
          showToast("JSON 備份失敗: " + (error && error.message ? error.message : String(error)), true);
        });
      });
    }
    window.addEventListener("error", function (event) {
      var msg = event && event.error && event.error.message
        ? event.error.message
        : (event && event.message ? event.message : "程式發生未預期錯誤");
      showErrorModal(msg);
    });
    window.addEventListener("unhandledrejection", function (event) {
      var reason = event && event.reason;
      var msg = reason && reason.message ? reason.message : String(reason || "程式發生未處理錯誤");
      showErrorModal(msg);
    });
    window.addEventListener("pagehide", clearLoadedAnalyticsData);
    window.addEventListener("beforeunload", clearLoadedAnalyticsData);
    await loadData();
    renderAnalytics();
    if (window.AppI18n && typeof window.AppI18n.translateDocument === "function") {
      window.AppI18n.translateDocument();
    }
    await finishAppBoot();
  }

  init().catch(function (error) {
    showErrorModal(error && error.message ? error.message : String(error || "程式發生未預期錯誤"));
    finishAppBoot();
  });
})();
