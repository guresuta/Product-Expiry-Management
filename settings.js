(function () {
  "use strict";

  const APP_DB = "expiry_manager_app";
  const APP_DB_VERSION = 1;
  const STORE_PRODUCTS = "products";
  const STORE_SETTINGS = "settings";
  const MODE_SETTING_KEY = "storageMode";
  const THEME_SETTING_KEY = "uiTheme";
  const CATEGORY_SETTING_KEY = "categories";
  const THEME_PRESETS = [
    { key: "light", mode: "light", label: "香莢蘭白", swatch: "linear-gradient(120deg,#fcfaf2,#f5f1e3)" },
    { key: "light-2", mode: "light", label: "蝶豆花藍", swatch: "linear-gradient(120deg,#eef2ff,#dfe8ff)" },
    { key: "light-3", mode: "light", label: "薄荷淺綠", swatch: "linear-gradient(120deg,#ecf9f4,#e9f2ff)" },
    { key: "light-4", mode: "light", label: "粉紅風鈴", swatch: "linear-gradient(120deg,#ffeef5,#f6e9f1)" },
    { key: "light-5", mode: "light", label: "綠豆沙褐", swatch: "linear-gradient(120deg,#fff4e9,#f6ecdf)" },
    { key: "light-6", mode: "light", label: "薰衣草紫", swatch: "linear-gradient(120deg,#f7efff,#efe4fb)" },
    { key: "dark", mode: "dark", label: "黑巧克力", swatch: "linear-gradient(120deg,#2d2c29,#383632)" },
    { key: "dark-2", mode: "dark", label: "青木原海", swatch: "linear-gradient(120deg,#1a2b25,#23362e)" },
    { key: "dark-3", mode: "dark", label: "黑鳶尾花", swatch: "linear-gradient(120deg,#161e2b,#1e2a3d)" },
    { key: "dark-4", mode: "dark", label: "紅紫蘇葉", swatch: "linear-gradient(120deg,#2b1a1a,#3d2222)" },
    { key: "dark-5", mode: "dark", label: "義式珈琲", swatch: "linear-gradient(120deg,#2b231a,#3d3122)" },
    { key: "dark-6", mode: "dark", label: "紫非洲菫", swatch: "linear-gradient(120deg,#241a2f,#352348)" }
  ];

  const state = {
    storageMode: "file",
    fileHandle: null,
    categories: []
  };

  const nativeBridge = createNativeBridge();

  const ui = {
    chooseLightThemeBtn: document.getElementById("chooseLightThemeBtn"),
    chooseDarkThemeBtn: document.getElementById("chooseDarkThemeBtn"),
    themeCurrentLabel: document.getElementById("themeCurrentLabel"),
    themePickerModal: document.getElementById("themePickerModal"),
    themePickerTitle: document.getElementById("themePickerTitle"),
    themeOptions: document.getElementById("themeOptions"),
    closeThemePickerBtn: document.getElementById("closeThemePickerBtn"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    exportJsonBtn: document.getElementById("exportJsonBtn"),
    importCsvFileInput: document.getElementById("importCsvFileInput"),
    importCsvFileBtn: document.getElementById("importCsvFileBtn"),
    importJsonFileInput: document.getElementById("importJsonFileInput"),
    importJsonFileBtn: document.getElementById("importJsonFileBtn"),
    newCategoryInput: document.getElementById("newCategoryInput"),
    addCategoryBtn: document.getElementById("addCategoryBtn"),
    categoryList: document.getElementById("categoryList"),
    errorModal: document.getElementById("errorModal"),
    errorModalMessage: document.getElementById("errorModalMessage"),
    closeErrorModalBtn: document.getElementById("closeErrorModalBtn"),
    toast: document.getElementById("toast")
  };

  let themePickerMode = "light";
  let categoryPressTimer = null;
  let categoryPressChip = null;
  let categoryDraggingChip = null;
  let categoryDragActive = false;
  let categoryStartX = 0;
  let categoryStartY = 0;

  const CATEGORY_LONG_PRESS_MS = 420;
  const CATEGORY_MOVE_TOLERANCE = 10;

  function createNativeBridge() {
    if (!window.AndroidBridge) {
      return null;
    }
    const bridge = window.AndroidBridge;
    if (
      typeof bridge.hasSelectedDbFile !== "function" ||
      typeof bridge.readDatabaseFile !== "function" ||
      typeof bridge.writeDatabaseFile !== "function"
    ) {
      return null;
    }
    return {
      hasFile() {
        try {
          return !!bridge.hasSelectedDbFile();
        } catch (_error) {
          return false;
        }
      },
      async writeFileText(text) {
        const ok = bridge.writeDatabaseFile(String(text));
        if (!ok) {
          throw new Error("寫入檔案失敗");
        }
      },
      exportCsv(filename, content) {
        return new Promise((resolve, reject) => {
          if (typeof bridge.requestExportCsvFile !== "function") {
            reject(new Error("裝置不支援原生 CSV 匯出"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-csv-exported", handler);
            const detail = event.detail || {};
            if (detail.ok) {
              resolve(true);
            } else {
              reject(new Error(detail.error || "CSV 匯出失敗"));
            }
          };
          window.addEventListener("android-csv-exported", handler, { once: true });
          try {
            bridge.requestExportCsvFile(String(filename || "expiry-products.csv"), String(content || ""));
          } catch (error) {
            window.removeEventListener("android-csv-exported", handler);
            reject(error);
          }
        });
      }
    };
  }

  function isNativeFileMode() {
    return !!nativeBridge;
  }

  function showToast(message, isError = false) {
    if (isError) {
      showErrorModal(message);
      return;
    }
    ui.toast.textContent = message;
    ui.toast.style.background = isError ? "#9b1c1c" : "#2d3f5f";
    ui.toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2600);
  }

  function showErrorModal(message) {
    const text = String(message || "發生未知錯誤");
    if (!ui.errorModal || !ui.errorModalMessage) {
      alert(text);
      return;
    }
    ui.errorModalMessage.textContent = text;
    ui.errorModal.classList.remove("hidden");
  }

  function closeErrorModal() {
    if (ui.errorModal) {
      ui.errorModal.classList.add("hidden");
    }
  }

  function findThemePreset(themeKey) {
    return THEME_PRESETS.find((item) => item.key === themeKey) || THEME_PRESETS[0];
  }

  function updateThemeCurrentLabel(themeKey) {
    if (!ui.themeCurrentLabel) {
      return;
    }
    const preset = findThemePreset(themeKey);
    ui.themeCurrentLabel.textContent = `目前主題：${preset.label}`;
  }

  function applyTheme(themeKey) {
    const preset = findThemePreset(themeKey);
    document.documentElement.setAttribute("data-theme", preset.key);
    localStorage.setItem(THEME_SETTING_KEY, preset.key);
    updateThemeCurrentLabel(preset.key);
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_SETTING_KEY) || "light";
    const preset = findThemePreset(saved);
    applyTheme(preset.key);
  }

  function renderThemeOptions(mode) {
    if (!ui.themeOptions) {
      return;
    }
    const current = localStorage.getItem(THEME_SETTING_KEY) || "light";
    const options = THEME_PRESETS.filter((item) => item.mode === mode);
    ui.themeOptions.innerHTML = "";
    options.forEach((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-option-btn";
      if (option.key === current) {
        btn.classList.add("active");
      }
      btn.setAttribute("data-theme-key", option.key);
      btn.innerHTML = `
        <span class="theme-swatch" style="background:${option.swatch}"></span>
        <span class="theme-option-label">${escapeHtml(option.label)}</span>
      `;
      ui.themeOptions.appendChild(btn);
    });
  }

  function openThemePicker(mode) {
    themePickerMode = mode === "dark" ? "dark" : "light";
    if (ui.themePickerTitle) {
      ui.themePickerTitle.textContent = themePickerMode === "dark" ? "選擇黑暗主題" : "選擇明亮主題";
    }
    renderThemeOptions(themePickerMode);
    if (ui.themePickerModal) {
      ui.themePickerModal.classList.remove("hidden");
    }
  }

  function closeThemePicker() {
    if (ui.themePickerModal) {
      ui.themePickerModal.classList.add("hidden");
    }
  }

  function setThemeByKey(themeKey) {
    const target = findThemePreset(themeKey);
    if (!target || target.mode !== themePickerMode) {
      return;
    }
    applyTheme(target.key);
    closeThemePicker();
    showToast(`已套用 ${target.label}`);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(APP_DB, APP_DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function withStore(storeName, mode, workFn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const output = workFn(store, tx);
      tx.oncomplete = () => {
        db.close();
        resolve(output);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error("transaction aborted"));
      };
    });
  }

  async function getSetting(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, "readonly");
      const req = tx.objectStore(STORE_SETTINGS).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    });
  }

  async function setSetting(key, value) {
    await withStore(STORE_SETTINGS, "readwrite", (store) => {
      store.put({ key, value });
    });
  }

  async function getCategories() {
    const saved = await getSetting(CATEGORY_SETTING_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return ["糖果", "零食", "泡麵", "調味品", "常溫飲料", "啤酒", "冷凍食品", "冰品", "健美機能", "國際精品", "日用品", "量販", "區域商品"];
  }

  async function setCategories(categories) {
    await setSetting(CATEGORY_SETTING_KEY, categories);
  }

  function renderCategories() {
    ui.categoryList.innerHTML = "";
    state.categories.forEach((category) => {
      const chip = document.createElement("div");
      chip.className = "category-chip";
      chip.setAttribute("data-category", category);
      chip.innerHTML = `
        <span>${escapeHtml(category)}</span>
        <button class="chip-delete" type="button" data-delete-category="${escapeHtml(category)}" aria-label="刪除分類">×</button>
      `;
      ui.categoryList.appendChild(chip);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cancelCategoryPressTimer() {
    clearTimeout(categoryPressTimer);
    categoryPressTimer = null;
  }

  function resetCategoryDragState() {
    if (categoryDraggingChip) {
      categoryDraggingChip.classList.remove("is-dragging");
    }
    if (ui.categoryList) {
      ui.categoryList.classList.remove("is-reordering");
    }
    categoryPressChip = null;
    categoryDraggingChip = null;
    categoryDragActive = false;
    cancelCategoryPressTimer();
  }

  function findCategoryChipFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el || !el.closest) {
      return null;
    }
    const chip = el.closest(".category-chip");
    if (!chip || chip.parentElement !== ui.categoryList) {
      return null;
    }
    return chip;
  }

  function applyCategoryDomOrderToState() {
    const ordered = Array.from(ui.categoryList.querySelectorAll(".category-chip"))
      .map((chip) => String(chip.getAttribute("data-category") || "").trim())
      .filter(Boolean);
    if (ordered.length === state.categories.length) {
      state.categories = ordered;
    }
  }

  async function getAllProductsFromIndexedDb() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PRODUCTS, "readonly");
      const req = tx.objectStore(STORE_PRODUCTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    });
  }

  async function replaceAllProductsIndexedDb(products) {
    await withStore(STORE_PRODUCTS, "readwrite", (store) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        products.forEach((product) => store.put(product));
      };
    });
  }

  function serializeProductsPayload(products) {
    return JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        products
      },
      null,
      2
    );
  }

  async function hasSelectedFile() {
    if (isNativeFileMode()) {
      return nativeBridge.hasFile();
    }
    return !!state.fileHandle;
  }

  async function writeProductsToSelectedFile(products) {
    const payload = serializeProductsPayload(products);
    if (isNativeFileMode()) {
      await nativeBridge.writeFileText(payload);
      return;
    }
    const writer = await state.fileHandle.createWritable();
    await writer.write(payload);
    await writer.close();
  }

  function normalizeDateInput(raw) {
    const value = String(raw || "").trim();
    const m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) {
      return null;
    }
    const y = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (y < 1900 || y > 3000 || mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      return null;
    }
    return `${String(y).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  function parseCsv(text) {
    const normalizedText = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let i = 0; i < normalizedText.length; i += 1) {
      const ch = normalizedText[i];
      const next = normalizedText[i + 1];
      if (ch === "\"") {
        if (inQuotes && next === "\"") {
          value += "\"";
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        row.push(value);
        value = "";
      } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
        if (ch === "\r" && next === "\n") {
          i += 1;
        }
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      } else {
        value += ch;
      }
    }
    if (value.length > 0 || row.length > 0) {
      row.push(value);
      rows.push(row);
    }
    return rows;
  }

  async function readSelectedCsvText() {
    const file = ui.importCsvFileInput.files && ui.importCsvFileInput.files[0];
    if (!file) {
      throw new Error("請先選擇 CSV 檔案");
    }
    const filename = String(file.name || "").toLowerCase();
    if (filename && !filename.endsWith(".csv") && !filename.endsWith(".scv")) {
      throw new Error("檔案格式錯誤，請上傳 .csv 或 .scv");
    }
    if (typeof file.text === "function") {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("檔案讀取失敗"));
      reader.readAsText(file);
    });
  }

  function buildProductsFromCsvRows(rows) {
    if (rows.length < 2) {
      throw new Error("CSV 內容不足，至少需有標題列與一筆資料");
    }
    const header = rows[0].map((item) => item.trim().toLowerCase());
    const idx = {
      category: header.findIndex((h) => h === "分類" || h === "category"),
      name: header.findIndex((h) => h === "商品名稱" || h === "name"),
      barcode: header.findIndex((h) => h === "條碼" || h === "barcode"),
      expiryDate: header.findIndex((h) => h === "有效日期" || h === "expirydate" || h === "expiry_date")
    };
    if (idx.category < 0 || idx.name < 0 || idx.barcode < 0 || idx.expiryDate < 0) {
      throw new Error("CSV 標題需包含 分類、商品名稱、條碼、有效日期");
    }

    const output = [];
    rows.slice(1).forEach((row) => {
      const category = (row[idx.category] || "").trim();
      const name = (row[idx.name] || "").trim();
      const barcode = (row[idx.barcode] || "").trim();
      const expiryRaw = (row[idx.expiryDate] || "").trim();
      const expiryDate = normalizeDateInput(expiryRaw);
      if (!category || !name || !barcode || !expiryDate) {
        return;
      }
      output.push({
        id: typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        category,
        name,
        barcode,
        expiryDate,
        createdAt: new Date().toISOString()
      });
    });
    if (output.length === 0) {
      throw new Error("CSV 無有效商品資料");
    }
    return output;
  }

  function productIdentityKey(item) {
    const category = String(item.category || "").trim().toLowerCase();
    const name = String(item.name || "").trim().toLowerCase();
    const barcode = String(item.barcode || "").trim();
    const expiryDate = String(item.expiryDate || "").trim();
    return `${category}|${name}|${barcode}|${expiryDate}`;
  }

  function mergeProductsKeepExisting(existingProducts, importedProducts) {
    const merged = Array.isArray(existingProducts) ? [...existingProducts] : [];
    const seen = new Set(merged.map((item) => productIdentityKey(item)));
    (Array.isArray(importedProducts) ? importedProducts : []).forEach((item) => {
      const key = productIdentityKey(item);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(item);
    });
    return merged;
  }

  function toCsv(products) {
    const header = ["分類", "商品名稱", "條碼", "有效日期", "狀態"];
    const lines = [header.join(",")];
    products.forEach((item) => {
      const escaped = [
        item.category,
        item.name,
        item.barcode,
        item.expiryDate,
        ""
      ].map((v) => `"${String(v || "").replaceAll("\"", "\"\"")}"`);
      lines.push(escaped.join(","));
    });
    return lines.join("\r\n");
  }

  function buildBackupJsonPayload(products) {
    const now = new Date().toISOString();
    return {
      schema: "expiry-manager-backup",
      version: 1,
      exportedAt: now,
      app: {
        db: APP_DB,
        mode: state.storageMode || "file"
      },
      settings: {
        categories: Array.isArray(state.categories) ? state.categories : [],
        theme: localStorage.getItem(THEME_SETTING_KEY) || "light"
      },
      products: Array.isArray(products) ? products : []
    };
  }

  async function downloadJson(filename, payloadObj) {
    const content = JSON.stringify(payloadObj, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function readSelectedJsonText() {
    const file = ui.importJsonFileInput.files && ui.importJsonFileInput.files[0];
    if (!file) {
      throw new Error("請先選擇 JSON 檔案");
    }
    const filename = String(file.name || "").toLowerCase();
    if (filename && !filename.endsWith(".json")) {
      throw new Error("檔案格式錯誤，請上傳 .json");
    }
    if (typeof file.text === "function") {
      return file.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("檔案讀取失敗"));
      reader.readAsText(file);
    });
  }

  function parseBackupProducts(rawProducts) {
    if (!Array.isArray(rawProducts)) {
      throw new Error("JSON 內容缺少 products 陣列");
    }
    const output = [];
    rawProducts.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }
      const category = String(item.category || "").trim();
      const name = String(item.name || "").trim();
      const barcode = String(item.barcode || "").trim();
      const expiryDate = normalizeDateInput(item.expiryDate);
      if (!category || !name || !barcode || !expiryDate) {
        return;
      }
      output.push({
        id: item.id
          ? String(item.id)
          : (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`),
        category,
        name,
        barcode,
        expiryDate,
        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString()
      });
    });
    return output;
  }

  async function restoreFromBackupJson(text) {
    let parsed;
    try {
      parsed = JSON.parse(String(text || ""));
    } catch (_error) {
      throw new Error("JSON 內容格式錯誤");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("JSON 內容無效");
    }

    const importedProducts = parseBackupProducts(parsed.products);
    const existingProducts = await getAllProductsFromIndexedDb();
    const mergedProducts = mergeProductsKeepExisting(existingProducts, importedProducts);
    const addedCount = Math.max(0, mergedProducts.length - existingProducts.length);

    const ok = window.confirm(`將新增 ${addedCount} 筆商品資料，是否繼續還原？`);
    if (!ok) {
      return { addedCount: 0, totalCount: existingProducts.length, cancelled: true };
    }

    await replaceAllProductsIndexedDb(mergedProducts);

    const existingCategories = Array.isArray(state.categories) ? state.categories : [];
    const backupCategories = parsed.settings && Array.isArray(parsed.settings.categories)
      ? parsed.settings.categories.map((c) => String(c || "").trim()).filter(Boolean)
      : [];
    const derivedCategories = Array.from(new Set(mergedProducts.map((p) => p.category)));
    const categories = Array.from(new Set([...existingCategories, ...backupCategories, ...derivedCategories]));
    if (categories.length > 0) {
      state.categories = categories;
      await setCategories(state.categories);
      renderCategories();
    }

    const backupTheme = parsed.settings && parsed.settings.theme ? String(parsed.settings.theme) : "";
    if (backupTheme) {
      applyTheme(backupTheme);
    }

    if (await hasSelectedFile()) {
      await writeProductsToSelectedFile(mergedProducts);
    }

    return { addedCount, totalCount: mergedProducts.length, cancelled: false };
  }

  async function downloadCsv(filename, content) {
    if (isNativeFileMode() && typeof nativeBridge.exportCsv === "function") {
      await nativeBridge.exportCsv(filename, content);
      return;
    }
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function loadInitialState() {
    const savedMode = await getSetting(MODE_SETTING_KEY);
    if (savedMode === "file" || savedMode === "indexeddb") {
      state.storageMode = savedMode;
    } else {
      state.storageMode = isNativeFileMode() ? "file" : "indexeddb";
      await setSetting(MODE_SETTING_KEY, state.storageMode);
    }

    state.categories = await getCategories();
    renderCategories();
  }

  function wireEvents() {
    if (ui.closeErrorModalBtn) {
      ui.closeErrorModalBtn.addEventListener("click", closeErrorModal);
    }
    if (ui.errorModal) {
      ui.errorModal.addEventListener("click", (event) => {
        if (event.target === ui.errorModal) {
          closeErrorModal();
        }
      });
    }

    if (ui.chooseLightThemeBtn) {
      ui.chooseLightThemeBtn.addEventListener("click", () => openThemePicker("light"));
    }
    if (ui.chooseDarkThemeBtn) {
      ui.chooseDarkThemeBtn.addEventListener("click", () => openThemePicker("dark"));
    }
    if (ui.closeThemePickerBtn) {
      ui.closeThemePickerBtn.addEventListener("click", closeThemePicker);
    }
    if (ui.themePickerModal) {
      ui.themePickerModal.addEventListener("click", (event) => {
        if (event.target === ui.themePickerModal) {
          closeThemePicker();
          return;
        }
        const button = event.target.closest("button[data-theme-key]");
        if (!button) {
          return;
        }
        const key = button.getAttribute("data-theme-key");
        if (!key) {
          return;
        }
        setThemeByKey(key);
      });
    }

    ui.exportCsvBtn.addEventListener("click", async () => {
      try {
        const products = await getAllProductsFromIndexedDb();
        const csv = toCsv(products);
        const today = new Date().toISOString().slice(0, 10);
        await downloadCsv(`expiry-products-${today}.csv`, csv);
        showToast("CSV 匯出成功");
      } catch (error) {
        showToast(`匯出失敗: ${error.message}`, true);
      }
    });

    if (ui.exportJsonBtn) {
      ui.exportJsonBtn.addEventListener("click", async () => {
        try {
          const products = await getAllProductsFromIndexedDb();
          const payload = buildBackupJsonPayload(products);
          const today = new Date().toISOString().slice(0, 10);
          await downloadJson(`expiry-backup-${today}.json`, payload);
          showToast("JSON 備份成功");
        } catch (error) {
          showToast(`JSON 備份失敗: ${error.message}`, true);
        }
      });
    }

    ui.importCsvFileBtn.addEventListener("click", async () => {
      if (ui.importCsvFileInput) {
        ui.importCsvFileInput.click();
      }
    });

    ui.importCsvFileInput.addEventListener("change", async () => {
      try {
        const csvText = await readSelectedCsvText();
        const rows = parseCsv(csvText);
        const importedProducts = buildProductsFromCsvRows(rows);
        const existingProducts = await getAllProductsFromIndexedDb();
        const products = mergeProductsKeepExisting(existingProducts, importedProducts);
        await replaceAllProductsIndexedDb(products);

        const importedCategories = Array.from(new Set(products.map((p) => p.category)));
        state.categories = Array.from(new Set([...state.categories, ...importedCategories]));
        await setCategories(state.categories);
        renderCategories();

        if (await hasSelectedFile()) {
          await writeProductsToSelectedFile(products);
        }

        const addedCount = Math.max(0, products.length - existingProducts.length);
        showToast(`匯入成功，新增 ${addedCount} 筆，目前共 ${products.length} 筆`);
        ui.importCsvFileInput.value = "";
      } catch (error) {
        showToast(`匯入失敗: ${error.message}`, true);
        ui.importCsvFileInput.value = "";
      }
    });

    if (ui.importJsonFileBtn) {
      ui.importJsonFileBtn.addEventListener("click", async () => {
        if (ui.importJsonFileInput) {
          ui.importJsonFileInput.click();
        }
      });
    }

    if (ui.importJsonFileInput) {
      ui.importJsonFileInput.addEventListener("change", async () => {
        try {
          const jsonText = await readSelectedJsonText();
          const result = await restoreFromBackupJson(jsonText);
          if (result.cancelled) {
            showToast("已取消 JSON 還原");
            ui.importJsonFileInput.value = "";
            return;
          }
          showToast(`JSON 還原成功，新增 ${result.addedCount} 筆，目前共 ${result.totalCount} 筆商品`);
          ui.importJsonFileInput.value = "";
        } catch (error) {
          showToast(`JSON 還原失敗: ${error.message}`, true);
          ui.importJsonFileInput.value = "";
        }
      });
    }

    ui.addCategoryBtn.addEventListener("click", async () => {
      const value = ui.newCategoryInput.value.trim();
      if (!value) {
        showToast("請輸入分類名稱", true);
        return;
      }
      if (state.categories.includes(value)) {
        showToast("分類已存在", true);
        return;
      }
      state.categories.push(value);
      try {
        await setCategories(state.categories);
        renderCategories();
        ui.newCategoryInput.value = "";
        showToast("分類已新增");
      } catch (error) {
        showToast(`新增失敗: ${error.message}`, true);
      }
    });

    ui.categoryList.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-delete-category]");
      if (!button) {
        return;
      }
      const category = button.getAttribute("data-delete-category");
      if (!category) {
        return;
      }
      if (state.categories.length <= 1) {
        showToast("至少需保留一個分類", true);
        return;
      }
      state.categories = state.categories.filter((item) => item !== category);
      try {
        await setCategories(state.categories);
        renderCategories();
        showToast("分類已刪除");
      } catch (error) {
        showToast(`刪除失敗: ${error.message}`, true);
      }
    });

    ui.categoryList.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      if (event.target && event.target.closest && event.target.closest(".chip-delete")) {
        return;
      }
      const chip = event.target && event.target.closest ? event.target.closest(".category-chip") : null;
      if (!chip || chip.parentElement !== ui.categoryList) {
        return;
      }
      categoryPressChip = chip;
      categoryStartX = Number(event.clientX) || 0;
      categoryStartY = Number(event.clientY) || 0;
      cancelCategoryPressTimer();
      categoryPressTimer = setTimeout(() => {
        categoryDragActive = true;
        categoryDraggingChip = categoryPressChip;
        if (categoryDraggingChip) {
          categoryDraggingChip.classList.add("is-dragging");
        }
        ui.categoryList.classList.add("is-reordering");
      }, CATEGORY_LONG_PRESS_MS);
    });

    ui.categoryList.addEventListener("pointermove", (event) => {
      if (!categoryPressChip) {
        return;
      }
      const x = Number(event.clientX) || 0;
      const y = Number(event.clientY) || 0;
      if (!categoryDragActive) {
        const dx = Math.abs(x - categoryStartX);
        const dy = Math.abs(y - categoryStartY);
        if (dx > CATEGORY_MOVE_TOLERANCE || dy > CATEGORY_MOVE_TOLERANCE) {
          cancelCategoryPressTimer();
          categoryPressChip = null;
        }
        return;
      }
      event.preventDefault();
      const targetChip = findCategoryChipFromPoint(x, y);
      if (!targetChip || !categoryDraggingChip || targetChip === categoryDraggingChip) {
        return;
      }
      const targetRect = targetChip.getBoundingClientRect();
      const insertAfter = x > targetRect.left + targetRect.width / 2;
      if (insertAfter) {
        ui.categoryList.insertBefore(categoryDraggingChip, targetChip.nextSibling);
      } else {
        ui.categoryList.insertBefore(categoryDraggingChip, targetChip);
      }
    });

    const finalizeCategoryReorder = async () => {
      const didReorder = categoryDragActive;
      resetCategoryDragState();
      if (!didReorder) {
        return;
      }
      applyCategoryDomOrderToState();
      try {
        await setCategories(state.categories);
        renderCategories();
        showToast("分類排序已更新");
      } catch (error) {
        showToast(`分類排序儲存失敗: ${error.message}`, true);
      }
    };

    ui.categoryList.addEventListener("pointerup", () => {
      finalizeCategoryReorder();
    });
    ui.categoryList.addEventListener("pointercancel", () => {
      finalizeCategoryReorder();
    });
    ui.categoryList.addEventListener("pointerleave", () => {
      if (!categoryDragActive) {
        resetCategoryDragState();
      }
    });
    ui.categoryList.addEventListener("contextmenu", (event) => {
      if (categoryDragActive || categoryPressTimer) {
        event.preventDefault();
      }
    });
  }

  async function init() {
    loadTheme();
    window.addEventListener("error", (event) => {
      const msg = event && event.error && event.error.message
        ? event.error.message
        : (event && event.message ? event.message : "程式發生未預期錯誤");
      showErrorModal(msg);
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      const msg = reason && reason.message ? reason.message : String(reason || "程式發生未處理錯誤");
      showErrorModal(msg);
    });
    wireEvents();
    await loadInitialState();
  }

  init().catch((error) => showToast(`初始化失敗: ${error.message}`, true));
})();
