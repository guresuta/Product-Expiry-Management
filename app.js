(function () {
  "use strict";

  const APP_DB = "expiry_manager_app";
  const APP_DB_VERSION = 1;
  const STORE_PRODUCTS = "products";
  const STORE_SETTINGS = "settings";
  const MODE_SETTING_KEY = "storageMode";
  const DEFAULT_MODE = "indexeddb";
  const EXPIRING_SOON_DAYS = 60;
  const SCANNER_CENTER_HINT = "請把條碼對準鏡頭中央。";
  const THEME_SETTING_KEY = "uiTheme";
  const CATEGORY_SETTING_KEY = "categories";
  const THEME_KEYS = new Set([
    "light", "light-2", "light-3", "light-4", "light-5", "light-6",
    "dark", "dark-2", "dark-3", "dark-4", "dark-5", "dark-6"
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
      lastSnapshotDataUrl: ""
    },
    formCollapsed: false
    ,
    editingProductId: null,
    selectedProductIds: new Set()
  };

  const nativeBridge = createNativeBridge();

  const ui = {
    productForm: document.getElementById("productForm"),
    toggleFormBtn: document.getElementById("toggleFormBtn"),
    categoryInput: document.getElementById("categoryInput"),
    nameInput: document.getElementById("nameInput"),
    ocrBtn: document.getElementById("ocrBtn"),
    barcodeInput: document.getElementById("barcodeInput"),
    expiryInput: document.getElementById("expiryInput"),
    pickDateBtn: document.getElementById("pickDateBtn"),
    hiddenDatePicker: document.getElementById("hiddenDatePicker"),
    clearFormBtn: document.getElementById("clearFormBtn"),
    scanBtn: document.getElementById("scanBtn"),
    stopScanBtn: document.getElementById("stopScanBtn"),
    captureOcrBtn: document.getElementById("captureOcrBtn"),
    scannerModal: document.getElementById("scannerModal"),
    scannerTitle: document.getElementById("scannerTitle"),
    scannerVideo: document.getElementById("scannerVideo"),
    ocrBoxesLayer: document.getElementById("ocrBoxesLayer"),
    exposureWrap: document.getElementById("exposureWrap"),
    exposureSlider: document.getElementById("exposureSlider"),
    exposureValue: document.getElementById("exposureValue"),
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
    editBarcodeInput: document.getElementById("editBarcodeInput"),
    editExpiryInput: document.getElementById("editExpiryInput"),
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
    emptyHint: document.getElementById("emptyHint"),
    categoryFilter: document.getElementById("categoryFilter"),
    sortSelect: document.getElementById("sortSelect"),
    searchInput: document.getElementById("searchInput"),
    scanSearchBtn: document.getElementById("scanSearchBtn"),
    toast: document.getElementById("toast")
  };

  let longPressTimer = null;
  let brightnessRaised = false;
  let pendingDeleteIds = [];

  function applySavedTheme() {
    const saved = localStorage.getItem(THEME_SETTING_KEY) || "light";
    const themeKey = THEME_KEYS.has(saved) ? saved : "light";
    document.documentElement.setAttribute("data-theme", themeKey);
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
      openGoogleLens() {
        return new Promise((resolve, reject) => {
          if (typeof bridge.openGoogleLens !== "function") {
            reject(new Error("目前環境不支援開啟外部 Google Lens"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-open-lens-result", handler);
            const detail = event.detail || {};
            if (detail.ok) {
              resolve(true);
            } else {
              reject(new Error(detail.error || "無法開啟 Google Lens"));
            }
          };
          window.addEventListener("android-open-lens-result", handler, { once: true });
          try {
            bridge.openGoogleLens();
          } catch (error) {
            window.removeEventListener("android-open-lens-result", handler);
            reject(error);
          }
        });
      },
      openGoogleLensWithImageDataUrl(dataUrl) {
        return new Promise((resolve, reject) => {
          if (typeof bridge.openGoogleLensWithImageDataUrl !== "function") {
            reject(new Error("目前環境不支援以圖片啟動 Google Lens"));
            return;
          }
          const handler = (event) => {
            window.removeEventListener("android-open-lens-result", handler);
            const detail = event.detail || {};
            if (detail.ok) {
              resolve(true);
            } else {
              reject(new Error(detail.error || "無法啟動 Google Lens 圖片辨識"));
            }
          };
          window.addEventListener("android-open-lens-result", handler, { once: true });
          try {
            bridge.openGoogleLensWithImageDataUrl(String(dataUrl || ""));
          } catch (error) {
            window.removeEventListener("android-open-lens-result", handler);
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

  async function replaceAllProductsIndexedDb(products) {
    await withStore(STORE_PRODUCTS, "readwrite", (store) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        products.forEach((product) => store.put(product));
      };
    });
  }

  async function hasReadWritePermission(fileHandle) {
    if (!fileHandle) {
      return false;
    }
    const options = { mode: "readwrite" };
    if ((await fileHandle.queryPermission(options)) === "granted") {
      return true;
    }
    return (await fileHandle.requestPermission(options)) === "granted";
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
    return ["糖果", "零食", "泡麵", "調味品", "常溫飲料", "啤酒", "冷凍食品", "冰品", "健美機能", "國際精品", "日用品", "量販", "區域商品"];
  }

  function renderCategoryOptions(categories) {
    if (!ui.categoryInput) {
      return;
    }
    ui.categoryInput.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "請選擇分類";
    placeholder.disabled = true;
    placeholder.selected = true;
    ui.categoryInput.appendChild(placeholder);

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      ui.categoryInput.appendChild(option);
    });
  }

  function renderEditCategoryOptions(categories) {
    if (!ui.editCategorySelect) {
      return;
    }
    const merged = Array.from(new Set([...(categories || []), ...state.products.map((p) => p.category).filter(Boolean)]));
    ui.editCategorySelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "請選擇分類";
    placeholder.disabled = true;
    ui.editCategorySelect.appendChild(placeholder);
    merged.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      ui.editCategorySelect.appendChild(option);
    });
  }

  function renderCategoryFilterOptions() {
    if (!ui.categoryFilter) {
      return;
    }
    const fromSettings = state.categories || [];
    const hasUncategorized = state.products.some((item) => !String(item.category || "").trim());
    const fromProducts = state.products.map((item) => item.category).filter(Boolean);
    const all = Array.from(new Set([...fromSettings, ...fromProducts]));
    const current = ui.categoryFilter.value || "";

    ui.categoryFilter.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "全部分類";
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
      option.textContent = "未分類";
      ui.categoryFilter.appendChild(option);
    }

    if (current === "__uncategorized__") {
      ui.categoryFilter.value = "__uncategorized__";
      return;
    }
    ui.categoryFilter.value = all.includes(current) ? current : "";
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
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiry = new Date(`${expiryDate}T00:00:00`).getTime();
    const diffDays = Math.floor((expiry - startOfToday) / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      return { label: "已過期", badgeClass: "expired" };
    }
    if (diffDays <= EXPIRING_SOON_DAYS) {
      return { label: "即期", badgeClass: "warning" };
    }
    return { label: "未到期", badgeClass: "valid" };
  }

  function sortProducts(products) {
    return products.sort((a, b) => compareDate(a.expiryDate, b.expiryDate));
  }

  function sortForView(products) {
    const by = ui.sortSelect ? ui.sortSelect.value : "default";
    const cloned = [...products];
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

  function productMatchesKeyword(product, keyword) {
    if (!keyword) {
      return true;
    }
    const text = `${product.category} ${product.name} ${product.barcode}`.toLowerCase();
    return text.includes(keyword.toLowerCase());
  }

  function renderProducts() {
    const keyword = ui.searchInput.value.trim();
    const categoryFilter = ui.categoryFilter ? ui.categoryFilter.value : "";
    const filtered = state.products.filter((item) => {
      const keywordMatch = productMatchesKeyword(item, keyword);
      const categoryMatch = !categoryFilter
        || (categoryFilter === "__uncategorized__"
          ? !String(item.category || "").trim()
          : item.category === categoryFilter);
      return keywordMatch && categoryMatch;
    });
    const sorted = sortForView(filtered);
    const validIds = new Set(state.products.map((item) => item.id));
    state.selectedProductIds = new Set(
      Array.from(state.selectedProductIds).filter((id) => validIds.has(id))
    );

    ui.productTableBody.innerHTML = "";
    sorted.forEach((product) => {
      const status = getStatus(product.expiryDate);
      const checked = state.selectedProductIds.has(product.id) ? "checked" : "";
      const tr = document.createElement("tr");
      tr.setAttribute("data-product-id", product.id);
      tr.setAttribute("data-barcode", product.barcode || "");
      tr.innerHTML = `
        <td data-label="分類">${escapeHtml(product.category)}</td>
        <td data-label="商品名稱">${escapeHtml(product.name)}</td>
        <td data-label="條碼">${escapeHtml(product.barcode)}</td>
        <td data-label="有效日期">${escapeHtml(product.expiryDate)}</td>
        <td data-label="狀態"><span class="badge ${status.badgeClass}">${status.label}</span></td>
        <td data-label="操作">
          <div class="action-stack">
            <button class="btn secondary" data-edit-id="${product.id}" type="button">編輯</button>
            <button class="btn danger-btn" data-delete-id="${product.id}" type="button">刪除</button>
          </div>
        </td>
        <td class="select-col" data-label="選取">
          <input class="row-select-product" type="checkbox" data-select-id="${product.id}" ${checked} aria-label="選取商品">
        </td>
      `;
      ui.productTableBody.appendChild(tr);

      tr.addEventListener("pointerdown", (event) => {
        if (event.target && event.target.closest && event.target.closest("input.row-select-product")) {
          return;
        }
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          openBarcodeModalForProduct(product);
        }, 600);
      });
      const cancelLongPress = () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      };
      tr.addEventListener("pointerup", cancelLongPress);
      tr.addEventListener("pointerleave", cancelLongPress);
      tr.addEventListener("pointercancel", cancelLongPress);
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
      ui.selectedCountBadge.classList.toggle("hidden", selectedCount <= 0);
    }

    ui.emptyHint.style.display = sorted.length === 0 ? "block" : "none";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
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
          throw new Error("未取得檔案讀寫權限");
        }
      }
      await writeProductsToSelectedFile(state.products);
    }
  }

  async function loadInitialState() {
    const savedMode = (await getSetting(MODE_SETTING_KEY)) || DEFAULT_MODE;
    const savedFileHandle = null;
    state.storageMode = savedMode;
    state.fileHandle = savedFileHandle || null;
    if (state.storageMode === "file" && !(await hasSelectedFile())) {
      state.storageMode = "indexeddb";
      await setSetting(MODE_SETTING_KEY, "indexeddb");
    }

    state.categories = await getCategories();
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
        const granted = await hasReadWritePermission(state.fileHandle);
        if (granted) {
          state.products = sortProducts(await readProductsFromSelectedFile());
        } else {
          state.products = sortProducts(await getAllProductsFromIndexedDb());
          showToast("無法讀取檔案資料庫，已先顯示 IndexedDB 資料", true);
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
    if (ui.barcodeInput) {
      delete ui.barcodeInput.dataset.barcodeFormat;
    }
  }

  async function addProductFromForm(event) {
    event.preventDefault();

    const category = ui.categoryInput.value.trim() || "未分類";
    const name = ui.nameInput.value.trim() || "未命名商品";
    const barcode = ui.barcodeInput.value.trim();
    const expiryDate = getProductDateFromForm();

    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const product = {
      id,
      category,
      name,
      barcode,
      barcodeFormat: (ui.barcodeInput && ui.barcodeInput.dataset && ui.barcodeInput.dataset.barcodeFormat)
        ? ui.barcodeInput.dataset.barcodeFormat
        : inferBarcodeFormat(barcode),
      expiryDate,
      createdAt: new Date().toISOString()
    };

    const prevProducts = [...state.products];
    try {
      state.products.push(product);
      sortProducts(state.products);
      await persistCurrentProducts();
      renderProducts();
      clearForm();
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
    const prevProducts = [...state.products];
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
    if (ui.deleteConfirmModal) {
      ui.deleteConfirmModal.classList.remove("hidden");
    }
  }

  function closeDeleteConfirm() {
    pendingDeleteIds = [];
    if (ui.deleteConfirmModal) {
      ui.deleteConfirmModal.classList.add("hidden");
    }
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
    ui.editNameInput.value = target.name || "";
    ui.editBarcodeInput.value = target.barcode || "";
    ui.editBarcodeInput.dataset.barcodeFormat = target.barcodeFormat || inferBarcodeFormat(target.barcode || "");
    ui.editExpiryInput.value = target.expiryDate || "";
    ui.editProductModal.classList.remove("hidden");
  }

  function closeEditProductModal() {
    state.editingProductId = null;
    if (ui.editProductModal) {
      ui.editProductModal.classList.add("hidden");
    }
  }

  async function saveEditedProduct() {
    const id = state.editingProductId;
    const target = state.products.find((item) => item.id === id);
    if (!target) {
      throw new Error("找不到要編輯的商品");
    }
    const category = (ui.editCategorySelect.value || "").trim();
    const name = (ui.editNameInput.value || "").trim();
    const barcode = (ui.editBarcodeInput.value || "").trim();
    const expiryRaw = (ui.editExpiryInput.value || "").trim();
    const expiryDate = expiryRaw ? normalizeDateInput(expiryRaw) : "";
    if (expiryRaw && !expiryDate) {
      throw new Error("有效日期格式錯誤，請使用 YYYY-MM-DD");
    }
    const prevProducts = state.products.map((item) => ({ ...item }));
    try {
      target.category = category;
      target.name = name;
      target.barcode = barcode;
      target.barcodeFormat = (ui.editBarcodeInput && ui.editBarcodeInput.dataset && ui.editBarcodeInput.dataset.barcodeFormat)
        ? ui.editBarcodeInput.dataset.barcodeFormat
        : inferBarcodeFormat(barcode);
      target.expiryDate = expiryDate;
      await persistCurrentProducts();
      renderProducts();
      closeEditProductModal();
      showToast("商品已更新");
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
      ui.barcodeProductName.textContent = product.name || "商品";
    }
    if (ui.barcodeFormatTag) {
      ui.barcodeFormatTag.textContent = format ? format.toUpperCase() : "UNKNOWN";
    }
    if (ui.barcodeModalText) {
      ui.barcodeModalText.textContent = "";
    }
    if (ui.barcodeModal) {
      ui.barcodeModal.classList.remove("hidden");
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

  async function closeBarcodeModal() {
    if (ui.barcodeModal) {
      ui.barcodeModal.classList.add("hidden");
    }
    if (brightnessRaised && nativeBridge && typeof nativeBridge.resetScreenBrightness === "function") {
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

function applyFormCollapsed() {
  const isCollapsed = state.formCollapsed;
  const layout = document.querySelector(".layout.split-layout");
  const form = ui.productForm;

  if (isCollapsed) {
    layout.classList.add("form-is-collapsed");
    form.style.maxHeight = "0px"; // 搭配 CSS 過渡實現平滑摺疊
    form.style.opacity = "0";
    form.style.pointerEvents = "none";
    ui.toggleFormBtn.textContent = "展開新增商品表單";
    ui.toggleFormBtn.classList.add("toggle-expand-hint");
  } else {
    layout.classList.remove("form-is-collapsed");
    form.style.maxHeight = "1000px"; // 給予足夠大的值
    form.style.opacity = "1";
    form.style.pointerEvents = "auto";
    ui.toggleFormBtn.textContent = "收疊新增商品表單";
    ui.toggleFormBtn.classList.remove("toggle-expand-hint");
  }
}

  function setOcrCaptureButtonVisible(visible) {
    if (!ui.captureOcrBtn) {
      return;
    }
    ui.captureOcrBtn.classList.toggle("hidden", !visible);
    ui.captureOcrBtn.disabled = false;
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

    if (ui.exposureWrap && ui.exposureSlider && ui.exposureValue) {
      const hasExposure = Number.isFinite(caps.exposureCompensation?.min) && Number.isFinite(caps.exposureCompensation?.max);
      ui.exposureWrap.classList.toggle("hidden", !hasExposure);
      if (hasExposure) {
        const min = Number(caps.exposureCompensation.min);
        const max = Number(caps.exposureCompensation.max);
        const step = Number(caps.exposureCompensation.step || 0.1);
        const current = Number.isFinite(settings.exposureCompensation) ? Number(settings.exposureCompensation) : 0;
        ui.exposureSlider.min = String(min);
        ui.exposureSlider.max = String(max);
        ui.exposureSlider.step = String(step > 0 ? step : 0.1);
        ui.exposureSlider.value = String(Math.max(min, Math.min(max, current)));
        ui.exposureValue.textContent = ui.exposureSlider.value;
      }
    }

  }

  async function applyExposureCompensation(value) {
    const stream = state.scanner.stream;
    if (!stream) {
      return;
    }
    const track = stream.getVideoTracks && stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== "function") {
      return;
    }
    await track.applyConstraints({ advanced: [{ exposureCompensation: Number(value) }] });
  }


  function clearOcrBoxes() {
    if (ui.ocrBoxesLayer) {
      ui.ocrBoxesLayer.innerHTML = "";
    }
  }

  function captureVideoFrameDataUrl() {
    const video = ui.scannerVideo;
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    if (width <= 0 || height <= 0) {
      throw new Error("鏡頭影像尚未準備完成");
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("無法建立影像畫布");
    }
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  }

  async function runNativeMlKitOcrFromVideo() {
    if (!(isNativeFileMode() && nativeBridge && typeof nativeBridge.openGoogleLensWithImageDataUrl === "function")) {
      throw new Error("目前環境不支援 Google Lens 掃描");
    }
    ui.captureOcrBtn.disabled = true;
    ui.scannerHint.textContent = SCANNER_CENTER_HINT;
    try {
      if (!ui.scannerVideo || !ui.scannerVideo.srcObject) {
        throw new Error("[OCR_E_VIDEO_NOT_READY] 鏡頭尚未初始化完成");
      }
      if ((ui.scannerVideo.videoWidth || 0) <= 0 || (ui.scannerVideo.videoHeight || 0) <= 0) {
        throw new Error("[OCR_E_VIDEO_NOT_READY] 鏡頭畫面尚未就緒");
      }
      const dataUrl = captureVideoFrameDataUrl();
      playTone("shutter");
      state.scanner.lastSnapshotDataUrl = dataUrl;
      stopScanner();
      await nativeBridge.openGoogleLensWithImageDataUrl(dataUrl);
      showToast("已開啟 Google Lens，請在 Lens 內選字複製");
    } finally {
      if (ui.captureOcrBtn) {
        ui.captureOcrBtn.disabled = false;
      }
    }
  }

  async function startScanner(mode, barcodeTarget = "input") {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此裝置不支援鏡頭掃描，請改用手動輸入");
    }

    state.scanner.mode = mode;
    state.scanner.barcodeTarget = barcodeTarget;
    if (mode === "ocr") {
      if (isNativeFileMode() && nativeBridge && typeof nativeBridge.openGoogleLensWithImageDataUrl === "function") {
        state.scanner.mode = "ocr_lens";
        state.scanner.detector = null;
      } else {
        throw new Error("目前環境不支援 Google Lens 掃描");
      }
    } else {
      state.scanner.detector = await createBarcodeDetector();
    }
    state.scanner.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    ui.scannerVideo.srcObject = state.scanner.stream;
    await ui.scannerVideo.play();
    ui.scannerTitle.textContent = mode === "barcode" ? "條碼掃描" : "文字 OCR 掃描";
    ui.scannerModal.classList.remove("hidden");
    await setupCameraControls();
    ui.scannerHint.textContent = SCANNER_CENTER_HINT;
    setOcrCaptureButtonVisible(state.scanner.mode === "ocr_lens");
    if (ui.captureOcrBtn) {
      ui.captureOcrBtn.textContent = "Google Lens掃描";
    }
    clearOcrBoxes();
    state.scanner.running = true;
    if (state.scanner.mode !== "ocr_lens") {
      scanLoop();
    }
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
          const detectedFormat = String(barcodes[0].format || inferBarcodeFormat(barcodes[0].rawValue)).toLowerCase();
          playTone("barcode");
          if (state.scanner.barcodeTarget === "search") {
            ui.searchInput.value = String(barcodes[0].rawValue);
            renderProducts();
          } else if (state.scanner.barcodeTarget === "edit") {
            if (ui.editBarcodeInput) {
              ui.editBarcodeInput.value = String(barcodes[0].rawValue);
              ui.editBarcodeInput.dataset.barcodeFormat = detectedFormat;
            }
          } else {
            ui.barcodeInput.value = String(barcodes[0].rawValue);
            ui.barcodeInput.dataset.barcodeFormat = detectedFormat;
          }
          showToast(`掃描成功: ${barcodes[0].rawValue}`);
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

  function stopScanner() {
    state.scanner.running = false;
    state.scanner.detecting = false;

    if (state.scanner.rafId) {
      cancelAnimationFrame(state.scanner.rafId);
      state.scanner.rafId = null;
    }

    if (state.scanner.stream) {
      state.scanner.stream.getTracks().forEach((track) => track.stop());
      state.scanner.stream = null;
    }

    ui.scannerVideo.pause();
    ui.scannerVideo.srcObject = null;
    ui.scannerModal.classList.add("hidden");
    setOcrCaptureButtonVisible(false);
    if (ui.exposureWrap) {
      ui.exposureWrap.classList.add("hidden");
    }
    clearOcrBoxes();
  }

  function wireEvents() {
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
    ui.sortSelect.addEventListener("change", renderProducts);

    ui.toggleFormBtn.addEventListener("click", () => {
      state.formCollapsed = !state.formCollapsed;
      applyFormCollapsed();
    });

    ui.productTableBody.addEventListener("click", async (event) => {
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
        showToast(error.message, true);
      }
    });

    ui.scanSearchBtn.addEventListener("click", async () => {
      try {
        await startScanner("barcode", "search");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    ui.ocrBtn.addEventListener("click", async () => {
      try {
        await startScanner("ocr");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    ui.stopScanBtn.addEventListener("click", stopScanner);
    if (ui.captureOcrBtn) {
      ui.captureOcrBtn.addEventListener("click", async () => {
        try {
          await runNativeMlKitOcrFromVideo();
        } catch (error) {
          ui.scannerHint.textContent = SCANNER_CENTER_HINT;
          showToast(error.message, true);
        }
      });
    }
    if (ui.exposureSlider) {
      ui.exposureSlider.addEventListener("input", () => {
        if (ui.exposureValue) {
          ui.exposureValue.textContent = ui.exposureSlider.value;
        }
      });
      ui.exposureSlider.addEventListener("change", async () => {
        try {
          await applyExposureCompensation(ui.exposureSlider.value);
          ui.scannerHint.textContent = SCANNER_CENTER_HINT;
        } catch (_error) {
          showToast("此裝置不支援曝光補償", true);
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
        const ids = [...pendingDeleteIds];
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
          showToast(error.message, true);
        }
      });
    }
    if (ui.editExpiryInput) {
      ui.editExpiryInput.addEventListener("blur", () => {
        const normalized = normalizeDateInput(ui.editExpiryInput.value);
        if (normalized) {
          ui.editExpiryInput.value = normalized;
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

      if (typeof ui.hiddenDatePicker.showPicker === "function") {
        ui.hiddenDatePicker.showPicker();
      } else {
        ui.hiddenDatePicker.focus();
        ui.hiddenDatePicker.click();
      }
    });

    ui.hiddenDatePicker.addEventListener("change", () => {
      if (ui.hiddenDatePicker.value) {
        ui.expiryInput.value = ui.hiddenDatePicker.value;
      }
    });
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

  async function init() {
    applySavedTheme();
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
    applyFormCollapsed();
    await loadInitialState();
    await registerServiceWorker();
  }

  window.addEventListener("beforeunload", stopScanner);
  init().catch((error) => {
    showToast(`初始化失敗: ${error.message}`, true);
  });
})();
