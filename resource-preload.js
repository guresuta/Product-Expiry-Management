(function () {
  "use strict";

  var started = false;
  var pages = [
    "./inventory-management-app.html",
    "./settings.html",
    "./privacy-policy.html",
    "./analytics.html"
  ];
  var assets = [
    "./styles_washi.css",
    "./legacy-webview.js",
    "./i18n.js",
    "./app.js",
    "./settings.js",
    "./analytics.js",
    "./data-store.js",
    "./version.js",
    "./fonts/GenSekiGothic2TC-H.woff2",
    "./fonts/GenSekiGothic2TC-R.woff2",
    "./key-visuals/background-neon-cyber.png",
    "./key-visuals/background-daylight-cyber.png",
    "./key-visuals/background-vibrant-oasis.png",
    "./key-visuals/background-midnight-oasis.png"
  ];

  function schedule(task) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(task, { timeout: 1800 });
      return;
    }
    window.setTimeout(task, 350);
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
    if (typeof window.fetch !== "function") {
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
    try {
      var image = new Image();
      image.decoding = "async";
      image.src = src;
    } catch (_error) {
    }
  }

  function warmFonts() {
    if (!document.fonts || typeof document.fonts.load !== "function") {
      return;
    }
    try {
      document.fonts.load('1rem "GenSekiGothic2TC-R"');
      document.fonts.load('1rem "GenSekiGothic2TC-H"');
    } catch (_error) {
    }
  }

  function start() {
    if (started) {
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
