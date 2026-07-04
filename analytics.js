(function () {
  "use strict";

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
    backupChangeCount: 0
  };

  var ui = {
    fallbackNotice: document.getElementById("analyticsFallbackNotice"),
    expiryOverview: document.getElementById("expiryOverview"),
    backupOverview: document.getElementById("backupOverview"),
    categoryCountBody: document.getElementById("categoryCountBody"),
    expiryHeatmap: document.getElementById("expiryHeatmap"),
    categoryRiskBody: document.getElementById("categoryRiskBody"),
    averageDaysBody: document.getElementById("averageDaysBody"),
    errorModal: document.getElementById("errorModal"),
    errorModalMessage: document.getElementById("errorModalMessage"),
    closeErrorModalBtn: document.getElementById("closeErrorModalBtn"),
    toast: document.getElementById("toast")
  };

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
    }, 2400);
  }

  function showErrorModal(message) {
    if (!ui.errorModal || !ui.errorModalMessage) {
      showToast(message || "程式發生未預期錯誤", true);
      return;
    }
    ui.errorModalMessage.textContent = t(message || "程式發生未預期錯誤");
    ui.errorModal.classList.remove("hidden");
  }

  function closeErrorModal() {
    if (ui.errorModal) {
      ui.errorModal.classList.add("hidden");
    }
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

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function appendCell(row, text, label) {
    var cell = document.createElement("td");
    if (label) {
      cell.setAttribute("data-label", t(label));
    }
    cell.textContent = text;
    row.appendChild(cell);
  }

  function renderCategoryCounts(data) {
    clearNode(ui.categoryCountBody);
    data.categories.forEach(function (category) {
      var row = document.createElement("tr");
      var stats = data.statsByCategory[category] || createEmptyStats(category);
      appendCell(row, category === "未分類" ? t("未分類") : category, "商品類別");
      appendCell(row, String(stats.total) + t("筆"), "商品筆數");
      ui.categoryCountBody.appendChild(row);
    });
  }

  function riskForStats(stats) {
    if (!stats || stats.total <= 0) {
      return "低風險";
    }
    var ratio30 = stats.within30 / stats.total;
    var ratio60 = (stats.within30 + stats.within60) / stats.total;
    var urgentCount = stats.expired + stats.within30;
    if (ratio30 >= 0.5 || urgentCount >= 10) {
      return "高風險";
    }
    if (ratio30 >= 0.2 || ratio60 >= 0.4) {
      return "中等風險";
    }
    return "低風險";
  }

  function renderRisk(data) {
    clearNode(ui.categoryRiskBody);
    data.categories.forEach(function (category) {
      var row = document.createElement("tr");
      var stats = data.statsByCategory[category] || createEmptyStats(category);
      var risk = riskForStats(stats);
      appendCell(row, category === "未分類" ? t("未分類") : category, "商品類別");
      appendCell(row, t(risk), "風險評估");
      row.className = "analytics-risk-row analytics-risk-" + (risk === "高風險" ? "high" : (risk === "中等風險" ? "medium" : "low"));
      ui.categoryRiskBody.appendChild(row);
    });
  }

  function renderAverageDays(data) {
    clearNode(ui.averageDaysBody);
    data.categories.forEach(function (category) {
      var row = document.createElement("tr");
      var stats = data.statsByCategory[category] || createEmptyStats(category);
      var value = stats.dated > 0 ? String(Math.round(stats.remainingSum / stats.dated)) + t("天") : t("無資料");
      appendCell(row, category === "未分類" ? t("未分類") : category, "商品類別");
      appendCell(row, value, "平均效期天數");
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

  function renderAnalytics() {
    var data = buildAnalytics(state.products, state.categories);
    ui.expiryOverview.textContent = formatOverview(data.overview);
    if (ui.backupOverview) {
      ui.backupOverview.textContent = formatBackupOverview();
    }
    renderCategoryCounts(data);
    renderHeatmap(data);
    renderRisk(data);
    renderAverageDays(data);
  }

  async function loadData() {
    var storageState = await window.AppDataStore.loadStorageState(DEFAULT_MODE);
    state.storageMode = storageState.storageMode;
    state.fileHandle = storageState.fileHandle;
    state.categories = await window.AppDataStore.getCategories();
    state.backupChangeCount = Number(await window.AppDataStore.getSetting(BACKUP_CHANGE_COUNT_KEY)) || 0;
    var result = await window.AppDataStore.loadProductsForCurrentStorage({
      storageMode: state.storageMode,
      fileHandle: state.fileHandle
    });
    state.products = Array.isArray(result.products) ? result.products : [];
    state.source = result.source;
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
  }

  function goBackToSettings() {
    window.location.href = "./settings.html";
  }

  window.AppNativeBack = {
    handleBack: function () {
      goBackToSettings();
      return true;
    }
  };

  async function init() {
    syncDocumentTitle();
    if (ui.closeErrorModalBtn) {
      ui.closeErrorModalBtn.addEventListener("click", closeErrorModal);
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