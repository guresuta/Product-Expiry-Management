(function () {
  "use strict";

  var started = false;
  var isAndroidWebView = /; wv\)/i.test(navigator.userAgent || "") || !!window.AndroidBridge;
  var isSmallViewport = Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 730;
  var pages = isAndroidWebView || isSmallViewport
    ? ["./settings.html"]
    : [
      "./inventory-management-app.html",
      "./settings.html",
      "./privacy-policy.html"
    ];
  var baseAssets = [
    "./styles_washi.css",
    "./legacy-webview.js",
    "./i18n.js",
    "./app.js",
    "./settings.js",
    "./version.js",
    "./fonts/GenSekiGothic2TC-H.woff2",
    "./fonts/GenSekiGothic2TC-R.woff2"
  ];
  var backgroundAssets = [
    "./key-visuals/background-neon-cyber.png",
    "./key-visuals/background-daylight-cyber.png",
    "./key-visuals/background-vibrant-oasis.png",
    "./key-visuals/background-midnight-oasis.png"
  ];
function getCurrentBackgroundAsset() {
    var themeAliases = {
      "dark-7": "dark-1",
      "light-7": "light-1",
      "light-8": "light-2",
      "dark-8": "dark-2"
    };
    var themeBackgrounds = {
      "dark-1": "./key-visuals/background-neon-cyber.png",
      "light-1": "./key-visuals/background-daylight-cyber.png",
      "light-2": "./key-visuals/background-vibrant-oasis.png",
      "dark-2": "./key-visuals/background-midnight-oasis.png"
    };
    var savedTheme = "dark-1";
    try {
      savedTheme = localStorage.getItem("uiTheme") || "dark-1";
    } catch (_error) {
    }
    var themeKey = themeAliases[savedTheme] || savedTheme;
    return themeBackgrounds[themeKey] || themeBackgrounds["dark-1"];
  }

  var assets = baseAssets.concat(isAndroidWebView || isSmallViewport ? [getCurrentBackgroundAsset()] : backgroundAssets);

  function schedule(task) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(task, { timeout: 2200 });
      return;
    }
    window.setTimeout(task, isAndroidWebView || isSmallViewport ? 900 : 350);
  }

  function preloadLink(href, asType) {
    try {
      var link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      if (asType) {
        link.as = asType;
      }
      document.head.appendChild(link);
    } catch (_error) {
    }
  }

  function warmFetch(url) {
    if (typeof window.fetch !== "function" || document.hidden) {
      return;
    }
    try {
      window.fetch(url, {
        method: "GET",
        credentials: "same-origin",
        cache: "force-cache"
      }).catch(function () {});
    } catch (_error) {
    }
  }

  function warmImage(src) {
    if (document.hidden) {
      return;
    }
    try {
      var image = new Image();
      image.decoding = "async";
      image.src = src;
    } catch (_error) {
    }
  }

  function warmFonts() {
    if (!document.fonts || typeof document.fonts.load !== "function" || document.hidden) {
      return;
    }
    try {
      document.fonts.load('1rem "GenSekiGothic2TC-R"');
      document.fonts.load('1rem "GenSekiGothic2TC-H"');
    } catch (_error) {
    }
  }

  function start() {
    if (started || document.hidden) {
      return;
    }
    started = true;
    var currentPath = location.pathname.split("/").pop() || "inventory-management-app.html";
    pages.forEach(function (url) {
      if (url.indexOf(currentPath) === -1) {
        preloadLink(url, "document");
        warmFetch(url);
      }
    });
    assets.forEach(function (url) {
      var isImage = /\.(png|jpe?g|webp)$/i.test(url);
      var isFont = /\.(woff2?|ttf|otf)$/i.test(url);
      preloadLink(url, isImage ? "image" : (isFont ? "font" : ""));
      if (isImage) {
        warmImage(url);
      } else {
        warmFetch(url);
      }
    });
    warmFonts();
  }

  if (document.readyState === "complete") {
    schedule(start);
  } else {
    window.addEventListener("load", function () {
      schedule(start);
    }, { once: true });
  }
})();