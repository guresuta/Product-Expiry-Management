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
  var DEFAULT_MODE = "indexeddb";

  function createNativeBridge() {
    if (!window.AndroidBridge) {
      return null;
    }
    var bridge = window.AndroidBridge;
    if (
      typeof bridge.hasSelectedDbFile !== "function" ||
      typeof bridge.readDatabaseFile !== "function" ||
      typeof bridge.writeDatabaseFile !== "function"
    ) {
      return null;
    }
    return {
      hasFile: function () {
        try {
          return !!bridge.hasSelectedDbFile();
        } catch (_error) {
          return false;
        }
      },
      readFileText: async function () {
        return String(bridge.readDatabaseFile() || "");
      },
      writeFileText: async function (text) {
        var ok = bridge.writeDatabaseFile(String(text));
        if (!ok) {
          throw new Error("寫入檔案失敗");
        }
      },
      selectFileText: function (filename, content) {
        return new Promise(function (resolve, reject) {
          if (typeof bridge.requestSelectDbFile !== "function") {
            reject(new Error("裝置不支援選擇本機 JSON 檔案"));
            return;
          }
          var handler = function (event) {
            window.removeEventListener("android-db-file-selected", handler);
            var detail = event.detail || {};
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
      exportJson: function (filename, content) {
        return new Promise(function (resolve, reject) {
          if (typeof bridge.requestExportJsonFile !== "function") {
            reject(new Error("裝置不支援原生 JSON 備份"));
            return;
          }
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
      },
      exportCsv: function (filename, content) {
        return new Promise(function (resolve, reject) {
          if (typeof bridge.requestExportCsvFile !== "function") {
            reject(new Error("裝置不支援原生 CSV 匯出"));
            return;
          }
          var handler = function (event) {
            window.removeEventListener("android-csv-exported", handler);
            var detail = event.detail || {};
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

  var nativeBridge = createNativeBridge();

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

  async function replaceAllProductsIndexedDb(products) {
    await withStore(STORE_PRODUCTS, "readwrite", function (store) {
      var clearReq = store.clear();
      clearReq.onsuccess = function () {
        (Array.isArray(products) ? products : []).forEach(function (product) {
          store.put(product);
        });
      };
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

  function serializeProductsPayload(products) {
    return JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        products: Array.isArray(products) ? products : []
      },
      null,
      2
    );
  }

  async function getCategories() {
    var saved = await getSetting(CATEGORY_SETTING_KEY);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return DEFAULT_CATEGORIES.slice();
  }

  async function setCategories(categories) {
    await setSetting(CATEGORY_SETTING_KEY, categories);
  }

  function supportsWebFileStorage() {
    return typeof window.showSaveFilePicker === "function";
  }

  function isNativeFileMode() {
    return !!nativeBridge;
  }

  function supportsExternalFileStorage() {
    return isNativeFileMode() || supportsWebFileStorage();
  }

  async function hasSelectedFile(fileHandle) {
    if (isNativeFileMode()) {
      return nativeBridge.hasFile();
    }
    return !!fileHandle;
  }

  async function hasReadWritePermission(fileHandle, options) {
    var opts = options || {};
    if (!fileHandle) {
      return false;
    }
    var permissionOptions = { mode: "readwrite" };
    if ((await fileHandle.queryPermission(permissionOptions)) === "granted") {
      return true;
    }
    if (!opts.request) {
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

  async function chooseStorageFileHandle(t) {
    if (!supportsWebFileStorage()) {
      throw new Error("此瀏覽器不支援指定本機檔案位置，請使用 IndexedDB 並定期備份 JSON");
    }
    var translate = typeof t === "function" ? t : function (text) { return text; };
    return window.showSaveFilePicker({
      suggestedName: "expiry-manager-data.json",
      types: [
        {
          description: translate("商品效期資料 JSON"),
          accept: { "application/json": [".json"] }
        }
      ]
    });
  }

  async function readProductsFromSelectedFile(fileHandle) {
    if (isNativeFileMode()) {
      var nativeText = await nativeBridge.readFileText();
      return parseProductsPayload(nativeText);
    }
    var file = await fileHandle.getFile();
    var text = await file.text();
    return parseProductsPayload(text);
  }

  async function writeProductsToSelectedFile(products, fileHandle) {
    var payload = serializeProductsPayload(products);
    if (isNativeFileMode()) {
      await nativeBridge.writeFileText(payload);
      return;
    }
    var writer = await fileHandle.createWritable();
    await writer.write(payload);
    await writer.close();
  }

  function isFilePermissionActivationError(message) {
    var text = String(message || "");
    return text.indexOf("User activation is required") >= 0
      && (text.indexOf("requestPermission") >= 0 || text.indexOf("createWritable") >= 0);
  }

  async function tryWriteProductsToSelectedFile(products, fileHandle) {
    if (!(await hasSelectedFile(fileHandle))) {
      return { skipped: false };
    }
    if (!isNativeFileMode()) {
      var ok = await hasReadWritePermission(fileHandle, { request: false });
      if (!ok) {
        return { skipped: true };
      }
    }
    try {
      await writeProductsToSelectedFile(products, fileHandle);
      return { skipped: false };
    } catch (error) {
      if (isFilePermissionActivationError(error.message)) {
        return { skipped: true };
      }
      throw error;
    }
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
          var fileProducts = await readProductsFromSelectedFile(fileHandle);
          return { products: fileProducts, source: "file", fallbackReason: "" };
        }
        fallbackReason = "no-file";
      } catch (error) {
        fallbackReason = error && error.message ? error.message : "file-read-failed";
      }
    }
    var indexedProducts = await getAllProductsFromIndexedDb();
    return {
      products: indexedProducts,
      source: storageMode === "file" ? "indexeddb-fallback" : "indexeddb",
      fallbackReason: fallbackReason
    };
  }

  window.AppDataStore = {
    constants: {
      APP_DB: APP_DB,
      APP_DB_VERSION: APP_DB_VERSION,
      STORE_PRODUCTS: STORE_PRODUCTS,
      STORE_SETTINGS: STORE_SETTINGS,
      MODE_SETTING_KEY: MODE_SETTING_KEY,
      FILE_HANDLE_SETTING_KEY: FILE_HANDLE_SETTING_KEY,
      CATEGORY_SETTING_KEY: CATEGORY_SETTING_KEY,
      DEFAULT_CATEGORIES: DEFAULT_CATEGORIES.slice(),
      DEFAULT_MODE: DEFAULT_MODE
    },
    nativeBridge: nativeBridge,
    createNativeBridge: createNativeBridge,
    openDb: openDb,
    withStore: withStore,
    getSetting: getSetting,
    setSetting: setSetting,
    getAllProductsFromIndexedDb: getAllProductsFromIndexedDb,
    replaceAllProductsIndexedDb: replaceAllProductsIndexedDb,
    parseProductsPayload: parseProductsPayload,
    serializeProductsPayload: serializeProductsPayload,
    getCategories: getCategories,
    setCategories: setCategories,
    supportsWebFileStorage: supportsWebFileStorage,
    supportsExternalFileStorage: supportsExternalFileStorage,
    isNativeFileMode: isNativeFileMode,
    hasSelectedFile: hasSelectedFile,
    hasReadWritePermission: hasReadWritePermission,
    hasReadWritePermissionGrant: hasReadWritePermissionGrant,
    chooseStorageFileHandle: chooseStorageFileHandle,
    readProductsFromSelectedFile: readProductsFromSelectedFile,
    writeProductsToSelectedFile: writeProductsToSelectedFile,
    tryWriteProductsToSelectedFile: tryWriteProductsToSelectedFile,
    loadStorageState: loadStorageState,
    loadProductsForCurrentStorage: loadProductsForCurrentStorage,
    isFilePermissionActivationError: isFilePermissionActivationError
  };
})();