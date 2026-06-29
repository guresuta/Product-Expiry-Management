(function () {
  "use strict";

  const APP_DB = "expiry_manager_app";
  const APP_DB_VERSION = 1;
  const STORE_PRODUCTS = "products";
  const STORE_SETTINGS = "settings";
  const MODE_SETTING_KEY = "storageMode";
  const STORAGE_SETUP_KEY = "storageSetupCompleted";
  const FILE_HANDLE_SETTING_KEY = "storageFileHandle";
  const LAST_SEEN_VERSION_KEY = "lastSeenAppVersion";
  const INDEXEDDB_ADD_COUNT_KEY = "indexedDbAddCountSinceBackup";
  const LAST_ADD_CATEGORY_KEY = "lastAddProductCategory";
  const INDEXEDDB_BACKUP_REMINDER_THRESHOLD = 100;
  const DEFAULT_MODE = "indexeddb";
  const EXPIRING_SOON_DAYS = 60;
  const SCANNER_CENTER_HINT = "請把條碼對準鏡頭中央。";
  const THEME_SETTING_KEY = "uiTheme";
  const CATEGORY_SETTING_KEY = "categories";
  const CUSTOM_APP_TITLE_KEY = "customAppTitle";
  const DEFAULT_APP_TITLE = "商品終期電馭監管裝置";
  const DEFAULT_CATEGORIES = ["飲料", "零食", "泡麵", "糖果"];
  const DEFAULT_THEME_KEY = "dark-1";
  const THEME_ALIASES = {
    "dark-7": "dark-1",
    "light-7": "light-1",
    "light-8": "light-2",
    "dark-8": "dark-2"
  };
  const NATIVE_BACK_EXIT_CONFIRM_MS = 2000;
  const NATIVE_BACK_EXIT_SIGNAL = "exit";
  const THEME_KEYS = new Set([
    "dark-1", "light-1", "light-2", "dark-2"
  ]);

  const state = {
    products: [],
    storageMode: DEFAULT_MODE,
    fileHandle: null,
    categories: [],
    scanner: {
      running: false,
      rafId: null,
      stream: null,
      detector: null,
      mode: "barcode",
      barcodeTarget: "input",
      detecting: false,
      torchSupported: false,
      torchOn: false,
      torchPersistent: false
    },
    editingProductId: null,
    selectedProductIds: new Set(),
    calendarMonth: new Date(),
    calendarSelectedDate: "",
    healthFilter: "",
    lastAddCategory: ""
  };

  const nativeBridge = createNativeBridge();

  const ui = {
    productForm: document.getElementById("productForm"),
    addProductModal: document.getElementById("addProductModal"),
    openAddProductBtn: document.getElementById("openAddProductBtn"),
    cancelAddProductBtn: document.getElementById("cancelAddProductBtn"),
    storageSetupModal: document.getElementById("storageSetupModal"),
    chooseIndexedDbStorageBtn: document.getElementById("chooseIndexedDbStorageBtn"),
    chooseFileStorageBtn: document.getElementById("chooseFileStorageBtn"),
    updateNoticeModal: document.getElementById("updateNoticeModal"),
    updateNoticeTitle: document.getElementById("updateNoticeTitle"),
    updateNoticeList: document.getElementById("updateNoticeList"),
    closeUpdateNoticeBtn: document.getElementById("closeUpdateNoticeBtn"),
    datePickerModal: document.getElementById("datePickerModal"),
    datePickerMonthLabel: document.getElementById("datePickerMonthLabel"),
    datePickerGrid: document.getElementById("datePickerGrid"),
    datePickerPrevBtn: document.getElementById("datePickerPrevBtn"),
    datePickerNextBtn: document.getElementById("datePickerNextBtn"),
    datePickerClearBtn: document.getElementById("datePickerClearBtn"),
    datePickerCloseBtn: document.getElementById("datePickerCloseBtn"),
    categoryInput: document.getElementById("categoryInput"),
    nameInput: document.getElementById("nameInput"),
    noteInput: document.getElementById("noteInput"),
    barcodeInput: document.getElementById("barcodeInput"),
    expiryInput: document.getElementById("expiryInput"),
    pickDateBtn: document.getElementById("pickDateBtn"),
    calendarPrevBtn: document.getElementById("calendarPrevBtn"),
    calendarNextBtn: document.getElementById("calendarNextBtn"),
    calendarMonthLabel: document.getElementById("calendarMonthLabel"),
    expiryCalendarGrid: document.getElementById("expiryCalendarGrid"),
    hiddenDatePicker: document.getElementById("hiddenDatePicker"),
    clearFormBtn: document.getElementById("clearFormBtn"),
    scanBtn: document.getElementById("scanBtn"),
    stopScanBtn: document.getElementById("stopScanBtn"),
    scannerModal: document.getElementById("scannerModal"),
    scannerVideo: document.getElementById("scannerVideo"),
    toggleTorchBtn: document.getElementById("toggleTorchBtn"),
    scannerHint: document.getElementById("scannerHint"),
    barcodeModal: document.getElementById("barcodeModal"),
    barcodeSvg: document.getElementById("barcodeSvg"),
    barcodeModalText: document.getElementById("barcodeModalText"),
    barcodeProductName: document.getElementById("barcodeProductName"),
    barcodeFormatTag: document.getElementById("barcodeFormatTag"),
    closeBarcodeModalBtn: document.getElementById("closeBarcodeModalBtn"),
    editProductModal: document.getElementById("editProductModal"),
    editProductForm: document.getElementById("editProductForm"),
    editCategorySelect: document.getElementById("editCategorySelect"),
    editNameInput: document.getElementById("editNameInput"),
    editNoteInput: document.getElementById("editNoteInput"),
    editBarcodeInput: document.getElementById("editBarcodeInput"),
    editExpiryInput: document.getElementById("editExpiryInput"),
    editPickDateBtn: document.getElementById("editPickDateBtn"),
    editHiddenDatePicker: document.getElementById("editHiddenDatePicker"),
    editScanBtn: document.getElementById("editScanBtn"),
    saveEditProductBtn: document.getElementById("saveEditProductBtn"),
    cancelEditProductBtn: document.getElementById("cancelEditProductBtn"),
    deleteConfirmModal: document.getElementById("deleteConfirmModal"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
    cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
    errorModal: document.getElementById("errorModal"),
    errorModalMessage: document.getElementById("errorModalMessage"),
    closeErrorModalBtn: document.getElementById("closeErrorModalBtn"),
    productTableBody: document.getElementById("productTableBody"),
    selectAllProducts: document.getElementById("selectAllProducts"),
    selectAllProductsMobile: document.getElementById("selectAllProductsMobile"),
    selectedCountBadge: document.getElementById("selectedCountBadge"),
    healthCheckBar: document.getElementById("healthCheckBar"),
    missingDateCount: document.getElementById("missingDateCount"),
    missingBarcodeCount: document.getElementById("missingBarcodeCount"),
    duplicateBarcodeCount: document.getElementById("duplicateBarcodeCount"),
    expiredCount: document.getElementById("expiredCount"),
    expiring60Count: document.getElementById("expiring60Count"),
    expiring30Count: document.getElementById("expiring30Count"),
    backupReminderModal: document.getElementById("backupReminderModal"),
    backupNowBtn: document.getElementById("backupNowBtn"),
    backupLaterBtn: document.getElementById("backupLaterBtn"),
    backToTopBtn: document.getElementById("backToTopBtn"),
    duplicateBarcodeModal: document.getElementById("duplicateBarcodeModal"),
    duplicateBarcodeMessage: document.getElementById("duplicateBarcodeMessage"),
    overwriteDuplicateBtn: document.getElementById("overwriteDuplicateBtn"),
    keepDuplicateBtn: document.getElementById("keepDuplicateBtn"),
    cancelDuplicateBtn: document.getElementById("cancelDuplicateBtn"),
    emptyHint: document.getElementById("emptyHint"),
    categoryFilter: document.getElementById("categoryFilter"),
    sortSelect: document.getElementById("sortSelect"),
    searchInput: document.getElementById("searchInput"),
    scanSearchBtn: document.getElementById("scanSearchBtn"),
    toast: document.getElementById("toast")
  };
  ui.appMainTitle = document.getElementById("appMainTitle");

  let longPressTimer = null;
  let longPressProductId = null;
  let longPressStartX = 0;
  let longPressStartY = 0;
  let touchGuardActive = false;
  let touchGuardStartX = 0;
  let touchGuardStartY = 0;
  let suppressRowClickUntil = 0;
  let suppressNativeContextMenuUntil = 0;
  let brightnessRaised = false;
  let pendingDeleteIds = [];
  let pendingDuplicateChoice = null;
  const customSelects = new Map();
  const customSelectHistory = {
    key: "",
    ignoreNextPop: false
  };
  const datePickerState = {
    targetInput: null,
    targetHidden: null,
    selectedDate: "",
    month: new Date()
  };
  const modalHistory = {
    stack: [],
    ignoreNextPop: false,
    ignoreResetTimer: null
  };
  const nativeBackExit = {
    lastPressedAt: 0
  };
  const MODAL_KEYS_BY_PRIORITY = [
    "error",
    "datePicker",
    "scanner",
    "barcode",
    "edit",
    "duplicate",
    "delete",
    "backup",
    "update",
    "storage",
    "add"
  ];
  const HASH_HISTORY_MODAL_KEYS = new Set(["add", "edit"]);
  const LONG_PRESS_DELAY_MS = 800;
  const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
  const TOUCH_CLICK_MOVE_TOLERANCE_PX = 8;
  const TOUCH_CLICK_SUPPRESS_MS = 320;

  function applySavedTheme() {
    const saved = localStorage.getItem(THEME_SETTING_KEY) || DEFAULT_THEME_KEY;
    const normalized = THEME_ALIASES[saved] || saved;
    const themeKey = THEME_KEYS.has(normalized) ? normalized : DEFAULT_THEME_KEY;
    if (themeKey !== saved) {
      localStorage.setItem(THEME_SETTING_KEY, themeKey);
    }
    document.documentElement.setAttribute("data-theme", themeKey);
    syncThemeColorMeta();
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
      async readFileText() {
        return String(bridge.readDatabaseFile() || "");
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
      },
      supportsBarcodeScan() {
        return typeof bridge.requestBarcodeScan === "function";
      },
      requestBarcodeScan(target) {
        return new Promise((resolve, reject) => {
          if (typeof bridge.requestBarcodeScan !== "function") {
            reject(new Error("此 Android App 不支援原生條碼掃描"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-barcode-scanned", handler);
            const detail = event.detail || {};
            if (detail.ok && detail.value) {
              resolve({
                value: String(detail.value),
                format: String(detail.format || "")
              });
            } else if (detail.cancelled) {
              resolve(null);
            } else {
              reject(new Error(detail.error || "原生條碼掃描失敗"));
            }
          };
          window.addEventListener("android-barcode-scanned", handler, { once: true });
          try {
            const language = document.documentElement.lang || "zh-Hant";
            const theme = document.documentElement.dataset.theme || DEFAULT_THEME_KEY;
            bridge.requestBarcodeScan(String(target || "input"), String(language), String(theme));
          } catch (error) {
            window.removeEventListener("android-barcode-scanned", handler);
            reject(error);
          }
        });
      },
      setScreenBrightnessMax() {
        return new Promise((resolve, reject) => {
          if (typeof bridge.setScreenBrightnessMax !== "function") {
            resolve(false);
            return;
          }
          try {
            bridge.setScreenBrightnessMax();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      },
      resetScreenBrightness() {
        return new Promise((resolve, reject) => {
          if (typeof bridge.resetScreenBrightness !== "function") {
            resolve(false);
            return;
          }
          try {
            bridge.resetScreenBrightness();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      }
    };
  }

  function normalizeCustomAppTitle(value) {
    return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  }

  function getStoredCustomAppTitle() {
    return normalizeCustomAppTitle(localStorage.getItem(CUSTOM_APP_TITLE_KEY) || "");
  }

  function getEffectiveAppTitle() {
    return getStoredCustomAppTitle() || DEFAULT_APP_TITLE;
  }

  function applyAppTitle() {
    const title = getEffectiveAppTitle();
    if (ui.appMainTitle) {
      ui.appMainTitle.textContent = title;
    }
    document.title = title;
  }

  function refreshCustomAppTitle() {
    applyAppTitle();
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

  function getAppRelease() {
    const release = window.APP_RELEASE || {};
    const version = String(release.version || "v0.0.0").trim() || "v0.0.0";
    const title = String(release.title || `${version}更新內容`).trim();
    const items = Array.isArray(release.items)
      ? release.items.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    return { version, title, items };
  }

  function t(source) {
    const text = String(source || "");
    return window.AppI18n && typeof window.AppI18n.translateText === "function"
      ? window.AppI18n.translateText(text)
      : text;
  }

  function getScannerErrorMessage(error) {
    const name = String(error && error.name ? error.name : "");
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "需要相機權限才能掃描條碼；影像只在本機辨識，不會上傳。";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "找不到可用的相機，請改用手動輸入條碼";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "無法啟動相機，請確認沒有其他 App 正在使用相機";
    }
    if (name === "SecurityError") {
      return "瀏覽器封鎖相機權限，請確認網站或 App 已允許相機";
    }
    return error && error.message ? error.message : "發生未知錯誤";
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

  function showErrorModal(message) {
    const text = t(message || "發生未知錯誤");
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
      history.pushState({ appModal: key }, "", getModalHistoryUrl(key));
    } catch (_error) {
    }
  }

  function getModalHistoryUrl(key) {
    if (!HASH_HISTORY_MODAL_KEYS.has(key)) {
      return location.href;
    }
    const url = new URL(location.href);
    url.hash = `app-modal-${key}`;
    return url.href;
  }

  function closeManagedModal(key, modalEl, options = {}) {
    if (modalEl) {
      modalEl.classList.add("hidden");
    }
    modalHistory.stack = modalHistory.stack.filter((item) => item !== key);
    if (options.fromHistory || options.skipHistory) {
      return;
    }
    if (history.state && history.state.appModal === key) {
      modalHistory.ignoreNextPop = true;
      history.back();
      clearTimeout(modalHistory.ignoreResetTimer);
      modalHistory.ignoreResetTimer = setTimeout(() => {
        modalHistory.ignoreNextPop = false;
        modalHistory.ignoreResetTimer = null;
      }, 800);
    }
  }

  function getVisibleModalKey() {
    const modalMap = {
      add: ui.addProductModal,
      storage: ui.storageSetupModal,
      update: ui.updateNoticeModal,
      datePicker: ui.datePickerModal,
      scanner: ui.scannerModal,
      barcode: ui.barcodeModal,
      edit: ui.editProductModal,
      delete: ui.deleteConfirmModal,
      backup: ui.backupReminderModal,
      duplicate: ui.duplicateBarcodeModal,
      error: ui.errorModal
    };
    return MODAL_KEYS_BY_PRIORITY.find((key) => isModalVisible(modalMap[key])) || "";
  }

  function closeModalByKey(key, options = {}) {
    if (key === "scanner") {
      stopScanner(options);
    } else if (key === "barcode") {
      closeBarcodeModal(options);
    } else if (key === "edit") {
      closeEditProductModal(options);
    } else if (key === "delete") {
      closeDeleteConfirm(options);
    } else if (key === "backup") {
      closeManagedModal("backup", ui.backupReminderModal, options);
    } else if (key === "duplicate") {
      resolveDuplicateBarcodeChoice("cancel", options);
    } else if (key === "update") {
      closeUpdateNotice(options).catch((error) => showToast(`更新公告狀態儲存失敗: ${error.message}`, true));
    } else if (key === "datePicker") {
      closeDatePicker(options);
    } else if (key === "storage") {
      closeStorageSetupModal(options);
    } else if (key === "add") {
      closeAddProductModal(options);
    } else if (key === "error") {
      closeErrorModal(options);
    }
  }

  function closeTopModalFromHistory() {
    const key = getVisibleModalKey();
    if (!key) {
      return false;
    }
    closeModalByKey(key, { fromHistory: true });
    return true;
  }

  window.AppNativeBack = {
    handleBack() {
      if (closeOpenCustomSelect({ fromHistory: true })) {
        nativeBackExit.lastPressedAt = 0;
        return true;
      }
      if (closeTopModalFromHistory()) {
        nativeBackExit.lastPressedAt = 0;
        return true;
      }
      const now = Date.now();
      if (now - nativeBackExit.lastPressedAt <= NATIVE_BACK_EXIT_CONFIRM_MS) {
        nativeBackExit.lastPressedAt = 0;
        return NATIVE_BACK_EXIT_SIGNAL;
      }
      nativeBackExit.lastPressedAt = now;
      showToast("再按一次返回鍵關閉程式");
      return true;
    }
  };

  function syncBackToTopButton() {
    if (!ui.backToTopBtn) {
      return;
    }
    ui.backToTopBtn.classList.toggle("hidden", window.scrollY < 520);
  }

  function scrollToPageTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isFilePermissionActivationError(message) {
    const text = String(message || "");
    return text.includes("requestPermission") && text.includes("User activation is required");
  }

  function playTone(type) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return;
      }
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === "barcode") {
        osc.frequency.value = 1800;
        gain.gain.value = 0.12;
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } else {
        // shutter-like double click
        osc.frequency.value = 900;
        gain.gain.value = 0.09;
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch (_error) {
      // ignore audio failures
    }
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

  async function replaceAllProductsIndexedDb(products) {
    await withStore(STORE_PRODUCTS, "readwrite", (store) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        products.forEach((product) => store.put(product));
      };
    });
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

  async function hasReadWritePermissionGrant(fileHandle) {
    if (!fileHandle || typeof fileHandle.queryPermission !== "function") {
      return false;
    }
    return (await fileHandle.queryPermission({ mode: "readwrite" })) === "granted";
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

  function parseProductsPayload(text) {
    if (!text || !String(text).trim()) {
      return [];
    }
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.products)) {
      return parsed.products;
    }
    return [];
  }

  async function getCategories() {
    const saved = await getSetting(CATEGORY_SETTING_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return DEFAULT_CATEGORIES;
  }

  function getSelectLabel(selectEl) {
    if (!selectEl) {
      return "";
    }
    const selected = selectEl.options[selectEl.selectedIndex];
    if (selected) {
      return selected.textContent || "";
    }
    const firstEnabled = Array.from(selectEl.options).find((option) => !option.disabled);
    return firstEnabled ? firstEnabled.textContent : "";
  }

  function closeOpenCustomSelect(options = {}) {
    const openEntry = Array.from(customSelects.values()).find((entry) => entry.wrapper.classList.contains("is-open"));
    if (!openEntry) {
      return false;
    }
    openEntry.wrapper.classList.remove("is-open");
    openEntry.button.setAttribute("aria-expanded", "false");
    if (!options.fromHistory && !options.skipHistory && customSelectHistory.key === openEntry.select.id) {
      customSelectHistory.ignoreNextPop = true;
      history.back();
      setTimeout(() => {
        customSelectHistory.ignoreNextPop = false;
      }, 0);
    }
    customSelectHistory.key = "";
    return true;
  }

  function openCustomSelect(selectEl) {
    const entry = customSelects.get(selectEl);
    if (!entry) {
      return;
    }
    const hadOpen = Array.from(customSelects.values()).some((item) => item.wrapper.classList.contains("is-open"));
    const wasOpen = entry.wrapper.classList.contains("is-open");
    closeOpenCustomSelect({ skipHistory: true });
    if (wasOpen) {
      return;
    }
    entry.wrapper.classList.add("is-open");
    entry.button.setAttribute("aria-expanded", "true");
    customSelectHistory.key = selectEl.id || "";
    try {
      if (hadOpen && history.state && history.state.appDropdown) {
        history.replaceState({ appDropdown: customSelectHistory.key }, "", location.href);
      } else {
        history.pushState({ appDropdown: customSelectHistory.key }, "", location.href);
      }
    } catch (_error) {
    }
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
    wrapper.className = "custom-select";
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

  function setupCustomSelects() {
    [
      ui.categoryFilter,
      ui.sortSelect,
      ui.categoryInput,
      ui.editCategorySelect
    ].forEach(setupCustomSelect);
  }

  function renderCategoryOptions(categories) {
    if (!ui.categoryInput) {
      return;
    }
    ui.categoryInput.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("請選擇分類");
    placeholder.disabled = true;
    placeholder.selected = true;
    ui.categoryInput.appendChild(placeholder);

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      ui.categoryInput.appendChild(option);
    });
    applyRememberedAddCategory();
    syncCustomSelect(ui.categoryInput);
  }

  function applyRememberedAddCategory() {
    if (!ui.categoryInput || !state.lastAddCategory) {
      return;
    }
    const options = Array.from(ui.categoryInput.options).map((option) => option.value);
    if (options.includes(state.lastAddCategory)) {
      ui.categoryInput.value = state.lastAddCategory;
    }
  }

  async function rememberAddCategory(category) {
    const normalized = String(category || "").trim();
    if (!normalized || normalized === "未分類") {
      return;
    }
    state.lastAddCategory = normalized;
    try {
      await setSetting(LAST_ADD_CATEGORY_KEY, normalized);
    } catch (_error) {
    }
  }

  function renderEditCategoryOptions(categories) {
    if (!ui.editCategorySelect) {
      return;
    }
    const merged = Array.from(new Set((categories || []).concat(state.products.map((p) => p.category).filter(Boolean))));
    ui.editCategorySelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("請選擇分類");
    placeholder.disabled = true;
    ui.editCategorySelect.appendChild(placeholder);
    merged.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      ui.editCategorySelect.appendChild(option);
    });
    syncCustomSelect(ui.editCategorySelect);
  }

  function renderCategoryFilterOptions() {
    if (!ui.categoryFilter) {
      return;
    }
    const fromSettings = state.categories || [];
    const hasUncategorized = state.products.some((item) => !String(item.category || "").trim());
    const fromProducts = state.products.map((item) => item.category).filter(Boolean);
    const all = Array.from(new Set(fromSettings.concat(fromProducts)));
    const current = ui.categoryFilter.value || "";

    ui.categoryFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = t("全部分類");
    ui.categoryFilter.appendChild(allOption);

    all.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      ui.categoryFilter.appendChild(option);
    });

    if (hasUncategorized || !all.includes("未分類")) {
      const option = document.createElement("option");
      option.value = "__uncategorized__";
      option.textContent = t("未分類");
      ui.categoryFilter.appendChild(option);
    }

    if (current === "__uncategorized__") {
      ui.categoryFilter.value = "__uncategorized__";
      syncCustomSelect(ui.categoryFilter);
      return;
    }
    ui.categoryFilter.value = all.includes(current) ? current : "";
    syncCustomSelect(ui.categoryFilter);
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

  async function readProductsFromSelectedFile() {
    if (isNativeFileMode()) {
      const text = await nativeBridge.readFileText();
      return parseProductsPayload(text);
    }
    const file = await state.fileHandle.getFile();
    const text = await file.text();
    return parseProductsPayload(text);
  }

  async function writeProductsToSelectedFile(products) {
    if (isNativeFileMode()) {
      await nativeBridge.writeFileText(serializeProductsPayload(products));
      return;
    }
    const writer = await state.fileHandle.createWritable();
    await writer.write(serializeProductsPayload(products));
    await writer.close();
  }

  function buildBackupJsonPayload(products) {
    return {
      schema: "expiry-manager-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      app: {
        version: getAppRelease().version,
        db: APP_DB,
        mode: state.storageMode || "indexeddb"
      },
      settings: {
        categories: state.categories || []
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

  async function backupCurrentProductsJson() {
    const today = new Date().toISOString().slice(0, 10);
    await downloadJson(`expiry-backup-${today}.json`, buildBackupJsonPayload(state.products));
    await setSetting(INDEXEDDB_ADD_COUNT_KEY, 0);
    if (ui.backupReminderModal) {
      closeManagedModal("backup", ui.backupReminderModal);
    }
    showToast("JSON 備份成功");
  }

  async function recordIndexedDbAddForBackupReminder() {
    try {
      if (state.storageMode !== "indexeddb") {
        return;
      }
      const current = Number(await getSetting(INDEXEDDB_ADD_COUNT_KEY)) || 0;
      const next = current + 1;
      await setSetting(INDEXEDDB_ADD_COUNT_KEY, next);
      if (next >= INDEXEDDB_BACKUP_REMINDER_THRESHOLD && ui.backupReminderModal) {
        openManagedModal("backup", ui.backupReminderModal);
      }
    } catch (_error) {
      // 備份提醒計數失敗不應影響商品新增流程。
    }
  }

  async function hasSelectedFile() {
    if (isNativeFileMode()) {
      return nativeBridge.hasFile();
    }
    return !!state.fileHandle;
  }

  function normalizeDateInput(raw) {
    const value = String(raw || "").trim();
    if (!value) {
      return null;
    }

    const slashOrDash = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (slashOrDash) {
      return toIsoDate(
        Number(slashOrDash[1]),
        Number(slashOrDash[2]),
        Number(slashOrDash[3])
      );
    }

    const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) {
      return toIsoDate(
        Number(compact[1]),
        Number(compact[2]),
        Number(compact[3])
      );
    }

    return null;
  }

  function toIsoDate(year, month, day) {
    if (year < 1900 || year > 3000 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  function getTodayIsoDate() {
    const today = new Date();
    return toIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  function parseIsoDateParts(value) {
    const normalized = normalizeDateInput(value);
    if (!normalized) {
      return null;
    }
    const parts = normalized.split("-").map((part) => Number(part));
    return { year: parts[0], month: parts[1], day: parts[2], iso: normalized };
  }

  function compareDate(a, b) {
    return new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime();
  }

  function getStatusRank(expiryDate) {
    const status = getStatus(expiryDate).label;
    if (status === "已過期") {
      return 0;
    }
    if (status === "即期") {
      return 1;
    }
    return 2;
  }

  function getStatus(expiryDate) {
    const diffDays = getDaysUntilExpiry(expiryDate);

    if (diffDays < 0) {
      return { label: "已過期", badgeClass: "expired" };
    }
    if (diffDays <= EXPIRING_SOON_DAYS) {
      return { label: "即期", badgeClass: "warning" };
    }
    return { label: "未到期", badgeClass: "valid" };
  }

  function getDaysUntilExpiry(expiryDate) {
    const raw = String(expiryDate || "").trim();
    if (!raw) {
      return Number.POSITIVE_INFINITY;
    }
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiry = new Date(`${raw}T00:00:00`).getTime();
    if (!Number.isFinite(expiry)) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.floor((expiry - startOfToday) / (24 * 60 * 60 * 1000));
  }

  function isExpiredProduct(product) {
    return getStatus(product.expiryDate).label === "已過期";
  }

  function isExpiringWithin(product, days) {
    const diffDays = getDaysUntilExpiry(product.expiryDate);
    return diffDays >= 0 && diffDays <= days;
  }

  function isExpiringBetween(product, minDays, maxDays) {
    const diffDays = getDaysUntilExpiry(product.expiryDate);
    return diffDays >= minDays && diffDays <= maxDays;
  }

  function getDuplicateBarcodeSet(products) {
    const counts = new Map();
    (products || []).forEach((item) => {
      const barcode = String(item.barcode || "").trim();
      if (!barcode) {
        return;
      }
      counts.set(barcode, (counts.get(barcode) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter((entry) => entry[1] > 1).map((entry) => entry[0]));
  }

  function productMatchesCategoryFilter(product, categoryFilter) {
    if (!categoryFilter) {
      return true;
    }
    if (categoryFilter === "__uncategorized__") {
      return !String(product.category || "").trim();
    }
    return product.category === categoryFilter;
  }

  function getHealthStats(products = state.products) {
    const scopedProducts = Array.isArray(products) ? products : [];
    const duplicateSet = getDuplicateBarcodeSet(scopedProducts);
    return {
      missingDate: scopedProducts.filter((item) => !String(item.expiryDate || "").trim()).length,
      missingBarcode: scopedProducts.filter((item) => !String(item.barcode || "").trim()).length,
      duplicateBarcode: scopedProducts.filter((item) => duplicateSet.has(String(item.barcode || "").trim())).length,
      expired: scopedProducts.filter((item) => isExpiredProduct(item)).length,
      expiring60: scopedProducts.filter((item) => isExpiringBetween(item, 31, 60)).length,
      expiring30: scopedProducts.filter((item) => isExpiringWithin(item, 30)).length,
      duplicateSet
    };
  }

  function sortProducts(products) {
    return products.sort((a, b) => compareDate(a.expiryDate, b.expiryDate));
  }

  function sortForView(products) {
    const by = ui.sortSelect ? ui.sortSelect.value : "default";
    const cloned = products.slice();
    if (by === "category") {
      return cloned.sort((a, b) => a.category.localeCompare(b.category, "zh-Hant"));
    }
    if (by === "expiry") {
      return cloned.sort((a, b) => compareDate(a.expiryDate, b.expiryDate));
    }
    if (by === "status") {
      return cloned.sort((a, b) => getStatusRank(a.expiryDate) - getStatusRank(b.expiryDate));
    }
    return cloned.sort((a, b) => compareDate(a.expiryDate, b.expiryDate));
  }

  function productMatchesHealthFilter(product, stats) {
    if (!state.healthFilter) {
      return true;
    }
    if (state.healthFilter === "missing-date") {
      return !String(product.expiryDate || "").trim();
    }
    if (state.healthFilter === "missing-barcode") {
      return !String(product.barcode || "").trim();
    }
    if (state.healthFilter === "duplicate-barcode") {
      return stats.duplicateSet.has(String(product.barcode || "").trim());
    }
    if (state.healthFilter === "expired") {
      return isExpiredProduct(product);
    }
    if (state.healthFilter === "expiring-60") {
      return isExpiringBetween(product, 31, 60);
    }
    if (state.healthFilter === "expiring-30") {
      return isExpiringWithin(product, 30);
    }
    return true;
  }

  function syncHealthCheckUi(stats) {
    updateHealthCheckCount(ui.missingDateCount, stats.missingDate);
    updateHealthCheckCount(ui.missingBarcodeCount, stats.missingBarcode);
    updateHealthCheckCount(ui.duplicateBarcodeCount, stats.duplicateBarcode);
    updateHealthCheckCount(ui.expiredCount, stats.expired);
    updateHealthCheckCount(ui.expiring60Count, stats.expiring60);
    updateHealthCheckCount(ui.expiring30Count, stats.expiring30);
    if (ui.healthCheckBar) {
      ui.healthCheckBar.querySelectorAll("[data-health-filter]").forEach((button) => {
        button.classList.toggle("is-active", button.getAttribute("data-health-filter") === state.healthFilter);
      });
    }
    syncHealthCheckButtonText();
    requestAnimationFrame(fitHealthCheckButtons);
  }

  const HEALTH_CHECK_LABELS = {
    "missing-date": "無日期",
    "missing-barcode": "無條碼",
    "duplicate-barcode": "重複條碼",
    "expired": "已過期",
    "expiring-60": "60天內即期",
    "expiring-30": "30天內即期"
  };

  function getHealthCheckMobileParts(filter, count) {
    const lang = document.documentElement.lang || "zh-Hant";
    if (lang === "en") {
      if (filter === "missing-barcode") {
        return ["No code", count];
      }
      if (filter === "duplicate-barcode") {
        return ["Duplicate", `code ${count}`];
      }
      if (filter === "expiring-60") {
        return ["EXP ≦", `60d ${count}`];
      }
      if (filter === "expiring-30") {
        return ["EXP ≦", `30d ${count}`];
      }
    }
    if (lang === "ja") {
      if (filter === "missing-barcode") {
        return ["バーコード", `なし ${count}`];
      }
      if (filter === "duplicate-barcode") {
        return ["バーコード", `重複 ${count}`];
      }
    }
    if (lang !== "en" && lang !== "ja" && filter === "expiring-60") {
      return ["60天內", `即期 ${count}`];
    }
    if (lang !== "en" && lang !== "ja" && filter === "expiring-30") {
      return ["30天內", `即期 ${count}`];
    }
    return [t(HEALTH_CHECK_LABELS[filter] || ""), count];
  }

  function syncHealthCheckButtonText() {
    if (!ui.healthCheckBar) {
      return;
    }
    const isMobile = window.matchMedia("(max-width: 885px)").matches;
    ui.healthCheckBar.querySelectorAll(".health-check-btn").forEach((button) => {
      const filter = button.getAttribute("data-health-filter") || "";
      const label = button.querySelector(".health-check-label");
      const count = button.querySelector(".health-check-count");
      if (!label || !count) {
        return;
      }
      const rawCount = String(count.dataset.countValue || count.textContent || "0").trim() || "0";
      count.dataset.countValue = rawCount;
      const lang = document.documentElement.lang || "zh-Hant";
      const shouldUseCompactText = isMobile || lang === "en" || lang === "ja";
      const parts = shouldUseCompactText
        ? getHealthCheckMobileParts(filter, rawCount)
        : [t(HEALTH_CHECK_LABELS[filter] || ""), rawCount];
      label.textContent = parts[0];
      count.textContent = parts[1];
    });
  }

  function fitHealthCheckButtons() {
    if (!ui.healthCheckBar) {
      return;
    }
    const shouldFit = window.matchMedia("(max-width: 885px)").matches;
    const buttons = Array.from(ui.healthCheckBar.querySelectorAll(".health-check-btn"));
    buttons.forEach((button) => {
      button.style.removeProperty("--health-check-font-size");
    });
    if (!shouldFit) {
      syncHealthCheckButtonText();
      return;
    }
    syncHealthCheckButtonText();
    let nextFontSize = null;
    buttons.forEach((button) => {
      const style = window.getComputedStyle(button);
      const baseFontSize = parseFloat(style.fontSize) || 14;
      const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const availableWidth = Math.max(0, button.clientWidth - horizontalPadding);
      const measureCanvas = fitHealthCheckButtons.measureCanvas || document.createElement("canvas");
      fitHealthCheckButtons.measureCanvas = measureCanvas;
      const context = measureCanvas.getContext("2d");
      if (context) {
        context.font = style.font;
      }
      const textWidths = Array.from(button.querySelectorAll(".health-check-label, .health-check-count")).map((item) => {
          const text = item.textContent || "";
          return context ? Math.ceil(context.measureText(text).width) : item.scrollWidth;
        });
      const textWidth = Math.max.apply(Math, [0].concat(textWidths));
      if (!availableWidth || !textWidth || textWidth <= availableWidth) {
        return;
      }
      const fittedFontSize = Math.max(8, Math.floor(baseFontSize * availableWidth / textWidth) - 1);
      nextFontSize = nextFontSize === null ? fittedFontSize : Math.min(nextFontSize, fittedFontSize);
    });
    if (nextFontSize !== null) {
      buttons.forEach((button) => {
        button.style.setProperty("--health-check-font-size", `${nextFontSize}px`);
      });
    }
  }

  function updateHealthCheckCount(element, value) {
    if (!element) {
      return;
    }
    const text = String(value);
    element.dataset.countValue = text;
    element.textContent = text;
  }

  function productMatchesKeyword(product, keyword) {
    if (!keyword) {
      return true;
    }
    const text = `${product.category} ${product.name} ${product.barcode} ${product.note || ""}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  }

  function shouldIgnoreLongPressTarget(target) {
    return !!(target && target.closest && target.closest(
      "button, input, select, textarea, a, label, .btn, .checkbox-touch-target, .custom-select"
    ));
  }

  function shouldKeepHealthFilterForClick(target) {
    return !!(target && target.closest && target.closest(
      "button, input, select, textarea, a, label, .modal, tr[data-product-id], .calendar-day"
    ));
  }

  function clearHealthFilter() {
    if (!state.healthFilter) {
      return;
    }
    state.healthFilter = "";
    renderProducts();
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    longPressProductId = null;
  }

  function suppressRowClicksTemporarily() {
    suppressRowClickUntil = Date.now() + TOUCH_CLICK_SUPPRESS_MS;
  }

  function beginTouchClickGuard(clientX, clientY) {
    touchGuardActive = true;
    touchGuardStartX = Number(clientX) || 0;
    touchGuardStartY = Number(clientY) || 0;
  }

  function endTouchClickGuard() {
    touchGuardActive = false;
  }

  function updateTouchClickGuard(clientX, clientY) {
    if (!touchGuardActive) {
      return;
    }
    const dx = Math.abs((Number(clientX) || 0) - touchGuardStartX);
    const dy = Math.abs((Number(clientY) || 0) - touchGuardStartY);
    if (dx > TOUCH_CLICK_MOVE_TOLERANCE_PX || dy > TOUCH_CLICK_MOVE_TOLERANCE_PX) {
      suppressRowClicksTemporarily();
      cancelLongPress();
      touchGuardActive = false;
    }
  }

  function suppressNativeContextMenuTemporarily() {
    suppressNativeContextMenuUntil = Date.now() + 1400;
  }

  function scheduleLongPressForRow(rowEl, clientX, clientY) {
    if (!rowEl) {
      return;
    }
    const productId = rowEl.getAttribute("data-product-id");
    if (!productId) {
      return;
    }
    cancelLongPress();
    longPressProductId = productId;
    longPressStartX = Number(clientX) || 0;
    longPressStartY = Number(clientY) || 0;
    longPressTimer = setTimeout(async () => {
      const target = state.products.find((item) => item.id === longPressProductId);
      cancelLongPress();
      if (!target) {
        return;
      }
      suppressRowClicksTemporarily();
      suppressNativeContextMenuTemporarily();
      await openBarcodeModalForProduct(target);
    }, LONG_PRESS_DELAY_MS);
  }

  function isLongPressMoveExceeded(clientX, clientY) {
    const dx = Math.abs((Number(clientX) || 0) - longPressStartX);
    const dy = Math.abs((Number(clientY) || 0) - longPressStartY);
    return dx > LONG_PRESS_MOVE_TOLERANCE_PX || dy > LONG_PRESS_MOVE_TOLERANCE_PX;
  }

  function formatMonthLabel(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    return `${year}年${month}月`;
  }

  function renderExpiryCalendar() {
    if (!ui.expiryCalendarGrid || !ui.calendarMonthLabel) {
      return;
    }
    const monthDate = state.calendarMonth instanceof Date ? state.calendarMonth : new Date();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const productExpiryDates = new Set();
    state.products.forEach((item) => {
      const raw = String(item.expiryDate || "").trim();
      if (!raw) {
        return;
      }
      const normalized = normalizeDateInput(raw);
      if (!normalized) {
        return;
      }
      productExpiryDates.add(normalized);
    });

    ui.calendarMonthLabel.textContent = formatMonthLabel(firstDay);
    ui.expiryCalendarGrid.innerHTML = "";

    for (let i = 0; i < firstWeekday; i += 1) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-day empty";
      ui.expiryCalendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const cell = document.createElement("div");
      cell.className = "calendar-day";
      cell.textContent = String(day);
      cell.dataset.date = dateStr;
      if (productExpiryDates.has(dateStr)) {
        cell.classList.add("has-expiring");
        cell.title = t("有商品有效日期");
        cell.addEventListener("click", () => {
          if (state.calendarSelectedDate === dateStr) {
            state.calendarSelectedDate = "";
          } else {
            state.calendarSelectedDate = dateStr;
          }
          renderProducts();
        });
      }
      if (state.calendarSelectedDate === dateStr) {
        cell.classList.add("is-selected");
      }
      ui.expiryCalendarGrid.appendChild(cell);
    }
  }

  function renderCustomDatePicker() {
    if (!ui.datePickerGrid || !ui.datePickerMonthLabel) {
      return;
    }
    const current = datePickerState.month instanceof Date ? datePickerState.month : new Date();
    const year = current.getFullYear();
    const month = current.getMonth();
    ui.datePickerMonthLabel.textContent = `${year} 年 ${month + 1} 月`;
    ui.datePickerGrid.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = getTodayIsoDate();
    for (let i = 0; i < firstDay; i += 1) {
      const empty = document.createElement("span");
      empty.className = "custom-date-day empty";
      ui.datePickerGrid.appendChild(empty);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = toIsoDate(year, month + 1, day);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "custom-date-day";
      button.textContent = String(day);
      button.dataset.date = dateStr;
      if (dateStr === todayIso) {
        button.classList.add("is-today");
      }
      if (dateStr === datePickerState.selectedDate) {
        button.classList.add("is-selected");
      }
      button.addEventListener("click", () => {
        applyCustomDate(dateStr);
      });
      ui.datePickerGrid.appendChild(button);
    }
  }

  function openDatePickerFor(targetInput, targetHidden) {
    if (!targetInput || !ui.datePickerModal) {
      return;
    }
    const parsed = parseIsoDateParts(targetInput.value);
    const today = new Date();
    datePickerState.targetInput = targetInput;
    datePickerState.targetHidden = targetHidden || null;
    datePickerState.selectedDate = parsed ? parsed.iso : "";
    datePickerState.month = parsed
      ? new Date(parsed.year, parsed.month - 1, 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);
    renderCustomDatePicker();
    openManagedModal("datePicker", ui.datePickerModal);
  }

  function applyCustomDate(dateStr) {
    if (datePickerState.targetInput) {
      datePickerState.targetInput.value = dateStr;
      datePickerState.targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      datePickerState.targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (datePickerState.targetHidden) {
      datePickerState.targetHidden.value = dateStr;
    }
    closeDatePicker();
  }

  function clearCustomDate() {
    if (datePickerState.targetInput) {
      datePickerState.targetInput.value = "";
      datePickerState.targetInput.dispatchEvent(new Event("input", { bubbles: true }));
      datePickerState.targetInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (datePickerState.targetHidden) {
      datePickerState.targetHidden.value = "";
    }
    closeDatePicker();
  }

  function closeDatePicker(options = {}) {
    datePickerState.targetInput = null;
    datePickerState.targetHidden = null;
    datePickerState.selectedDate = "";
    closeManagedModal("datePicker", ui.datePickerModal, options);
  }

  function renderProducts() {
    const keyword = ui.searchInput.value.trim();
    const categoryFilter = ui.categoryFilter ? ui.categoryFilter.value : "";
    const sortMode = ui.sortSelect ? ui.sortSelect.value : "";
    const selectedDate = String(state.calendarSelectedDate || "").trim();
    const categoryScopedProducts = state.products.filter((item) => productMatchesCategoryFilter(item, categoryFilter));
    const healthStats = getHealthStats(categoryScopedProducts);
    syncHealthCheckUi(healthStats);
    const filtered = categoryScopedProducts.filter((item) => {
      const keywordMatch = productMatchesKeyword(item, keyword);
      const dateMatch = !selectedDate || String(item.expiryDate || "").trim() === selectedDate;
      const healthMatch = productMatchesHealthFilter(item, healthStats);
      return keywordMatch && dateMatch && healthMatch;
    });
    const sorted = sortForView(filtered);
    const validIds = new Set(state.products.map((item) => item.id));
    state.selectedProductIds = new Set(
      Array.from(state.selectedProductIds).filter((id) => validIds.has(id))
    );
    ui.productTableBody.innerHTML = "";
    sorted.forEach((product) => {
      const status = getStatus(product.expiryDate);
      const note = String(product.note || "").trim();
      const noteClass = note ? "note-cell" : "note-cell is-empty";
      const tr = document.createElement("tr");
      tr.setAttribute("data-product-id", product.id);
      tr.setAttribute("data-barcode", product.barcode || "");

      const categoryCell = document.createElement("td");
      categoryCell.setAttribute("data-label", "分類");
      categoryCell.textContent = product.category || "";

      const nameCell = document.createElement("td");
      nameCell.setAttribute("data-label", "商品名稱");
      const nameWrap = document.createElement("span");
      nameWrap.className = "product-text-wrap";
      nameWrap.textContent = product.name || "";
      nameCell.appendChild(nameWrap);

      const barcodeCell = document.createElement("td");
      barcodeCell.setAttribute("data-label", "條碼");
      barcodeCell.textContent = product.barcode || "";

      const expiryCell = document.createElement("td");
      expiryCell.setAttribute("data-label", "有效日期");
      expiryCell.textContent = product.expiryDate || "";

      const noteCell = document.createElement("td");
      noteCell.className = noteClass;
      noteCell.setAttribute("data-label", "備註");
      const noteWrap = document.createElement("span");
      noteWrap.className = "product-text-wrap";
      noteWrap.textContent = note;
      noteCell.appendChild(noteWrap);

      const statusCell = document.createElement("td");
      statusCell.setAttribute("data-label", "狀態");
      const statusBadge = document.createElement("span");
      statusBadge.className = `badge ${status.badgeClass}`;
      statusBadge.textContent = status.label;
      statusCell.appendChild(statusBadge);

      const actionCell = document.createElement("td");
      actionCell.className = "action-cell";
      actionCell.setAttribute("data-label", "操作");
      const actionStack = document.createElement("div");
      actionStack.className = "action-stack";
      const editButton = document.createElement("button");
      editButton.className = "btn secondary";
      editButton.type = "button";
      editButton.setAttribute("data-edit-id", product.id);
      editButton.textContent = t("編輯");
      const deleteButton = document.createElement("button");
      deleteButton.className = "btn secondary";
      deleteButton.type = "button";
      deleteButton.setAttribute("data-delete-id", product.id);
      deleteButton.textContent = t("刪除");
      actionStack.appendChild(editButton);
      actionStack.appendChild(deleteButton);
      actionCell.appendChild(actionStack);

      const selectCell = document.createElement("td");
      selectCell.className = "select-col";
      selectCell.setAttribute("data-label", "選取");
      const selectLabel = document.createElement("label");
      selectLabel.className = "checkbox-touch-target";
      selectLabel.setAttribute("aria-label", "選取商品");
      const selectInput = document.createElement("input");
      selectInput.className = "row-select-product";
      selectInput.type = "checkbox";
      selectInput.setAttribute("data-select-id", product.id);
      selectInput.checked = state.selectedProductIds.has(product.id);
      selectLabel.appendChild(selectInput);
      selectCell.appendChild(selectLabel);

      tr.appendChild(categoryCell);
      tr.appendChild(nameCell);
      tr.appendChild(barcodeCell);
      tr.appendChild(expiryCell);
      tr.appendChild(noteCell);
      tr.appendChild(statusCell);
      tr.appendChild(actionCell);
      tr.appendChild(selectCell);
      ui.productTableBody.appendChild(tr);
    });
    const syncSelectAllState = (checkboxEl) => {
      if (!checkboxEl) {
        return;
      }
      if (sorted.length === 0) {
        checkboxEl.checked = false;
        checkboxEl.indeterminate = false;
      } else {
        const selectedCount = sorted.filter((item) => state.selectedProductIds.has(item.id)).length;
        checkboxEl.checked = selectedCount === sorted.length;
        checkboxEl.indeterminate = selectedCount > 0 && selectedCount < sorted.length;
      }
    };
    syncSelectAllState(ui.selectAllProducts);
    syncSelectAllState(ui.selectAllProductsMobile);
    if (ui.selectedCountBadge) {
      const selectedCount = state.selectedProductIds.size;
      ui.selectedCountBadge.textContent = `已勾選 ${selectedCount} 筆`;
      ui.selectedCountBadge.classList.toggle("is-hidden", selectedCount <= 0);
    }
    ui.emptyHint.style.display = sorted.length === 0 ? "block" : "none";
    renderExpiryCalendar();
  }

  function handleSortModeChange() {
    renderProducts();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function persistCurrentProducts() {
    await replaceAllProductsIndexedDb(state.products);
    if (state.storageMode === "file") {
      if (!(await hasSelectedFile())) {
        state.storageMode = "indexeddb";
        await setSetting(MODE_SETTING_KEY, "indexeddb");
        return;
      }
      if (!isNativeFileMode()) {
        const ok = await hasReadWritePermission(state.fileHandle);
        if (!ok) {
          showToast("尚未連回先前的本機 JSON 檔案，已先儲存在 IndexedDB。請到設定重新選擇同一個 JSON 檔案");
          return;
        }
      }
      await writeProductsToSelectedFile(state.products);
    }
  }

  async function loadInitialState() {
    const savedMode = (await getSetting(MODE_SETTING_KEY)) || DEFAULT_MODE;
    state.storageMode = savedMode;
    state.fileHandle = await getSetting(FILE_HANDLE_SETTING_KEY);
    if (state.storageMode === "file" && !(await hasSelectedFile())) {
      state.storageMode = "indexeddb";
      await setSetting(MODE_SETTING_KEY, "indexeddb");
    }

    state.categories = await getCategories();
    state.lastAddCategory = String((await getSetting(LAST_ADD_CATEGORY_KEY)) || "").trim();
    renderCategoryOptions(state.categories);
    renderEditCategoryOptions(state.categories);
    renderCategoryFilterOptions();

    if (state.storageMode === "file" && isNativeFileMode()) {
      if (await hasSelectedFile()) {
        try {
          const fileProducts = sortProducts(await readProductsFromSelectedFile());
          if (Array.isArray(fileProducts) && fileProducts.length > 0) {
            state.products = fileProducts;
          } else {
            const indexedProducts = sortProducts(await getAllProductsFromIndexedDb());
            state.products = indexedProducts;
            if (indexedProducts.length > 0) {
              await writeProductsToSelectedFile(indexedProducts);
            }
          }
        } catch (error) {
          showToast(`讀取檔案資料庫失敗: ${error.message}`, true);
          state.products = sortProducts(await getAllProductsFromIndexedDb());
        }
      } else {
        state.products = sortProducts(await getAllProductsFromIndexedDb());
      }
      renderProducts();
      return;
    }

    if (state.storageMode === "file" && state.fileHandle) {
      try {
        const granted = await hasReadWritePermissionGrant(state.fileHandle);
        if (granted) {
          state.products = sortProducts(await readProductsFromSelectedFile());
        } else {
          state.products = sortProducts(await getAllProductsFromIndexedDb());
        }
      } catch (error) {
        state.products = sortProducts(await getAllProductsFromIndexedDb());
        showToast(`讀取檔案資料庫失敗: ${error.message}`, true);
      }
      renderProducts();
      return;
    }

    state.products = sortProducts(await getAllProductsFromIndexedDb());
    renderProducts();
  }

  function openStorageSetupModal() {
    if (!ui.storageSetupModal) {
      return;
    }
    if (ui.chooseFileStorageBtn) {
      ui.chooseFileStorageBtn.disabled = !supportsExternalFileStorage();
    }
    openManagedModal("storage", ui.storageSetupModal);
  }

  function closeStorageSetupModal(options = {}) {
    closeManagedModal("storage", ui.storageSetupModal, options);
  }

  async function completeIndexedDbStorageSetup() {
    state.storageMode = "indexeddb";
    state.fileHandle = null;
    await setSetting(MODE_SETTING_KEY, "indexeddb");
    await setSetting(FILE_HANDLE_SETTING_KEY, null);
    await setSetting(STORAGE_SETUP_KEY, true);
    closeStorageSetupModal();
    showToast("已使用 IndexedDB 儲存資料");
    await maybeShowUpdateNotice();
  }

  async function completeFileStorageSetup() {
    if (isNativeFileMode()) {
      await nativeBridge.selectFileText("expiry-manager-data.json", serializeProductsPayload(state.products));
      state.storageMode = "file";
      await setSetting(MODE_SETTING_KEY, "file");
      await setSetting(STORAGE_SETUP_KEY, true);
      closeStorageSetupModal();
      showToast("已使用本機檔案位置儲存資料");
      await maybeShowUpdateNotice();
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

    const existingProducts = await readProductsFromSelectedFile();
    if (Array.isArray(existingProducts) && existingProducts.length > 0) {
      state.products = sortProducts(existingProducts);
      await replaceAllProductsIndexedDb(state.products);
      renderProducts();
    } else {
      await writeProductsToSelectedFile(state.products);
    }

    closeStorageSetupModal();
    showToast("已使用本機檔案位置儲存資料");
    await maybeShowUpdateNotice();
  }

  async function maybeShowStorageSetup() {
    const completed = await getSetting(STORAGE_SETUP_KEY);
    if (completed === true) {
      return;
    }
    openStorageSetupModal();
  }

  async function closeUpdateNotice(options = {}) {
    await setSetting(LAST_SEEN_VERSION_KEY, getAppRelease().version);
    closeManagedModal("update", ui.updateNoticeModal, options);
  }

  async function maybeShowUpdateNotice() {
    const storageSetupCompleted = await getSetting(STORAGE_SETUP_KEY);
    if (storageSetupCompleted !== true) {
      return;
    }
    const lastSeenVersion = await getSetting(LAST_SEEN_VERSION_KEY);
    const release = getAppRelease();
    if (lastSeenVersion === release.version) {
      return;
    }
    if (ui.updateNoticeTitle) {
      ui.updateNoticeTitle.textContent = t(release.title);
    }
    if (ui.updateNoticeList) {
      ui.updateNoticeList.innerHTML = "";
      release.items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = t(item);
        ui.updateNoticeList.appendChild(li);
      });
    }
    if (ui.updateNoticeModal) {
      openManagedModal("update", ui.updateNoticeModal);
    }
  }

  function refreshUpdateNoticeLanguage() {
    if (!ui.updateNoticeModal || !isModalVisible(ui.updateNoticeModal)) {
      return;
    }
    const release = getAppRelease();
    if (ui.updateNoticeTitle) {
      ui.updateNoticeTitle.textContent = t(release.title);
    }
    if (ui.updateNoticeList) {
      Array.from(ui.updateNoticeList.children).forEach((item, index) => {
        item.textContent = t(release.items[index] || "");
      });
    }
  }

  function getProductDateFromForm() {
    const raw = ui.expiryInput.value.trim();
    if (!raw) {
      const today = new Date();
      const yyyy = String(today.getFullYear());
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const fallback = `${yyyy}-${mm}-${dd}`;
      ui.expiryInput.value = fallback;
      ui.hiddenDatePicker.value = fallback;
      return fallback;
    }
    const parsed = normalizeDateInput(raw);
    if (!parsed) {
      throw new Error("日期格式錯誤，請使用 YYYY-MM-DD / YYYY/MM/DD / YYYYMMDD");
    }
    ui.expiryInput.value = parsed;
    ui.hiddenDatePicker.value = parsed;
    return parsed;
  }

  function clearForm() {
    ui.productForm.reset();
    syncCustomSelect(ui.categoryInput);
    if (ui.barcodeInput) {
      delete ui.barcodeInput.dataset.barcodeFormat;
    }
  }

  function openAddProductModal() {
    renderCategoryOptions(state.categories);
    applyRememberedAddCategory();
    syncCustomSelect(ui.categoryInput);
    openManagedModal("add", ui.addProductModal);
    if (ui.nameInput) {
      ui.nameInput.focus();
    }
  }

  function closeAddProductModal(options = {}) {
    closeManagedModal("add", ui.addProductModal, options);
  }

  function findDuplicateBarcodeProduct(barcode, excludeId = "") {
    const normalized = String(barcode || "").trim();
    if (!normalized) {
      return null;
    }
    return state.products.find((item) =>
      item.id !== excludeId && String(item.barcode || "").trim() === normalized
    ) || null;
  }

  function requestDuplicateBarcodeChoice({ barcode, productName, mode }) {
    if (!ui.duplicateBarcodeModal) {
      return Promise.resolve("keep");
    }
    if (ui.duplicateBarcodeMessage) {
      const action = mode === "edit" ? "儲存" : "新增";
      ui.duplicateBarcodeMessage.textContent = t(`條碼 ${barcode} 已存在於「${productName || "未命名商品"}」。請選擇要覆蓋既有商品、仍然${action}，或取消。`);
    }
    if (ui.keepDuplicateBtn) {
      ui.keepDuplicateBtn.textContent = t(mode === "edit" ? "仍然儲存" : "仍然新增");
    }
    openManagedModal("duplicate", ui.duplicateBarcodeModal);
    return new Promise((resolve) => {
      pendingDuplicateChoice = resolve;
    });
  }

  function resolveDuplicateBarcodeChoice(choice, options = {}) {
    closeManagedModal("duplicate", ui.duplicateBarcodeModal, options);
    if (pendingDuplicateChoice) {
      const resolve = pendingDuplicateChoice;
      pendingDuplicateChoice = null;
      resolve(choice);
    }
  }

  async function addProductFromForm(event) {
    event.preventDefault();

    const category = ui.categoryInput.value.trim() || "未分類";
    const name = ui.nameInput.value.trim() || "未命名商品";
    const note = ui.noteInput ? ui.noteInput.value.trim() : "";
    const barcode = ui.barcodeInput.value.trim();
    const expiryDate = getProductDateFromForm();

    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const product = {
      id,
      category,
      name,
      note,
      barcode,
      barcodeFormat: (ui.barcodeInput && ui.barcodeInput.dataset && ui.barcodeInput.dataset.barcodeFormat)
        ? ui.barcodeInput.dataset.barcodeFormat
        : inferBarcodeFormat(barcode),
      expiryDate,
      createdAt: new Date().toISOString()
    };

    const prevProducts = state.products.map((item) => Object.assign({}, item));
    try {
      const duplicate = findDuplicateBarcodeProduct(barcode);
      let addedCount = 1;
      if (duplicate) {
        const choice = await requestDuplicateBarcodeChoice({
          barcode,
          productName: duplicate.name,
          mode: "add"
        });
        if (choice === "cancel") {
          return;
        }
        if (choice === "overwrite") {
          Object.assign(duplicate, {
            category,
            name,
            note,
            barcode,
            barcodeFormat: product.barcodeFormat,
            expiryDate
          });
          addedCount = 0;
        } else {
          state.products.push(product);
        }
      } else {
        state.products.push(product);
      }
      sortProducts(state.products);
      await persistCurrentProducts();
      await rememberAddCategory(category);
      renderProducts();
      clearForm();
      closeAddProductModal();
      if (addedCount > 0) {
        await recordIndexedDbAddForBackupReminder();
      }
      showToast(addedCount > 0 ? "商品已新增" : "已覆蓋既有商品");
    } catch (error) {
      state.products = prevProducts;
      throw error;
    }
  }

  async function deleteProductsByIds(ids) {
    const idSet = new Set((ids || []).filter(Boolean));
    if (idSet.size === 0) {
      return;
    }
    const prevProducts = state.products.slice();
    const prevSelected = new Set(state.selectedProductIds);
    try {
      state.products = state.products.filter((item) => !idSet.has(item.id));
      state.selectedProductIds = new Set(
        Array.from(state.selectedProductIds).filter((id) => !idSet.has(id))
      );
      await persistCurrentProducts();
      renderProducts();
      showToast("商品已刪除");
    } catch (error) {
      state.products = prevProducts;
      state.selectedProductIds = prevSelected;
      throw error;
    }
  }

  function openDeleteConfirm(ids) {
    const normalized = Array.from(new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean)));
    if (normalized.length === 0) {
      return;
    }
    pendingDeleteIds = normalized;
    openManagedModal("delete", ui.deleteConfirmModal);
  }

  function closeDeleteConfirm(options = {}) {
    pendingDeleteIds = [];
    closeManagedModal("delete", ui.deleteConfirmModal, options);
  }

  async function editProductById(id) {
    const target = state.products.find((item) => item.id === id);
    if (!target) {
      throw new Error("找不到要編輯的商品");
    }
    state.editingProductId = id;
    renderEditCategoryOptions(state.categories);
    const options = Array.from(ui.editCategorySelect.options).map((o) => o.value);
    ui.editCategorySelect.value = options.includes(target.category || "") ? (target.category || "") : "";
    syncCustomSelect(ui.editCategorySelect);
    ui.editNameInput.value = target.name || "";
    if (ui.editNoteInput) {
      ui.editNoteInput.value = target.note || "";
    }
    ui.editBarcodeInput.value = target.barcode || "";
    ui.editBarcodeInput.dataset.barcodeFormat = target.barcodeFormat || inferBarcodeFormat(target.barcode || "");
    ui.editExpiryInput.value = target.expiryDate || "";
    if (ui.editHiddenDatePicker) {
      ui.editHiddenDatePicker.value = normalizeDateInput(target.expiryDate || "") || "";
    }
    openManagedModal("edit", ui.editProductModal);
  }

  function closeEditProductModal(options = {}) {
    state.editingProductId = null;
    closeManagedModal("edit", ui.editProductModal, options);
  }

  async function saveEditedProduct() {
    const id = state.editingProductId;
    const target = state.products.find((item) => item.id === id);
    if (!target) {
      throw new Error("找不到要編輯的商品");
    }
    const category = (ui.editCategorySelect.value || "").trim();
    const name = (ui.editNameInput.value || "").trim();
    const note = ui.editNoteInput ? ui.editNoteInput.value.trim() : "";
    const barcode = (ui.editBarcodeInput.value || "").trim();
    const expiryRaw = (ui.editExpiryInput.value || "").trim();
    const expiryDate = expiryRaw ? normalizeDateInput(expiryRaw) : "";
    if (expiryRaw && !expiryDate) {
      throw new Error("有效日期格式錯誤，請使用 YYYY-MM-DD");
    }
    const prevProducts = state.products.map((item) => Object.assign({}, item));
    try {
      const duplicate = findDuplicateBarcodeProduct(barcode, id);
      let overwriteDuplicateId = "";
      if (duplicate) {
        const choice = await requestDuplicateBarcodeChoice({
          barcode,
          productName: duplicate.name,
          mode: "edit"
        });
        if (choice === "cancel") {
          return;
        }
        if (choice === "overwrite") {
          overwriteDuplicateId = duplicate.id;
        }
      }
      const selectedIds = Array.from(state.selectedProductIds || []);
      const selectedIdSet = new Set(
        selectedIds.filter((selectedId) => state.products.some((item) => item.id === selectedId))
      );

      // 有勾選多筆時，編輯視窗中的分類會同步套用到所有已勾選商品
      if (selectedIdSet.size > 1) {
        state.products.forEach((item) => {
          if (selectedIdSet.has(item.id)) {
            item.category = category || "未分類";
          }
        });
      } else {
        target.category = category;
      }
      target.name = name;
      target.note = note;
      target.barcode = barcode;
      target.barcodeFormat = (ui.editBarcodeInput && ui.editBarcodeInput.dataset && ui.editBarcodeInput.dataset.barcodeFormat)
        ? ui.editBarcodeInput.dataset.barcodeFormat
        : inferBarcodeFormat(barcode);
      target.expiryDate = expiryDate;
      if (overwriteDuplicateId) {
        state.products = state.products.filter((item) => item.id !== overwriteDuplicateId);
        state.selectedProductIds.delete(overwriteDuplicateId);
      }
      await persistCurrentProducts();
      renderProducts();
      closeEditProductModal();
      if (selectedIdSet.size > 1) {
        showToast(`已同步更新 ${selectedIdSet.size} 筆商品分類`);
      } else {
        showToast("商品已更新");
      }
    } catch (error) {
      state.products = prevProducts;
      throw error;
    }
  }

  function computeEan13CheckDigit(first12) {
    if (!/^\d{12}$/.test(first12)) {
      return null;
    }
    let sum = 0;
    for (let i = 0; i < 12; i += 1) {
      const digit = Number(first12[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function normalizeEan13(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^\d{13}$/.test(digits)) {
      const check = computeEan13CheckDigit(digits.slice(0, 12));
      return check === digits[12] ? digits : null;
    }
    if (/^\d{12}$/.test(digits)) {
      const check = computeEan13CheckDigit(digits);
      return check ? `${digits}${check}` : null;
    }
    return null;
  }

  function renderEan13Svg(svg, ean13) {
    if (!svg) {
      return;
    }
    const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
    const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
    const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
    const PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

    const digits = ean13.split("").map((n) => Number(n));
    const first = digits[0];
    const parity = PARITY[first];
    let bits = "101";
    for (let i = 1; i <= 6; i += 1) {
      const d = digits[i];
      bits += parity[i - 1] === "L" ? L[d] : G[d];
    }
    bits += "01010";
    for (let i = 7; i <= 12; i += 1) {
      bits += R[digits[i]];
    }
    bits += "101";

    const width = 400;
    const height = 180;
    const quiet = 20;
    const barAreaWidth = width - quiet * 2;
    const moduleW = barAreaWidth / bits.length;
    let x = quiet;
    let rects = "";
    for (let i = 0; i < bits.length; i += 1) {
      const h = (i < 3 || (i >= 45 && i < 50) || i >= bits.length - 3) ? 140 : 125;
      if (bits[i] === "1") {
        rects += `<rect x="${x.toFixed(3)}" y="16" width="${moduleW.toFixed(3)}" height="${h}" fill="#111"></rect>`;
      }
      x += moduleW;
    }
    svg.innerHTML = `${rects}<text x="200" y="172" text-anchor="middle" font-size="18" fill="#222" font-family="monospace">${ean13}</text>`;
  }

  function inferBarcodeFormat(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/\D/g, "");
    if (/^\d{13}$/.test(digits) && normalizeEan13(digits)) {
      return "ean_13";
    }
    if (/^\d{12}$/.test(digits)) {
      return "upc_a";
    }
    if (/^\d{8}$/.test(digits)) {
      return "ean_8";
    }
    if (/^[0-9A-Z\-.$/+% ]+$/.test(raw)) {
      return "code_39";
    }
    return "code_128";
  }

  function renderGenericBarcodeSvg(svg, value) {
    if (!svg) {
      return;
    }
    const text = String(value || "").trim();
    const source = text || "NO-DATA";
    const width = 400;
    const quiet = 20;
    const usable = width - quiet * 2;
    const modulesPerChar = 11;
    const moduleCount = Math.max(source.length * modulesPerChar, 88);
    const moduleW = usable / moduleCount;
    let bits = "";
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      bits += code.toString(2).padStart(8, "0");
    }
    while (bits.length < moduleCount) {
      bits += "1011001110";
    }
    bits = bits.slice(0, moduleCount);
    let x = quiet;
    let rects = "";
    for (let i = 0; i < bits.length; i += 1) {
      if (bits[i] === "1") {
        rects += `<rect x="${x.toFixed(3)}" y="22" width="${moduleW.toFixed(3)}" height="124" fill="#111"></rect>`;
      }
      x += moduleW;
    }
    svg.innerHTML = `${rects}<text x="200" y="172" text-anchor="middle" font-size="18" fill="#222" font-family="monospace">${escapeHtml(text)}</text>`;
  }

  function renderBarcodeByFormat(svg, value, format) {
    const fmt = String(format || "").toLowerCase();
    const ean13 = normalizeEan13(value);
    if ((fmt === "ean_13" || fmt === "upc_a" || fmt === "upc_e" || fmt === "ean_8") && ean13) {
      renderEan13Svg(svg, ean13);
      return true;
    }
    renderGenericBarcodeSvg(svg, value);
    return false;
  }

  async function openBarcodeModalForProduct(product) {
    if (!product) {
      return;
    }
    const barcodeValue = String(product.barcode || "").trim();
    const format = String(product.barcodeFormat || inferBarcodeFormat(barcodeValue)).toLowerCase();
    renderBarcodeByFormat(ui.barcodeSvg, barcodeValue, format);
    if (ui.barcodeProductName) {
      ui.barcodeProductName.textContent = product.name || t("商品");
    }
    if (ui.barcodeFormatTag) {
      ui.barcodeFormatTag.textContent = format ? format.toUpperCase() : "UNKNOWN";
    }
    if (ui.barcodeModalText) {
      ui.barcodeModalText.textContent = "";
    }
    if (ui.barcodeModal) {
      openManagedModal("barcode", ui.barcodeModal);
    }
    if (nativeBridge && typeof nativeBridge.setScreenBrightnessMax === "function") {
      try {
        await nativeBridge.setScreenBrightnessMax();
        brightnessRaised = true;
      } catch (_error) {
        brightnessRaised = false;
      }
    }
  }

  async function closeBarcodeModal(options = {}) {
    closeManagedModal("barcode", ui.barcodeModal, options);
    if (nativeBridge && typeof nativeBridge.resetScreenBrightness === "function") {
      try {
        await nativeBridge.resetScreenBrightness();
      } catch (_error) {
      }
    }
    brightnessRaised = false;
  }

  async function createBarcodeDetector() {
    if (!("BarcodeDetector" in window)) {
      throw new Error("此瀏覽器不支援 BarcodeDetector，請改用手動輸入條碼");
    }

    try {
      return new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf"]
      });
    } catch (_error) {
      return new BarcodeDetector();
    }
  }

  function getScannerVideoTrack() {
    const stream = state.scanner.stream;
    if (!stream || !stream.getVideoTracks) {
      return null;
    }
    return stream.getVideoTracks()[0] || null;
  }

  function updateTorchButton() {
    if (!ui.toggleTorchBtn) {
      return;
    }
    ui.toggleTorchBtn.disabled = !state.scanner.torchSupported;
    if (!state.scanner.torchOn) {
      ui.toggleTorchBtn.textContent = t("打開手電筒");
    } else if (!state.scanner.torchPersistent) {
      ui.toggleTorchBtn.textContent = t("長亮手電筒");
    } else {
      ui.toggleTorchBtn.textContent = t("關閉手電筒");
    }
  }

  async function setTorch(on) {
    const track = getScannerVideoTrack();
    if (!track || typeof track.applyConstraints !== "function") {
      throw new Error("此裝置不支援手電筒控制");
    }
    await track.applyConstraints({ advanced: [{ torch: !!on }] });
    state.scanner.torchOn = !!on;
    if (!on) {
      state.scanner.torchPersistent = false;
    }
    updateTorchButton();
  }

  async function toggleTorchMode() {
    if (!state.scanner.torchOn) {
      await setTorch(true);
      state.scanner.torchPersistent = false;
    } else if (!state.scanner.torchPersistent) {
      state.scanner.torchPersistent = true;
    } else {
      await setTorch(false);
    }
    updateTorchButton();
  }

  async function setupCameraControls() {
    const stream = state.scanner.stream;
    if (!stream) {
      return;
    }
    const track = stream.getVideoTracks && stream.getVideoTracks()[0];
    if (!track) {
      return;
    }
    const caps = typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
    const settings = typeof track.getSettings === "function" ? track.getSettings() : {};
    state.scanner.torchSupported = caps.torch === true;
    state.scanner.torchOn = settings.torch === true;
    if (!state.scanner.torchOn) {
      state.scanner.torchPersistent = false;
    }
    updateTorchButton();

  }

  async function startScanner(mode, barcodeTarget = "input") {
    if (nativeBridge && typeof nativeBridge.supportsBarcodeScan === "function" && nativeBridge.supportsBarcodeScan()) {
      const result = await nativeBridge.requestBarcodeScan(barcodeTarget);
      if (!result) {
        return;
      }
      applyScannedBarcode(result.value, result.format, barcodeTarget);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此裝置或 WebView 不支援鏡頭掃描，請改用手動輸入條碼");
    }

    if (ui.scannerHint) {
      ui.scannerHint.textContent = t("需要相機權限才能掃描條碼；影像只在本機辨識，不會上傳。");
    }
    state.scanner.mode = mode;
    state.scanner.barcodeTarget = barcodeTarget;
    state.scanner.detector = await createBarcodeDetector();
    if (!state.scanner.stream) {
      state.scanner.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
    }

    ui.scannerVideo.srcObject = state.scanner.stream;
    await ui.scannerVideo.play();
    openManagedModal("scanner", ui.scannerModal);
    await setupCameraControls();
    ui.scannerHint.textContent = SCANNER_CENTER_HINT;
    state.scanner.running = true;
    scanLoop();
  }

  function applyScannedBarcode(value, format, barcodeTarget) {
    const scannedValue = String(value || "");
    const detectedFormat = String(format || inferBarcodeFormat(scannedValue)).toLowerCase();
    playTone("barcode");
    if (barcodeTarget === "search") {
      ui.searchInput.value = scannedValue;
      ui.syncSearchInputMirror();
      renderProducts();
    } else if (barcodeTarget === "edit") {
      if (ui.editBarcodeInput) {
        ui.editBarcodeInput.value = scannedValue;
        ui.editBarcodeInput.dataset.barcodeFormat = detectedFormat;
      }
    } else {
      ui.barcodeInput.value = scannedValue;
      ui.barcodeInput.dataset.barcodeFormat = detectedFormat;
    }
    showToast(`掃描成功: ${scannedValue}`);
  }

  async function scanLoop() {
    if (!state.scanner.running) {
      return;
    }
    if (state.scanner.detecting) {
      state.scanner.rafId = requestAnimationFrame(scanLoop);
      return;
    }
    state.scanner.detecting = true;

    try {
      if (state.scanner.mode === "barcode") {
        const barcodes = await state.scanner.detector.detect(ui.scannerVideo);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          applyScannedBarcode(
            barcodes[0].rawValue,
            barcodes[0].format,
            state.scanner.barcodeTarget
          );
          stopScanner();
          return;
        }
      }
    } catch (_error) {
      ui.scannerHint.textContent = SCANNER_CENTER_HINT;
    } finally {
      state.scanner.detecting = false;
    }

    state.scanner.rafId = requestAnimationFrame(scanLoop);
  }

  function stopScanner(options = {}) {
    const forceTorchOff = !!options.forceTorchOff;
    const keepTorchTrack = state.scanner.torchOn && state.scanner.torchPersistent && !forceTorchOff;
    state.scanner.running = false;
    state.scanner.detecting = false;

    if (state.scanner.rafId) {
      cancelAnimationFrame(state.scanner.rafId);
      state.scanner.rafId = null;
    }

    if (state.scanner.stream && !keepTorchTrack) {
      if (state.scanner.torchOn) {
        setTorch(false).catch(() => {
          state.scanner.torchOn = false;
          state.scanner.torchPersistent = false;
          updateTorchButton();
        });
      }
      state.scanner.stream.getTracks().forEach((track) => track.stop());
      state.scanner.stream = null;
      state.scanner.torchSupported = false;
      state.scanner.torchOn = false;
      state.scanner.torchPersistent = false;
    }

    ui.scannerVideo.pause();
    ui.scannerVideo.srcObject = null;
    closeManagedModal("scanner", ui.scannerModal, options);
    updateTorchButton();
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
    const getDefaultFontSize = () => {
      shell.style.removeProperty("--search-mirror-font-size");
      return parseFloat(window.getComputedStyle(mirror).fontSize) || 16;
    };
    let baseFontSize = getDefaultFontSize();
    const fitText = () => {
      if (!shell.classList.contains("search-input-shell")) {
        return;
      }
      shell.style.removeProperty("--search-mirror-font-size");
      const style = window.getComputedStyle(mirror);
      const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      const availableWidth = Math.max(0, mirror.clientWidth - horizontalPadding);
      const textWidth = Math.max(0, mirror.scrollWidth - horizontalPadding);
      if (!availableWidth || !textWidth || textWidth <= availableWidth) {
        return;
      }
      const nextFontSize = Math.max(8, Math.floor(baseFontSize * availableWidth / textWidth));
      shell.style.setProperty("--search-mirror-font-size", `${nextFontSize}px`);
    };
    const sync = () => {
      const value = input.value || "";
      mirror.textContent = value || input.getAttribute("placeholder") || "";
      shell.classList.toggle("is-empty", !value);
      requestAnimationFrame(fitText);
    };
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
    window.addEventListener("app-language-change", () => {
      setTimeout(() => {
        baseFontSize = getDefaultFontSize();
        sync();
      }, 0);
    });
    window.addEventListener("resize", sync);
    const observer = new MutationObserver(sync);
    observer.observe(input, { attributes: true, attributeFilter: ["placeholder"] });
    sync();
    return sync;
  }

  function wireEvents() {
    window.addEventListener("android-exit-hint", () => {
      showToast("再按一次返回鍵關閉 App");
    });

    setupCustomSelects();
    ui.syncSearchInputMirror = setupTextInputMirror(ui.searchInput);
    window.addEventListener("app-language-change", () => {
      renderProducts();
      refreshUpdateNoticeLanguage();
      requestAnimationFrame(fitHealthCheckButtons);
    });
    window.addEventListener("resize", fitHealthCheckButtons);

    ui.productForm.addEventListener("submit", async (event) => {
      try {
        await addProductFromForm(event);
      } catch (error) {
        showToast(error.message, true);
      }
    });

    ui.clearFormBtn.addEventListener("click", clearForm);
    ui.searchInput.addEventListener("input", renderProducts);
    ui.categoryFilter.addEventListener("change", renderProducts);
    ui.sortSelect.addEventListener("change", handleSortModeChange);

    if (ui.openAddProductBtn) {
      ui.openAddProductBtn.addEventListener("click", () => {
        openAddProductModal();
        ui.openAddProductBtn.blur();
      });
    }
    if (ui.cancelAddProductBtn) {
      ui.cancelAddProductBtn.addEventListener("click", closeAddProductModal);
    }
    if (ui.addProductModal) {
      ui.addProductModal.addEventListener("click", (event) => {
        if (event.target === ui.addProductModal) {
          closeAddProductModal();
        }
      });
    }
    if (ui.chooseIndexedDbStorageBtn) {
      ui.chooseIndexedDbStorageBtn.addEventListener("click", async () => {
        try {
          await completeIndexedDbStorageSetup();
        } catch (error) {
          showToast(`儲存設定失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.chooseFileStorageBtn) {
      ui.chooseFileStorageBtn.addEventListener("click", async () => {
        try {
          await completeFileStorageSetup();
        } catch (error) {
          showToast(`本機檔案位置設定失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.closeUpdateNoticeBtn) {
      ui.closeUpdateNoticeBtn.addEventListener("click", async () => {
        try {
          await closeUpdateNotice();
        } catch (error) {
          showToast(`更新公告狀態儲存失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.updateNoticeModal) {
      ui.updateNoticeModal.addEventListener("click", async (event) => {
        if (event.target === ui.updateNoticeModal) {
          try {
            await closeUpdateNotice();
          } catch (error) {
            showToast(`更新公告狀態儲存失敗: ${error.message}`, true);
          }
        }
      });
    }
    if (ui.healthCheckBar) {
      ui.healthCheckBar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-health-filter]");
        if (!button) {
          return;
        }
        const filter = button.getAttribute("data-health-filter") || "";
        state.healthFilter = state.healthFilter === filter ? "" : filter;
        if (state.healthFilter === "missing-date" && state.calendarSelectedDate) {
          state.calendarSelectedDate = "";
        }
        renderProducts();
      });
    }
    if (ui.backupNowBtn) {
      ui.backupNowBtn.addEventListener("click", async () => {
        try {
          await backupCurrentProductsJson();
        } catch (error) {
          showToast(`JSON 備份失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.backupLaterBtn) {
      ui.backupLaterBtn.addEventListener("click", async () => {
        await setSetting(INDEXEDDB_ADD_COUNT_KEY, 0);
        if (ui.backupReminderModal) {
          closeManagedModal("backup", ui.backupReminderModal);
        }
      });
    }
    if (ui.backToTopBtn) {
      ui.backToTopBtn.addEventListener("click", scrollToPageTop);
      window.addEventListener("scroll", () => {
        if (touchGuardActive || longPressTimer) {
          cancelLongPress();
          suppressRowClicksTemporarily();
          endTouchClickGuard();
        }
        syncBackToTopButton();
      }, { passive: true });
      syncBackToTopButton();
    }
    if (ui.overwriteDuplicateBtn) {
      ui.overwriteDuplicateBtn.addEventListener("click", () => resolveDuplicateBarcodeChoice("overwrite"));
    }
    if (ui.keepDuplicateBtn) {
      ui.keepDuplicateBtn.addEventListener("click", () => resolveDuplicateBarcodeChoice("keep"));
    }
    if (ui.cancelDuplicateBtn) {
      ui.cancelDuplicateBtn.addEventListener("click", () => resolveDuplicateBarcodeChoice("cancel"));
    }
    if (ui.duplicateBarcodeModal) {
      ui.duplicateBarcodeModal.addEventListener("click", (event) => {
        if (event.target === ui.duplicateBarcodeModal) {
          resolveDuplicateBarcodeChoice("cancel");
        }
      });
    }
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".custom-select")) {
        closeOpenCustomSelect();
      }
      if (!state.healthFilter || shouldKeepHealthFilterForClick(event.target)) {
        return;
      }
      clearHealthFilter();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeOpenCustomSelect();
      }
    });

    ui.productTableBody.addEventListener("click", async (event) => {
      if (Date.now() < suppressRowClickUntil) {
        event.preventDefault();
        return;
      }
      const deleteButton = event.target.closest("button[data-delete-id]");
      const editButton = event.target.closest("button[data-edit-id]");
      const selectCheckbox = event.target.closest("input.row-select-product");
      if (selectCheckbox) {
        const selectId = selectCheckbox.getAttribute("data-select-id");
        if (!selectId) {
          return;
        }
        if (selectCheckbox.checked) {
          state.selectedProductIds.add(selectId);
        } else {
          state.selectedProductIds.delete(selectId);
        }
        renderProducts();
        return;
      }
      if (!deleteButton && !editButton) {
        return;
      }
      if (deleteButton) {
        const id = deleteButton.getAttribute("data-delete-id");
        const selected = Array.from(state.selectedProductIds).filter((selectedId) =>
          state.products.some((item) => item.id === selectedId)
        );
        openDeleteConfirm(selected.length > 0 ? selected : [id]);
        return;
      }
      const id = editButton.getAttribute("data-edit-id");
      try {
        await editProductById(id);
      } catch (error) {
        showToast(`編輯失敗: ${error.message}`, true);
      }
    });
    ui.productTableBody.addEventListener("contextmenu", async (event) => {
      const row = event.target && event.target.closest ? event.target.closest("tr[data-product-id]") : null;
      if (!row || shouldIgnoreLongPressTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      // 桌面滑鼠右鍵只阻止瀏覽器選單，不觸發條碼視窗。
      if (event.button === 2) {
        cancelLongPress();
        return;
      }
      const productId = row.getAttribute("data-product-id");
      const target = state.products.find((item) => item.id === productId);
      if (!target) {
        return;
      }
      suppressRowClicksTemporarily();
      await openBarcodeModalForProduct(target);
    });
    ui.productTableBody.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      if (event.pointerType !== "mouse") {
        beginTouchClickGuard(event.clientX, event.clientY);
      }
      const row = event.target && event.target.closest ? event.target.closest("tr[data-product-id]") : null;
      if (!row || shouldIgnoreLongPressTarget(event.target)) {
        return;
      }
      scheduleLongPressForRow(row, event.clientX, event.clientY);
    });
    ui.productTableBody.addEventListener("pointermove", (event) => {
      updateTouchClickGuard(event.clientX, event.clientY);
      if (isLongPressMoveExceeded(event.clientX, event.clientY)) {
        cancelLongPress();
      }
    });
    ui.productTableBody.addEventListener("pointerup", () => {
      cancelLongPress();
      endTouchClickGuard();
    });
    ui.productTableBody.addEventListener("pointercancel", () => {
      cancelLongPress();
      suppressRowClicksTemporarily();
      endTouchClickGuard();
    });
    ui.productTableBody.addEventListener("pointerleave", () => {
      cancelLongPress();
      endTouchClickGuard();
    });
    ui.productTableBody.addEventListener("touchstart", (event) => {
      const firstTouch = event.touches && event.touches[0];
      const row = event.target && event.target.closest ? event.target.closest("tr[data-product-id]") : null;
      if (!firstTouch) {
        return;
      }
      beginTouchClickGuard(firstTouch.clientX, firstTouch.clientY);
      if (!row || shouldIgnoreLongPressTarget(event.target)) {
        return;
      }
      scheduleLongPressForRow(row, firstTouch.clientX, firstTouch.clientY);
    }, { passive: true });
    ui.productTableBody.addEventListener("touchmove", (event) => {
      const firstTouch = event.touches && event.touches[0];
      if (!firstTouch) {
        cancelLongPress();
        suppressRowClicksTemporarily();
        endTouchClickGuard();
        return;
      }
      updateTouchClickGuard(firstTouch.clientX, firstTouch.clientY);
      if (!firstTouch || isLongPressMoveExceeded(firstTouch.clientX, firstTouch.clientY)) {
        cancelLongPress();
      }
    }, { passive: true });
    ui.productTableBody.addEventListener("touchend", () => {
      cancelLongPress();
      endTouchClickGuard();
    }, { passive: true });
    ui.productTableBody.addEventListener("touchcancel", () => {
      cancelLongPress();
      suppressRowClicksTemporarily();
      endTouchClickGuard();
    }, { passive: true });
    const bindSelectAllHandler = (checkboxEl) => {
      if (!checkboxEl) {
        return;
      }
      checkboxEl.addEventListener("change", () => {
        const rows = Array.from(ui.productTableBody.querySelectorAll("input.row-select-product[data-select-id]"));
        if (rows.length === 0) {
          state.selectedProductIds.clear();
          renderProducts();
          return;
        }
        if (checkboxEl.checked) {
          rows.forEach((row) => {
            const rowId = row.getAttribute("data-select-id");
            if (rowId) {
              state.selectedProductIds.add(rowId);
            }
          });
        } else {
          rows.forEach((row) => {
            const rowId = row.getAttribute("data-select-id");
            if (rowId) {
              state.selectedProductIds.delete(rowId);
            }
          });
        }
        renderProducts();
      });
    };
    bindSelectAllHandler(ui.selectAllProducts);
    bindSelectAllHandler(ui.selectAllProductsMobile);

    ui.scanBtn.addEventListener("click", async () => {
      try {
        await startScanner("barcode", "input");
      } catch (error) {
        showToast(getScannerErrorMessage(error), true);
      }
    });

    ui.scanSearchBtn.addEventListener("click", async () => {
      try {
        await startScanner("barcode", "search");
      } catch (error) {
        showToast(getScannerErrorMessage(error), true);
      }
    });

    ui.stopScanBtn.addEventListener("click", stopScanner);
    if (ui.toggleTorchBtn) {
      ui.toggleTorchBtn.addEventListener("click", async () => {
        try {
          await toggleTorchMode();
        } catch (error) {
          showToast(error.message, true);
          state.scanner.torchSupported = false;
          updateTorchButton();
        }
      });
    }
    ui.scannerModal.addEventListener("click", (event) => {
      if (event.target === ui.scannerModal) {
        stopScanner();
      }
    });
    if (ui.closeBarcodeModalBtn) {
      ui.closeBarcodeModalBtn.addEventListener("click", closeBarcodeModal);
    }
    if (ui.barcodeModal) {
      ui.barcodeModal.addEventListener("click", (event) => {
        if (event.target === ui.barcodeModal) {
          closeBarcodeModal();
        }
      });
    }
    if (ui.cancelEditProductBtn) {
      ui.cancelEditProductBtn.addEventListener("click", closeEditProductModal);
    }
    if (ui.editProductModal) {
      ui.editProductModal.addEventListener("click", (event) => {
        if (event.target === ui.editProductModal) {
          closeEditProductModal();
        }
      });
    }
    if (ui.editProductForm) {
      ui.editProductForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          await saveEditedProduct();
        } catch (error) {
          showToast(error.message, true);
        }
      });
    }
    if (ui.confirmDeleteBtn) {
      ui.confirmDeleteBtn.addEventListener("click", async () => {
        const ids = pendingDeleteIds.slice();
        closeDeleteConfirm();
        if (ids.length === 0) {
          return;
        }
        try {
          await deleteProductsByIds(ids);
        } catch (error) {
          showToast(`刪除失敗: ${error.message}`, true);
        }
      });
    }
    if (ui.cancelDeleteBtn) {
      ui.cancelDeleteBtn.addEventListener("click", closeDeleteConfirm);
    }
    if (ui.deleteConfirmModal) {
      ui.deleteConfirmModal.addEventListener("click", (event) => {
        if (event.target === ui.deleteConfirmModal) {
          closeDeleteConfirm();
        }
      });
    }
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
    if (ui.saveEditProductBtn) {
      ui.saveEditProductBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        try {
          await saveEditedProduct();
        } catch (error) {
          showToast(error.message, true);
        }
      });
    }
    if (ui.editScanBtn) {
      ui.editScanBtn.addEventListener("click", async () => {
        try {
          await startScanner("barcode", "edit");
        } catch (error) {
          showToast(getScannerErrorMessage(error), true);
        }
      });
    }
    if (ui.editExpiryInput) {
      ui.editExpiryInput.addEventListener("blur", () => {
        const normalized = normalizeDateInput(ui.editExpiryInput.value);
        if (normalized) {
          ui.editExpiryInput.value = normalized;
          if (ui.editHiddenDatePicker) {
            ui.editHiddenDatePicker.value = normalized;
          }
        }
      });
    }
    if (ui.editPickDateBtn) {
      ui.editPickDateBtn.addEventListener("click", () => {
        const current = normalizeDateInput(ui.editExpiryInput.value);
        if (current && ui.editHiddenDatePicker) {
          ui.editHiddenDatePicker.value = current;
        }
        openDatePickerFor(ui.editExpiryInput, ui.editHiddenDatePicker);
      });
    }
    if (ui.editHiddenDatePicker) {
      ui.editHiddenDatePicker.addEventListener("change", () => {
        if (ui.editHiddenDatePicker.value) {
          ui.editExpiryInput.value = ui.editHiddenDatePicker.value;
        }
      });
    }
    if (ui.barcodeInput) {
      ui.barcodeInput.addEventListener("input", () => {
        const value = (ui.barcodeInput.value || "").trim();
        ui.barcodeInput.dataset.barcodeFormat = value ? inferBarcodeFormat(value) : "";
      });
    }
    if (ui.editBarcodeInput) {
      ui.editBarcodeInput.addEventListener("input", () => {
        const value = (ui.editBarcodeInput.value || "").trim();
        ui.editBarcodeInput.dataset.barcodeFormat = value ? inferBarcodeFormat(value) : "";
      });
    }

    ui.expiryInput.addEventListener("blur", () => {
      const value = normalizeDateInput(ui.expiryInput.value);
      if (value) {
        ui.expiryInput.value = value;
        ui.hiddenDatePicker.value = value;
      }
    });

    ui.pickDateBtn.addEventListener("click", () => {
      const current = normalizeDateInput(ui.expiryInput.value);
      if (current) {
        ui.hiddenDatePicker.value = current;
      }
      openDatePickerFor(ui.expiryInput, ui.hiddenDatePicker);
    });

    ui.hiddenDatePicker.addEventListener("change", () => {
      if (ui.hiddenDatePicker.value) {
        ui.expiryInput.value = ui.hiddenDatePicker.value;
      }
    });

    if (ui.calendarPrevBtn) {
      ui.calendarPrevBtn.addEventListener("click", () => {
        const current = state.calendarMonth instanceof Date ? state.calendarMonth : new Date();
        state.calendarMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        renderExpiryCalendar();
      });
    }
    if (ui.calendarNextBtn) {
      ui.calendarNextBtn.addEventListener("click", () => {
        const current = state.calendarMonth instanceof Date ? state.calendarMonth : new Date();
        state.calendarMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        renderExpiryCalendar();
      });
    }
    if (ui.datePickerPrevBtn) {
      ui.datePickerPrevBtn.addEventListener("click", () => {
        const current = datePickerState.month instanceof Date ? datePickerState.month : new Date();
        datePickerState.month = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        renderCustomDatePicker();
      });
    }
    if (ui.datePickerNextBtn) {
      ui.datePickerNextBtn.addEventListener("click", () => {
        const current = datePickerState.month instanceof Date ? datePickerState.month : new Date();
        datePickerState.month = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        renderCustomDatePicker();
      });
    }
    if (ui.datePickerClearBtn) {
      ui.datePickerClearBtn.addEventListener("click", clearCustomDate);
    }
    if (ui.datePickerCloseBtn) {
      ui.datePickerCloseBtn.addEventListener("click", closeDatePicker);
    }
    if (ui.datePickerModal) {
      ui.datePickerModal.addEventListener("click", (event) => {
        if (event.target === ui.datePickerModal) {
          closeDatePicker();
        }
      });
    }
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (_error) {
      // Keep silent since app still works without service worker in unsupported environments.
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

  async function init() {
    applySavedTheme();
    refreshCustomAppTitle();
    window.addEventListener("storage", (event) => {
      if (event.key === CUSTOM_APP_TITLE_KEY) {
        refreshCustomAppTitle();
      }
    });
    window.addEventListener("error", (event) => {
      const msg = event && event.error && event.error.message
        ? event.error.message
        : (event && event.message ? event.message : "程式發生未預期錯誤");
      if (isFilePermissionActivationError(msg)) {
        event.preventDefault();
        showToast("尚未連回先前的本機 JSON 檔案，已先使用 IndexedDB。請到設定重新選擇同一個 JSON 檔案");
        return;
      }
      showErrorModal(msg);
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      const msg = reason && reason.message ? reason.message : String(reason || "程式發生未處理錯誤");
      if (isFilePermissionActivationError(msg)) {
        event.preventDefault();
        showToast("尚未連回先前的本機 JSON 檔案，已先使用 IndexedDB。請到設定重新選擇同一個 JSON 檔案");
        return;
      }
      showErrorModal(msg);
    });
    window.addEventListener("contextmenu", (event) => {
      if (Date.now() >= suppressNativeContextMenuUntil) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    }, true);
    window.addEventListener("popstate", () => {
      if (customSelectHistory.ignoreNextPop) {
        customSelectHistory.ignoreNextPop = false;
        return;
      }
      if (closeOpenCustomSelect({ fromHistory: true })) {
        return;
      }
      if (modalHistory.ignoreNextPop) {
        modalHistory.ignoreNextPop = false;
        clearTimeout(modalHistory.ignoreResetTimer);
        modalHistory.ignoreResetTimer = null;
        return;
      }
      closeTopModalFromHistory();
    });
    wireEvents();
    await loadInitialState();
    await maybeShowStorageSetup();
    await maybeShowUpdateNotice();
    await registerServiceWorker();
    await finishAppBoot();
  }

  window.addEventListener("beforeunload", () => stopScanner({ forceTorchOff: true, skipHistory: true }));
  init().catch((error) => {
    showToast(`初始化失敗: ${error.message}`, true);
    finishAppBoot();
  });
})();
