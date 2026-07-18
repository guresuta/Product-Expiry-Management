(function (window, document) {
  "use strict";

  var themeAliases = {
    "dark-7": "dark-1",
    "light-7": "light-1",
    "light-8": "light-2",
    "dark-8": "dark-2"
  };
  var backgrounds = {
    "dark-1": {
      preview: "./key-visuals/background-neon-cyber-preview.png",
      desktop: { webp: "./key-visuals/background-neon-cyber-desktop.webp", png: "./key-visuals/background-neon-cyber.png" },
      mobile: { webp: "./key-visuals/background-neon-cyber-mobile.webp", png: "./key-visuals/background-neon-cyber.png" }
    },
    "light-1": {
      preview: "./key-visuals/background-daylight-cyber-preview.png",
      desktop: { webp: "./key-visuals/background-daylight-cyber-desktop.webp", png: "./key-visuals/background-daylight-cyber.png" },
      mobile: { webp: "./key-visuals/background-daylight-cyber-mobile.webp", png: "./key-visuals/background-daylight-cyber.png" }
    },
    "light-2": {
      preview: "./key-visuals/background-vibrant-oasis-preview.png",
      desktop: { webp: "./key-visuals/background-vibrant-oasis-desktop.webp", png: "./key-visuals/background-vibrant-oasis.png" },
      mobile: { webp: "./key-visuals/background-vibrant-oasis-mobile.webp", png: "./key-visuals/background-vibrant-oasis.png" }
    },
    "dark-2": {
      preview: "./key-visuals/background-midnight-oasis-preview.png",
      desktop: { webp: "./key-visuals/background-midnight-oasis-desktop.webp", png: "./key-visuals/background-midnight-oasis.png" },
      mobile: { webp: "./key-visuals/background-midnight-oasis-mobile.webp", png: "./key-visuals/background-midnight-oasis.png" }
    }
  };
  var webpSupported = null;

  function normalizeTheme(themeKey) {
    var key = themeAliases[themeKey] || themeKey;
    return backgrounds[key] ? key : "dark-1";
  }

  function supportsWebP() {
    if (webpSupported !== null) return webpSupported;
    try {
      var canvas = document.createElement("canvas");
      webpSupported = !!(canvas.getContext && canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0);
    } catch (_error) {
      webpSupported = false;
    }
    return webpSupported;
  }

  function isCompactViewport() {
    return Math.min(window.innerWidth || 0, window.innerHeight || 0) <= 730;
  }

  function getSource(themeKey) {
    var background = backgrounds[normalizeTheme(themeKey)];
    var size = isCompactViewport() ? background.mobile : background.desktop;
    return supportsWebP() ? size.webp : size.png;
  }

  function setCssImage(root, property, source) {
    root.style.setProperty(property, 'url("' + source + '")');
  }

  function setPreview(root, themeKey) {
    var key = normalizeTheme(themeKey);
    var background = backgrounds[key];
    root.classList.add("app-background-layer-active");
    root.setAttribute("data-background-theme", key);
    setCssImage(root, "--app-bg-placeholder-image", background.preview);
    setCssImage(root, "--app-bg-image", getSource(key));
    return key;
  }

  function preloadSource(source, callback) {
    var image;
    try {
      image = new Image();
      image.onload = function () { callback(true); };
      image.onerror = function () { callback(false); };
      image.src = source;
    } catch (_error) {
      callback(false);
    }
  }

  function start(themeKey) {
    var root = document.documentElement;
    var key = setPreview(root, themeKey);
    var source = getSource(key);
    root.classList.remove("app-background-ready");
    root.classList.remove("app-background-settled");
    preloadSource(source, function (loaded) {
      if (loaded && root.getAttribute("data-background-theme") === key) {
        root.classList.add("app-background-ready");
        window.setTimeout(function () {
          if (root.getAttribute("data-background-theme") === key && root.classList.contains("app-background-ready")) {
            root.classList.add("app-background-settled");
          }
        }, 300);
      }
    });
    return key;
  }

  function preloadTheme(themeKey, callback) {
    var key = normalizeTheme(themeKey);
    preloadSource(getSource(key), function (loaded) {
      if (typeof callback === "function") callback(loaded, key);
    });
  }

  function activateTheme(themeKey, callback) {
    var root = document.documentElement;
    var key = normalizeTheme(themeKey);
    var source = getSource(key);
    preloadSource(source, function (loaded) {
      setPreview(root, key);
      root.classList.remove("app-background-settled");
      if (loaded) {
        root.classList.add("app-background-ready");
        window.setTimeout(function () {
          if (root.getAttribute("data-background-theme") === key && root.classList.contains("app-background-ready")) {
            root.classList.add("app-background-settled");
          }
        }, 300);
      } else {
        root.classList.remove("app-background-ready");
      }
      if (typeof callback === "function") callback(loaded, key);
    });
  }

  window.AppBackground = {
    start: start,
    preloadTheme: preloadTheme,
    activateTheme: activateTheme,
    getCurrentSource: function (themeKey) { return getSource(themeKey); },
    getPreviewSource: function (themeKey) { return backgrounds[normalizeTheme(themeKey)].preview; },
    getThemeKeys: function () { return ["dark-1", "light-1", "light-2", "dark-2"]; }
  };
})(window, document);
