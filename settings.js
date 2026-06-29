(function () {
  "use strict";

  const APP_DB = "expiry_manager_app";
  const APP_DB_VERSION = 1;
  const STORE_PRODUCTS = "products";
  const STORE_SETTINGS = "settings";
  const MODE_SETTING_KEY = "storageMode";
  const STORAGE_SETUP_KEY = "storageSetupCompleted";
  const FILE_HANDLE_SETTING_KEY = "storageFileHandle";
  const INDEXEDDB_ADD_COUNT_KEY = "indexedDbAddCountSinceBackup";
  const THEME_SETTING_KEY = "uiTheme";
  const CATEGORY_SETTING_KEY = "categories";
  const CUSTOM_APP_TITLE_KEY = "customAppTitle";
  const DEFAULT_APP_TITLE = "商品終期電馭監管裝置";
  const CSV_UTF8_BOM = "\uFEFF";
  const DEFAULT_CATEGORIES = ["飲料", "零食", "泡麵", "糖果"];
  const DEFAULT_THEME_KEY = "dark-1";
  const THEME_ALIASES = {
    "dark-7": "dark-1",
    "light-7": "light-1",
    "light-8": "light-2",
    "dark-8": "dark-2"
  };
  const THEME_PRESETS = [
    { key: "dark-1", mode: "dark", label: "霓虹電馭", swatch: "linear-gradient(120deg,#050505,#00f0ff 52%,#ff2bd6)" },
    { key: "light-1", mode: "light", label: "日光電馭", swatch: "linear-gradient(120deg,#fafafa,#ffb000 52%,#00d429)" },
    { key: "light-2", mode: "light", label: "活力綠洲", swatch: "linear-gradient(120deg,#f4f7f5,#168a4a 50%,#c92f2f)" },
    { key: "dark-2", mode: "dark", label: "深夜綠洲", swatch: "linear-gradient(120deg,#101814,#2fc274 50%,#e05a5a)" }
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
    languageSelect: document.getElementById("languageSelect"),
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
    storageModeLabel: document.getElementById("storageModeLabel"),
    useIndexedDbStorageBtn: document.getElementById("useIndexedDbStorageBtn"),
    chooseStorageFileBtn: document.getElementById("chooseStorageFileBtn"),
    newCategoryInput: document.getElementById("newCategoryInput"),
    addCategoryBtn: document.getElementById("addCategoryBtn"),
    categoryList: document.getElementById("categoryList"),
    deleteCategoryModal: document.getElementById("deleteCategoryModal"),
    deleteCategoryMessage: document.getElementById("deleteCategoryMessage"),
    confirmDeleteCategoryBtn: document.getElementById("confirmDeleteCategoryBtn"),
    cancelDeleteCategoryBtn: document.getElementById("cancelDeleteCategoryBtn"),
    appVersionLabel: document.getElementById("appVersionLabel"),
    currentReleaseLabel: document.getElementById("currentReleaseLabel"),
    releaseHistoryList: document.getElementById("releaseHistoryList"),
    customAppTitleInput: document.getElementById("customAppTitleInput"),
    saveCustomAppTitleBtn: document.getElementById("saveCustomAppTitleBtn"),
    resetCustomAppTitleBtn: document.getElementById("resetCustomAppTitleBtn"),
    errorModal: document.getElementById("errorModal"),
    errorModalMessage: document.getElementById("errorModalMessage"),
    closeErrorModalBtn: document.getElementById("closeErrorModalBtn"),
    toast: document.getElementById("toast")
  };

  let themePickerMode = "light";
  const customSelects = new Map();
  let categoryPressTimer = null;
  let categoryPressChip = null;
  let categoryDraggingChip = null;
  let categoryDragActive = false;
  let categoryPointerId = null;
  let categoryPressX = 0;
  let categoryPressY = 0;
  let categoryAnchorX = 0;
  let categoryAnchorY = 0;
  let categoryOriginLeft = 0;
  let categoryOriginTop = 0;
  let categoryDragOffsetX = 0;
  let categoryDragOffsetY = 0;
  let categoryDragGhost = null;
  let categoryScrollLocked = false;
  let categoryLockedScrollY = 0;
  let pendingDeleteCategory = "";
  const modalHistory = {
    stack: [],
    ignoreNextPop: false,
    ignoreResetTimer: null
  };

  const CATEGORY_LONG_PRESS_MS = 650;
  const CATEGORY_MOVE_TOLERANCE = 18;

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
      selectFileText(filename, content) {
        return new Promise((resolve, reject) => {
          if (typeof bridge.requestSelectDbFile !== "function") {
            reject(new Error("裝置不支援選擇本機 JSON 檔案"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-db-file-selected", handler);
            const detail = event.detail || {};
            if (detail.ok) {
              resolve(true);
            } else {
              reject(new Error(detail.error || "本機 JSON 檔案選擇失敗"));
            }
          };
          window.addEventListener("android-db-file-selected", handler, { once: true });
          try {
            bridge.requestSelectDbFile(String(filename || "expiry-manager-data.json"), String(content || ""));
          } catch (error) {
            window.removeEventListener("android-db-file-selected", handler);
            reject(error);
          }
        });
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
      },
      exportJson(filename, content) {
        return new Promise((resolve, reject) => {
          if (typeof bridge.requestExportJsonFile !== "function") {
            reject(new Error("裝置不支援原生 JSON 備份"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-json-exported", handler);
            const detail = event.detail || {};
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

  function isNativeFileMode() {
    return !!nativeBridge;
  }

  function supportsWebFileStorage() {
    return typeof window.showSaveFilePicker === "function";
  }

  function supportsExternalFileStorage() {
    return isNativeFileMode() || supportsWebFileStorage();
  }

  async function chooseStorageFileHandle() {
    if (!supportsWebFileStorage()) {
      throw new Error("此瀏覽器不支援指定本機檔案位置，請使用 IndexedDB 並定期備份 JSON");
    }
    return window.showSaveFilePicker({
      suggestedName: "expiry-manager-data.json",
      types: [
        {
          description: t("商品效期資料 JSON"),
          accept: { "application/json": [".json"] }
        }
      ]
    });
  }

  function renderStorageMode() {
    if (ui.storageModeLabel) {
      const label = state.storageMode === "file" ? "本機檔案位置" : "IndexedDB";
      ui.storageModeLabel.textContent = t(`目前模式：${label}`);
    }
    if (ui.chooseStorageFileBtn) {
      ui.chooseStorageFileBtn.disabled = !supportsExternalFileStorage();
    }
  }

  function renderAppVersion() {
    if (!ui.appVersionLabel) {
      return;
    }
    const release = window.APP_RELEASE || {};
    const version = String(release.version || "").trim();
    ui.appVersionLabel.textContent = version || t("版本");
  }

  function normalizeCustomAppTitle(value) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  }

  function getStoredCustomAppTitle() {
    return normalizeCustomAppTitle(localStorage.getItem(CUSTOM_APP_TITLE_KEY) || "");
  }

  function setStoredCustomAppTitle(value) {
    const normalized = normalizeCustomAppTitle(value);
    if (normalized) {
      localStorage.setItem(CUSTOM_APP_TITLE_KEY, normalized);
    } else {
      localStorage.removeItem(CUSTOM_APP_TITLE_KEY);
    }
    return normalized;
  }

  function getEffectiveAppTitle() {
    return getStoredCustomAppTitle() || DEFAULT_APP_TITLE;
  }

  function syncDocumentTitle() {
    document.title = `${t("設定")} | ${getEffectiveAppTitle()}`;
  }

  function renderTitleCustomizePanel() {
    if (ui.customAppTitleInput) {
      ui.customAppTitleInput.value = getStoredCustomAppTitle();
    }
    syncDocumentTitle();
  }


  function saveCustomAppTitle() {
    const saved = setStoredCustomAppTitle(ui.customAppTitleInput ? ui.customAppTitleInput.value : "");
    renderTitleCustomizePanel();
    showToast(saved ? "自訂標題已儲存" : "已恢復預設標題");
  }

  function resetCustomAppTitle() {
    setStoredCustomAppTitle("");
    renderTitleCustomizePanel();
    showToast("已恢復預設標題");
  }

  function renderReleaseHistory() {
    const release = window.APP_RELEASE || {};
    const version = String(release.version || "").trim();
    if (ui.currentReleaseLabel) {
      ui.currentReleaseLabel.textContent = version ? t(`目前版本：${version}`) : t("目前版本：未設定");
    }
    if (!ui.releaseHistoryList) {
      return;
    }
    const history = Array.isArray(release.history) ? release.history : [];
    const latestEntry = history.find((entry) => String(entry && entry.version || "").trim() === version)
      || history[0]
      || release;
    ui.releaseHistoryList.innerHTML = "";
    [latestEntry].forEach((entry) => {
      const section = document.createElement("section");
      section.className = "release-history-entry";
      const title = document.createElement("h3");
      title.textContent = t(String(entry.title || entry.version || "更新內容"));
      const list = document.createElement("ul");
      (Array.isArray(entry.items) ? entry.items : []).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = t(String(item || ""));
        list.appendChild(li);
      });
      section.appendChild(title);
      section.appendChild(list);
      ui.releaseHistoryList.appendChild(section);
    });
  }

  function showToast(message, isError = false) {
    if (isError) {
      showErrorModal(message);
      return;
    }
    ui.toast.textContent = t(message);
    ui.toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => ui.toast.classList.add("hidden"), 2600);
  }

  function t(source) {
    if (window.AppI18n && typeof window.AppI18n.translateText === "function") {
      return window.AppI18n.translateText(source);
    }
    return source;
  }

  function showErrorModal(message) {
    const text = t(String(message || "發生未知錯誤"));
    if (!ui.errorModal || !ui.errorModalMessage) {
      alert(text);
      return;
    }
    ui.errorModalMessage.textContent = text;
    openManagedModal("error", ui.errorModal);
  }

  function closeErrorModal(options = {}) {
    closeManagedModal("error", ui.errorModal, options);
  }

  function isModalVisible(modalEl) {
    return !!modalEl && !modalEl.classList.contains("hidden");
  }

  function openManagedModal(key, modalEl) {
    if (!modalEl) {
      return;
    }
    const wasVisible = isModalVisible(modalEl);
    modalEl.classList.remove("hidden");
    if (wasVisible || modalHistory.stack[modalHistory.stack.length - 1] === key) {
      return;
    }
    modalHistory.stack.push(key);
    try {
      history.pushState({ settingsModal: key }, "", location.href);
    } catch (_error) {
    }
  }

  function closeManagedModal(key, modalEl, options = {}) {
    if (modalEl) {
      modalEl.classList.add("hidden");
    }
    modalHistory.stack = modalHistory.stack.filter((item) => item !== key);
    if (options.fromHistory || options.skipHistory) {
      return;
    }
    if (history.state && history.state.settingsModal === key) {
      modalHistory.ignoreNextPop = true;
      history.back();
      clearTimeout(modalHistory.ignoreResetTimer);
      modalHistory.ignoreResetTimer = setTimeout(() => {
        modalHistory.ignoreNextPop = false;
        modalHistory.ignoreResetTimer = null;
      }, 800);
    }
  }

  function closeTopModalFromHistory() {
    if (isModalVisible(ui.errorModal)) {
      closeErrorModal({ fromHistory: true });
      return true;
    }
    if (isModalVisible(ui.deleteCategoryModal)) {
      closeDeleteCategoryModal({ fromHistory: true });
      return true;
    }
    if (isModalVisible(ui.themePickerModal)) {
      closeThemePicker({ fromHistory: true });
      return true;
    }
    return false;
  }

  window.AppNativeBack = {
    handleBack() {
      if (closeTopModalFromHistory()) {
        return true;
      }
      return "home";
    }
  };

  function isFilePermissionActivationError(message) {
    const text = String(message || "");
    return text.includes("User activation is required")
      && (text.includes("requestPermission") || text.includes("createWritable"));
  }

  function findThemePreset(themeKey) {
    const normalized = THEME_ALIASES[themeKey] || themeKey;
    return THEME_PRESETS.find((item) => item.key === normalized) || THEME_PRESETS.find((item) => item.key === DEFAULT_THEME_KEY) || THEME_PRESETS[0];
  }

  function normalizeThemeColorValue(colorValue) {
    const value = String(colorValue || "").trim();
    if (!value) {
      return "";
    }
    const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!rgba) {
      return value;
    }
    const parts = rgba[1].split(",").map((p) => p.trim());
    if (parts.length < 3) {
      return value;
    }
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }

  function themeColorToHex(colorValue) {
    const value = normalizeThemeColorValue(colorValue);
    if (!value) {
      return "";
    }
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      const raw = hex[1];
      if (raw.length === 3) {
        return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
      }
      return `#${raw}`.toLowerCase();
    }
    const rgb = value.match(/^rgb\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/i);
    if (!rgb) {
      return "";
    }
    const toHex = (part) => {
      const number = Math.max(0, Math.min(255, Math.round(Number(part) || 0)));
      return number.toString(16).padStart(2, "0");
    };
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }

  function syncNativeStatusBarColor(colorValue) {
    if (!window.AndroidBridge || typeof window.AndroidBridge.setStatusBarColor !== "function") {
      return;
    }
    const hex = themeColorToHex(colorValue);
    if (!hex) {
      return;
    }
    try {
      window.AndroidBridge.setStatusBarColor(hex);
    } catch (_error) {
    }
  }

  function syncThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      return;
    }
    const styles = getComputedStyle(document.documentElement);
    const androidStatusbar = styles.getPropertyValue("--android-statusbar");
    const topbar = styles.getPropertyValue("--topbar");
    const bg = styles.getPropertyValue("--bg");
    const color = normalizeThemeColorValue(androidStatusbar) ||
      normalizeThemeColorValue(topbar) ||
      normalizeThemeColorValue(bg) ||
      "#1f6feb";
    meta.setAttribute("content", color);
    syncNativeStatusBarColor(color);
  }

  function updateThemeCurrentLabel(themeKey) {
    if (!ui.themeCurrentLabel) {
      return;
    }
    const preset = findThemePreset(themeKey);
    ui.themeCurrentLabel.textContent = t(`目前主題：${preset.label}`);
  }

  function applyTheme(themeKey) {
    const preset = findThemePreset(themeKey);
    document.documentElement.setAttribute("data-theme", preset.key);
    localStorage.setItem(THEME_SETTING_KEY, preset.key);
    updateThemeCurrentLabel(preset.key);
    syncThemeColorMeta();
  }

  function loadTheme() {
    const saved = localStorage.getItem(THEME_SETTING_KEY) || DEFAULT_THEME_KEY;
    const preset = findThemePreset(saved);
    applyTheme(preset.key);
  }

  function renderThemeOptions(mode) {
    if (!ui.themeOptions) {
      return;
    }
    const savedTheme = localStorage.getItem(THEME_SETTING_KEY) || DEFAULT_THEME_KEY;
    const current = findThemePreset(savedTheme).key;
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
      const label = document.createElement("span");
      label.className = "theme-option-label";
      label.textContent = option.label;
      btn.appendChild(label);
      ui.themeOptions.appendChild(btn);
    });
  }

  function openThemePicker(mode) {
    themePickerMode = mode === "dark" ? "dark" : "light";
    if (ui.themePickerTitle) {
      ui.themePickerTitle.textContent = t(themePickerMode === "dark" ? "選擇黑暗主題" : "選擇明亮主題");
    }
    renderThemeOptions(themePickerMode);
    if (ui.themePickerModal) {
      openManagedModal("theme", ui.themePickerModal);
    }
  }

  function closeThemePicker(options = {}) {
    closeManagedModal("theme", ui.themePickerModal, options);
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

  function getSelectLabel(selectEl) {
    if (!selectEl) {
      return "";
    }
    const selected = selectEl.options[selectEl.selectedIndex];
    return selected ? selected.textContent : "";
  }

  function closeOpenCustomSelect() {
    customSelects.forEach((entry) => {
      entry.wrapper.classList.remove("is-open");
      entry.button.setAttribute("aria-expanded", "false");
    });
  }

  function openCustomSelect(selectEl) {
    const entry = customSelects.get(selectEl);
    if (!entry) {
      return;
    }
    const wasOpen = entry.wrapper.classList.contains("is-open");
    closeOpenCustomSelect();
    if (wasOpen) {
      return;
    }
    entry.wrapper.classList.add("is-open");
    entry.button.setAttribute("aria-expanded", "true");
  }

  function syncCustomSelect(selectEl) {
    const entry = customSelects.get(selectEl);
    if (!entry) {
      return;
    }
    entry.buttonText.textContent = getSelectLabel(selectEl);
    entry.list.innerHTML = "";
    Array.from(selectEl.options).forEach((option) => {
      if (option.disabled) {
        return;
      }
      const item = document.createElement("button");
      item.type = "button";
      item.className = "custom-select-option";
      item.textContent = option.textContent || option.value;
      item.dataset.value = option.value;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", option.value === selectEl.value ? "true" : "false");
      item.addEventListener("click", () => {
        selectEl.value = option.value;
        syncCustomSelect(selectEl);
        closeOpenCustomSelect();
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
      entry.list.appendChild(item);
    });
  }

  function setupCustomSelect(selectEl) {
    if (!selectEl || customSelects.has(selectEl)) {
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select language-custom-select";
    wrapper.dataset.i18nSkip = "true";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "custom-select-button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const buttonText = document.createElement("span");
    buttonText.className = "custom-select-current";
    const arrow = document.createElement("span");
    arrow.className = "custom-select-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "▾";
    button.append(buttonText, arrow);
    const list = document.createElement("div");
    list.className = "custom-select-list";
    list.setAttribute("role", "listbox");
    selectEl.classList.add("native-select-fallback");
    selectEl.insertAdjacentElement("afterend", wrapper);
    wrapper.append(button, list);
    const entry = { select: selectEl, wrapper, button, buttonText, list };
    customSelects.set(selectEl, entry);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCustomSelect(selectEl);
    });
    selectEl.addEventListener("change", () => syncCustomSelect(selectEl));
    syncCustomSelect(selectEl);
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
    return DEFAULT_CATEGORIES;
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
      const label = document.createElement("span");
      label.textContent = category;
      const deleteButton = document.createElement("button");
      deleteButton.className = "chip-delete";
      deleteButton.type = "button";
      deleteButton.setAttribute("data-delete-category", category);
      deleteButton.setAttribute("aria-label", t("刪除分類"));
      deleteButton.textContent = "×";
      chip.appendChild(label);
      chip.appendChild(deleteButton);
      ui.categoryList.appendChild(chip);
    });
  }

  function openDeleteCategoryModal(category) {
    pendingDeleteCategory = String(category || "").trim();
    if (!pendingDeleteCategory) {
      return;
    }
    renderDeleteCategoryMessage();
    openManagedModal("deleteCategory", ui.deleteCategoryModal);
  }

  function renderDeleteCategoryMessage() {
    if (!ui.deleteCategoryMessage || !pendingDeleteCategory) {
      return;
    }
    const categoryLabel = t(pendingDeleteCategory);
    ui.deleteCategoryMessage.textContent = t(`確定要刪除「${categoryLabel}」標籤嗎？既有商品資料不會被刪除。`);
  }

  function closeDeleteCategoryModal(options = {}) {
    pendingDeleteCategory = "";
    closeManagedModal("deleteCategory", ui.deleteCategoryModal, options);
  }

  async function confirmDeleteCategory() {
    const category = pendingDeleteCategory;
    if (!category) {
      return;
    }
    if (state.categories.length <= 1) {
      closeDeleteCategoryModal();
      showToast("至少需保留一個分類", true);
      return;
    }
    state.categories = state.categories.filter((item) => item !== category);
    try {
      await setCategories(state.categories);
      renderCategories();
      closeDeleteCategoryModal();
      showToast("分類已刪除");
    } catch (error) {
      showToast(`刪除失敗: ${error.message}`, true);
    }
  }

  function requestDeleteCategory(category) {
    if (!category) {
      return;
    }
    if (state.categories.length <= 1) {
      showToast("至少需保留一個分類", true);
      return;
    }
    openDeleteCategoryModal(category);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cancelCategoryPressTimer() {
    clearTimeout(categoryPressTimer);
    categoryPressTimer = null;
  }

  function preventCategoryDragScroll(event) {
    if (categoryDragActive && event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
  }

  function lockCategoryPageScroll() {
    if (categoryScrollLocked) {
      return;
    }
    categoryScrollLocked = true;
    categoryLockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.addEventListener("touchmove", preventCategoryDragScroll, { passive: false });
    document.body.style.position = "fixed";
    document.body.style.top = `-${categoryLockedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockCategoryPageScroll() {
    if (!categoryScrollLocked) {
      return;
    }
    categoryScrollLocked = false;
    document.removeEventListener("touchmove", preventCategoryDragScroll);
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("left");
    document.body.style.removeProperty("right");
    document.body.style.removeProperty("width");
    window.scrollTo(0, categoryLockedScrollY);
    categoryLockedScrollY = 0;
  }

  function resetCategoryDragState() {
    if (categoryDraggingChip) {
      categoryDraggingChip.classList.remove("is-dragging");
      categoryDraggingChip.classList.remove("is-drag-source");
      categoryDraggingChip.style.removeProperty("--drag-x");
      categoryDraggingChip.style.removeProperty("--drag-y");
      try {
        if (categoryPointerId !== null && categoryDraggingChip.hasPointerCapture && categoryDraggingChip.hasPointerCapture(categoryPointerId)) {
          categoryDraggingChip.releasePointerCapture(categoryPointerId);
        }
      } catch (_error) {
        // ignore release failures
      }
    }
    if (ui.categoryList) {
      ui.categoryList.classList.remove("is-reordering");
    }
    if (categoryDragGhost && categoryDragGhost.parentElement) {
      categoryDragGhost.remove();
    }
    categoryDragGhost = null;
    categoryPressChip = null;
    categoryDraggingChip = null;
    categoryDragActive = false;
    categoryPointerId = null;
    categoryPressX = 0;
    categoryPressY = 0;
    categoryAnchorX = 0;
    categoryAnchorY = 0;
    categoryOriginLeft = 0;
    categoryOriginTop = 0;
    categoryDragOffsetX = 0;
    categoryDragOffsetY = 0;
    unlockCategoryPageScroll();
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

  async function hasReadWritePermission(fileHandle, options = {}) {
    if (!fileHandle) {
      return false;
    }
    const permissionOptions = { mode: "readwrite" };
    if ((await fileHandle.queryPermission(permissionOptions)) === "granted") {
      return true;
    }
    if (!options.request) {
      return false;
    }
    if (navigator.userActivation && !navigator.userActivation.isActive) {
      return false;
    }
    return (await fileHandle.requestPermission(permissionOptions)) === "granted";
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

  async function tryWriteProductsToSelectedFile(products) {
    if (!(await hasSelectedFile())) {
      return { skipped: false };
    }
    if (!isNativeFileMode()) {
      const ok = await hasReadWritePermission(state.fileHandle, { request: false });
      if (!ok) {
        return { skipped: true };
      }
    }
    try {
      await writeProductsToSelectedFile(products);
      return { skipped: false };
    } catch (error) {
      if (isFilePermissionActivationError(error.message)) {
        return { skipped: true };
      }
      throw error;
    }
  }

  async function switchToIndexedDbStorage() {
    state.storageMode = "indexeddb";
    state.fileHandle = null;
    await setSetting(MODE_SETTING_KEY, "indexeddb");
    await setSetting(FILE_HANDLE_SETTING_KEY, null);
    await setSetting(STORAGE_SETUP_KEY, true);
    renderStorageMode();
    showToast("已改用 IndexedDB");
  }

  async function switchToFileStorage() {
    const products = await getAllProductsFromIndexedDb();

    if (isNativeFileMode()) {
      await nativeBridge.selectFileText("expiry-manager-data.json", serializeProductsPayload(products));
      state.storageMode = "file";
      await setSetting(MODE_SETTING_KEY, "file");
      await setSetting(STORAGE_SETUP_KEY, true);
      renderStorageMode();
      showToast("已改用本機檔案位置，並寫入目前資料");
      return;
    }

    const handle = await chooseStorageFileHandle();
    const ok = await hasReadWritePermission(handle, { request: true });
    if (!ok) {
      throw new Error("未取得檔案讀寫權限");
    }
    state.fileHandle = handle;
    state.storageMode = "file";
    await setSetting(FILE_HANDLE_SETTING_KEY, handle);
    await setSetting(MODE_SETTING_KEY, "file");
    await setSetting(STORAGE_SETUP_KEY, true);
    await writeProductsToSelectedFile(products);
    renderStorageMode();
    showToast("已改用本機檔案位置，並寫入目前資料");
  }

  function isFilePickerAbort(error) {
    const name = String(error && error.name || "");
    const message = String(error && error.message || "");
    return name === "AbortError" || message.includes("user aborted");
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

  function normalizeCsvDateInput(raw) {
    const value = String(raw || "").trim();
    if (!value) {
      return "";
    }
    const direct = normalizeDateInput(value);
    if (direct) {
      return direct;
    }

    // Excel serial date (days since 1899-12-30)
    if (/^\d+(\.\d+)?$/.test(value)) {
      const serial = Number(value);
      if (Number.isFinite(serial) && serial > 0) {
        const base = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(base.getTime() + Math.floor(serial) * 86400000);
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate();
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }

    // Common datetime strings: "YYYY-MM-DD HH:mm:ss", ISO, locale dates, etc.
    const cleaned = value.replace("T", " ").replace(/\.\d+Z?$/, "");
    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = parsed.getMonth() + 1;
      const d = parsed.getDate();
      return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return "";
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
      expiryDate: header.findIndex((h) => h === "有效日期" || h === "expirydate" || h === "expiry_date"),
      note: header.findIndex((h) => h === "備註" || h === "note" || h === "memo")
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
      const note = idx.note >= 0 ? (row[idx.note] || "").trim() : "";
      const expiryDate = normalizeCsvDateInput(expiryRaw);
      const hasAnyField = !!(category || name || barcode || expiryRaw || note);
      if (!hasAnyField) {
        return;
      }
      output.push({
        id: typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        category,
        name,
        barcode,
        note,
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
    const merged = Array.isArray(existingProducts) ? existingProducts.slice() : [];
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

  function mergeProductsForRestore(existingProducts, importedProducts) {
    const existing = Array.isArray(existingProducts) ? existingProducts : [];
    const imported = Array.isArray(importedProducts) ? importedProducts : [];
    const merged = existing.map((item) => Object.assign({}, item));
    const idMap = new Map();
    const identityMap = new Map();

    merged.forEach((item, index) => {
      if (item && item.id) {
        idMap.set(String(item.id), index);
      }
      identityMap.set(productIdentityKey(item), index);
    });

    let addedCount = 0;
    let updatedCount = 0;
    imported.forEach((item) => {
      const incoming = Object.assign({}, item);
      const incomingId = incoming && incoming.id ? String(incoming.id) : "";
      let targetIndex = -1;

      if (incomingId && idMap.has(incomingId)) {
        targetIndex = idMap.get(incomingId);
      } else {
        const key = productIdentityKey(incoming);
        if (identityMap.has(key)) {
          targetIndex = identityMap.get(key);
        }
      }

      if (targetIndex >= 0) {
        const current = merged[targetIndex] || {};
        merged[targetIndex] = Object.assign({}, current, incoming, {
          id: current.id || incoming.id
        });
        updatedCount += 1;
      } else {
        merged.push(incoming);
        const newIndex = merged.length - 1;
        const newId = incoming && incoming.id ? String(incoming.id) : "";
        if (newId) {
          idMap.set(newId, newIndex);
        }
        identityMap.set(productIdentityKey(incoming), newIndex);
        addedCount += 1;
      }
    });

    return { mergedProducts: merged, addedCount, updatedCount };
  }

  function toLocalNoon(dateLike) {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  }

  function getStatusLabel(expiryDate) {
    const normalized = normalizeDateInput(expiryDate);
    if (!normalized) {
      return "";
    }
    const target = toLocalNoon(`${normalized}T00:00:00`);
    const today = toLocalNoon(new Date());
    if (!target || !today) {
      return "";
    }
    const diffDays = Math.floor((target.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) {
      return "已過期";
    }
    if (diffDays <= 60) {
      return "即期";
    }
    return "正常";
  }

  function toCsv(products) {
    const escapeCsvCell = (value) => `"${String(value || "").replace(/"/g, "\"\"")}"`;
    const header = ["分類", "商品名稱", "條碼", "有效日期", "備註", "狀態"];
    const lines = [header.map(escapeCsvCell).join(",")];
    products.forEach((item) => {
      const escaped = [
        item.category,
        item.name,
        item.barcode,
        item.expiryDate,
        item.note,
        getStatusLabel(item.expiryDate)
      ].map(escapeCsvCell);
      lines.push(escaped.join(","));
    });
    return `${CSV_UTF8_BOM}${lines.join("\r\n")}`;
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
        theme: localStorage.getItem(THEME_SETTING_KEY) || DEFAULT_THEME_KEY
      },
      products: Array.isArray(products) ? products : []
    };
  }

  async function downloadJson(filename, payloadObj) {
    const content = JSON.stringify(payloadObj, null, 2);
    if (isNativeFileMode() && typeof nativeBridge.exportJson === "function") {
      await nativeBridge.exportJson(filename, content);
      return;
    }
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
      return (await file.text()).replace(/^\uFEFF/, "");
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").replace(/^\uFEFF/, ""));
      reader.onerror = () => reject(new Error("檔案讀取失敗"));
      reader.readAsText(file);
    });
  }

  function pickFirstValue(obj, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] != null) {
        return obj[key];
      }
    }
    return "";
  }

  function extractRawProductsContainer(parsed) {
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (Array.isArray(parsed.products)) {
      return parsed.products;
    }
    if (Array.isArray(parsed.items)) {
      return parsed.items;
    }
    if (Array.isArray(parsed.records)) {
      return parsed.records;
    }
    if (parsed.data && typeof parsed.data === "object") {
      if (Array.isArray(parsed.data.products)) {
        return parsed.data.products;
      }
      if (Array.isArray(parsed.data.items)) {
        return parsed.data.items;
      }
      if (Array.isArray(parsed.data.records)) {
        return parsed.data.records;
      }
    }
    return null;
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
      const category = String(pickFirstValue(item, ["category", "分類", "productCategory", "cat"])).trim();
      const name = String(pickFirstValue(item, ["name", "商品名稱", "productName", "title"])).trim();
      const barcode = String(pickFirstValue(item, ["barcode", "條碼", "code", "ean", "upc", "sku"])).trim();
      const expiryRaw = String(pickFirstValue(item, ["expiryDate", "有效日期", "expiry", "expiry_date", "expireDate", "date"])).trim();
      const expiryDate = normalizeCsvDateInput(expiryRaw);
      const hasAnyField = !!(category || name || barcode || expiryRaw);
      if (!hasAnyField) {
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

    const rawProducts = extractRawProductsContainer(parsed);
    const importedProducts = parseBackupProducts(rawProducts);
    if (importedProducts.length === 0) {
      throw new Error("JSON 無有效商品資料");
    }
    const existingProducts = await getAllProductsFromIndexedDb();
    const mergedResult = mergeProductsForRestore(existingProducts, importedProducts);
    const mergedProducts = mergedResult.mergedProducts;
    const addedCount = mergedResult.addedCount;
    const updatedCount = mergedResult.updatedCount;

    const ok = window.confirm(t(`將新增 ${addedCount} 筆、更新 ${updatedCount} 筆商品資料，是否繼續還原？`));
    if (!ok) {
      return { addedCount: 0, totalCount: existingProducts.length, cancelled: true };
    }

    await replaceAllProductsIndexedDb(mergedProducts);

    const existingCategories = Array.isArray(state.categories) ? state.categories : [];
    const backupCategories = parsed.settings && Array.isArray(parsed.settings.categories)
      ? parsed.settings.categories.map((c) => String(c || "").trim()).filter(Boolean)
      : [];
    const derivedCategories = Array.from(new Set(mergedProducts.map((p) => p.category)));
    const categories = Array.from(new Set(existingCategories.concat(backupCategories, derivedCategories)));
    if (categories.length > 0) {
      state.categories = categories;
      await setCategories(state.categories);
      renderCategories();
    }

    // 還原 JSON 時不變更目前主題，僅還原資料與分類

    const fileSync = await tryWriteProductsToSelectedFile(mergedProducts);

    return { addedCount, updatedCount, totalCount: mergedProducts.length, cancelled: false, fileSyncSkipped: fileSync.skipped };
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
    state.fileHandle = await getSetting(FILE_HANDLE_SETTING_KEY);
    if (savedMode === "file" || savedMode === "indexeddb") {
      state.storageMode = savedMode;
    } else {
      state.storageMode = "indexeddb";
      await setSetting(MODE_SETTING_KEY, state.storageMode);
    }
    if (state.storageMode === "file" && !(await hasSelectedFile())) {
      state.storageMode = "indexeddb";
      state.fileHandle = null;
      await setSetting(MODE_SETTING_KEY, "indexeddb");
      await setSetting(FILE_HANDLE_SETTING_KEY, null);
    }

    state.categories = await getCategories();
    renderCategories();
    renderStorageMode();
  }

  function setupTextInputMirror(input) {
    if (!input) {
      return () => {};
    }
    const shell = input.closest(".text-input-shell");
    const mirror = shell ? shell.querySelector(".text-input-mirror") : null;
    if (!shell || !mirror) {
      return () => {};
    }
    const sync = () => {
      const value = input.value || "";
      mirror.textContent = value || input.getAttribute("placeholder") || "";
      shell.classList.toggle("is-empty", !value);
    };
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    window.addEventListener("app-language-change", () => {
      setTimeout(sync, 0);
    });
    const observer = new MutationObserver(sync);
    observer.observe(input, { attributes: true, attributeFilter: ["placeholder"] });
    sync();
    return sync;
  }

  function wireEvents() {
    ui.syncNewCategoryInputMirror = setupTextInputMirror(ui.newCategoryInput);
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
    if (ui.confirmDeleteCategoryBtn) {
      ui.confirmDeleteCategoryBtn.addEventListener("click", async () => {
        await confirmDeleteCategory();
      });
    }
    if (ui.cancelDeleteCategoryBtn) {
      ui.cancelDeleteCategoryBtn.addEventListener("click", closeDeleteCategoryModal);
    }
    if (ui.deleteCategoryModal) {
      ui.deleteCategoryModal.addEventListener("click", (event) => {
        if (event.target === ui.deleteCategoryModal) {
          closeDeleteCategoryModal();
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
    setupCustomSelect(ui.languageSelect);
    window.addEventListener("app-language-change", () => {
      syncCustomSelect(ui.languageSelect);
      renderReleaseHistory();
      renderCategories();
      renderTitleCustomizePanel();
      if (isModalVisible(ui.deleteCategoryModal)) {
        renderDeleteCategoryMessage();
      }
    });
    setTimeout(() => syncCustomSelect(ui.languageSelect), 0);
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".custom-select")) {
        closeOpenCustomSelect();
      }
    });
    if (ui.useIndexedDbStorageBtn) {
      ui.useIndexedDbStorageBtn.addEventListener("click", async () => {
        try {
          await switchToIndexedDbStorage();
        } catch (error) {
          showToast(`儲存模式切換失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.chooseStorageFileBtn) {
      ui.chooseStorageFileBtn.addEventListener("click", async () => {
        try {
          await switchToFileStorage();
        } catch (error) {
          if (isFilePickerAbort(error)) {
            showToast("已取消選擇本機檔案位置");
            return;
          }
          showToast(`本機檔案位置設定失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.saveCustomAppTitleBtn) {
      ui.saveCustomAppTitleBtn.addEventListener("click", saveCustomAppTitle);
    }
    if (ui.resetCustomAppTitleBtn) {
      ui.resetCustomAppTitleBtn.addEventListener("click", resetCustomAppTitle);
    }
    if (ui.customAppTitleInput) {
      ui.customAppTitleInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveCustomAppTitle();
        }
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
          await setSetting(INDEXEDDB_ADD_COUNT_KEY, 0);
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
        state.categories = Array.from(new Set(state.categories.concat(importedCategories)));
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
          const fileSyncText = result.fileSyncSkipped ? "；本機檔案位置未同步，請重新選擇本機檔案位置或匯出 JSON 備份" : "";
          showToast(`JSON 還原成功，新增 ${result.addedCount} 筆、更新 ${result.updatedCount || 0} 筆，目前共 ${result.totalCount} 筆商品${fileSyncText}`);
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
        ui.syncNewCategoryInputMirror();
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
      requestDeleteCategory(category);
    });

    ui.categoryList.addEventListener("pointerup", (event) => {
      if (event.pointerType === "mouse") {
        return;
      }
      const button = event.target.closest("button[data-delete-category]");
      if (!button) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      const category = button.getAttribute("data-delete-category");
      requestDeleteCategory(category);
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
      categoryPointerId = event.pointerId;
      categoryPressX = Number(event.clientX) || 0;
      categoryPressY = Number(event.clientY) || 0;
      categoryDragOffsetX = 0;
      categoryDragOffsetY = 0;
      cancelCategoryPressTimer();
      categoryPressTimer = setTimeout(() => {
        event.preventDefault();
        categoryDragActive = true;
        lockCategoryPageScroll();
        categoryDraggingChip = categoryPressChip;
        if (categoryDraggingChip) {
          categoryDraggingChip.classList.add("is-dragging");
          categoryDraggingChip.classList.add("is-drag-source");
          categoryDraggingChip.style.setProperty("--drag-x", "0px");
          categoryDraggingChip.style.setProperty("--drag-y", "0px");
          try {
            if (categoryPointerId !== null && categoryDraggingChip.setPointerCapture) {
              categoryDraggingChip.setPointerCapture(categoryPointerId);
            }
          } catch (_error) {
            // ignore capture failures
          }
          const chipRect = categoryDraggingChip.getBoundingClientRect();
          categoryAnchorX = (Number(event.clientX) || 0) - chipRect.left;
          categoryAnchorY = (Number(event.clientY) || 0) - chipRect.top;
          categoryOriginLeft = chipRect.left;
          categoryOriginTop = chipRect.top;
          categoryDragGhost = categoryDraggingChip.cloneNode(true);
          categoryDragGhost.classList.remove("is-dragging", "is-drag-source");
          categoryDragGhost.classList.add("category-chip-drag-ghost");
          categoryDragGhost.style.left = `${chipRect.left}px`;
          categoryDragGhost.style.top = `${chipRect.top}px`;
          categoryDragGhost.style.width = `${chipRect.width}px`;
          document.body.appendChild(categoryDragGhost);
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
        const dx = Math.abs(x - categoryPressX);
        const dy = Math.abs(y - categoryPressY);
        if (dx > CATEGORY_MOVE_TOLERANCE || dy > CATEGORY_MOVE_TOLERANCE) {
          cancelCategoryPressTimer();
          categoryPressChip = null;
        }
        return;
      }
      event.preventDefault();
      const targetLeft = x - categoryAnchorX;
      const targetTop = y - categoryAnchorY;
      categoryDragOffsetX = targetLeft - categoryOriginLeft;
      categoryDragOffsetY = targetTop - categoryOriginTop;
      if (categoryDragGhost) {
        categoryDragGhost.style.left = `${targetLeft}px`;
        categoryDragGhost.style.top = `${targetTop}px`;
      }
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

  async function init() {
    loadTheme();
    renderAppVersion();
    renderReleaseHistory();
    try {
      if (!history.state || history.state.settingsPage !== true) {
        history.replaceState({ settingsPage: true }, "", location.href);
        history.pushState({ settingsGuard: true }, "", location.href);
      }
    } catch (_error) {
    }
    window.addEventListener("error", (event) => {
      const msg = event && event.error && event.error.message
        ? event.error.message
        : (event && event.message ? event.message : "程式發生未預期錯誤");
      if (isFilePermissionActivationError(msg)) {
        event.preventDefault();
        showToast("尚未連回先前的本機 JSON 檔案，請重新選擇同一個 JSON 檔案");
        return;
      }
      showErrorModal(msg);
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      const msg = reason && reason.message ? reason.message : String(reason || "程式發生未處理錯誤");
      if (isFilePermissionActivationError(msg)) {
        event.preventDefault();
        showToast("尚未連回先前的本機 JSON 檔案，請重新選擇同一個 JSON 檔案");
        return;
      }
      showErrorModal(msg);
    });
    window.addEventListener("popstate", () => {
      if (modalHistory.ignoreNextPop) {
        modalHistory.ignoreNextPop = false;
        clearTimeout(modalHistory.ignoreResetTimer);
        modalHistory.ignoreResetTimer = null;
        return;
      }
      if (closeTopModalFromHistory()) {
        return;
      }
      if (!document.referrer || !document.referrer.includes("inventory-management-app.html")) {
        location.href = "./inventory-management-app.html";
      }
    });
    wireEvents();
    await loadInitialState();
    renderTitleCustomizePanel();
    await finishAppBoot();
  }

  init().catch((error) => {
    showToast(`初始化失敗: ${error.message}`, true);
    finishAppBoot();
  });
})();
