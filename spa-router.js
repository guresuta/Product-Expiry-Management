(function (window, document) {
  "use strict";

  // Android keeps one WebView document alive. Route bodies are mounted once and then
  // retained, so moving between the four app screens never clears the WebView surface.
  var routeFiles = {
    home: "./inventory-management-app.html",
    settings: "./settings.html",
    analytics: "./analytics.html",
    privacy: "./privacy-policy.html"
  };
  var routeScripts = {
    settings: "./settings.js",
    analytics: "./analytics.js",
    privacy: "./privacy-page.js"
  };
  var routeByFile = {
    "inventory-management-app.html": "home",
    "settings.html": "settings",
    "analytics.html": "analytics",
    "privacy-policy.html": "privacy"
  };
  var host = null;
  var activeRoute = "home";
  var screens = {};
  var routeTitles = {};
  var routeBackHandlers = {};
  var pendingRoute = null;
  var pendingReady = {};

  function routeForHref(href) {
    var clean = String(href || "").split("#")[0].split("?")[0];
    clean = clean.split("/").pop();
    return routeByFile[clean] || null;
  }

  function isShell() {
    return !!(document.body && document.body.getAttribute("data-spa-shell") === "true");
  }

  function markHomeNodes() {
    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (node.id !== "spaRouteHost") node.setAttribute("data-spa-home-node", "true");
    });
  }

  function setHomeVisible(visible) {
    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (node.getAttribute("data-spa-home-node") === "true") node.hidden = !visible;
    });
  }

  function setActiveBodyClass(route) {
    document.body.classList.toggle("privacy-page", route === "privacy");
  }

  function resetRouteScroll() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function startCurrentBackground() {
    if (!window.AppBackground || typeof window.AppBackground.start !== "function") return;
    var theme = "dark-1";
    try { theme = localStorage.getItem("uiTheme") || theme; } catch (_error) {}
    window.AppBackground.start(theme);
  }

  function waitForFrames(callback) {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(callback);
    });
  }

  function runRoutePreparation(route) {
    var page = route === "home" ? window.AppHomePage :
      (route === "settings" ? window.AppSettingsPage : window.AppAnalyticsPage);
    if (!page || typeof page.prepareRoute !== "function") return Promise.resolve();
    try {
      return Promise.resolve(page.prepareRoute());
    } catch (_error) {
      return Promise.resolve();
    }
  }

  function reveal(route) {
    var previous = activeRoute;
    var previousScreen = screens[previous];
    var nextScreen = screens[route];
    if (route !== "home" && !nextScreen) return;
    if (route === "home") {
      setHomeVisible(true);
    } else {
      nextScreen.hidden = false;
      nextScreen.classList.remove("spa-route-visible");
    }
    setActiveBodyClass(route);
    if (window.AppI18n && typeof window.AppI18n.translateDocument === "function") {
      window.AppI18n.translateDocument();
    }
    startCurrentBackground();
    waitForFrames(function () {
      if (route !== "home") nextScreen.classList.add("spa-route-visible");
      window.setTimeout(function () {
        if (previous === "home" && route !== "home") setHomeVisible(false);
        if (previous !== "home" && previousScreen && previous !== route) {
          previousScreen.hidden = true;
          previousScreen.classList.remove("spa-route-visible");
        }
        // A SPA has one document scroll position. Reset only after the old route
        // is hidden so every destination opens at its own page top.
        resetRouteScroll();
        activeRoute = route;
        if (routeTitles[route]) document.title = routeTitles[route];
        if (routeBackHandlers[route]) window.AppNativeBack = routeBackHandlers[route];
        pendingRoute = null;
        window.dispatchEvent(new CustomEvent("app-route-visible", { detail: { route: route, previousRoute: previous } }));
      }, 180);
    });
  }

  function activate(route) {
    if (route === activeRoute && !pendingRoute) return Promise.resolve();
    pendingRoute = route;
    return runRoutePreparation(route).then(function () { reveal(route); });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function mountRoute(route) {
    if (screens[route]) return Promise.resolve(screens[route]);
    var file = routeFiles[route];
    if (!file || typeof window.fetch !== "function" || typeof window.DOMParser !== "function") {
      return Promise.reject(new Error("SPA route loading is unavailable"));
    }
    return window.fetch(file, { cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load route");
        return response.text();
      })
      .then(function (html) {
        var parsed = new DOMParser().parseFromString(html, "text/html");
        var screen = document.createElement("section");
        screen.className = "spa-route-screen spa-route-" + route;
        screen.hidden = true;
        Array.prototype.slice.call(parsed.body.childNodes).forEach(function (node) {
          if (node.nodeType === 1 && node.tagName === "SCRIPT") return;
          if (node.nodeType === 3 && !String(node.nodeValue || "").trim()) return;
          screen.appendChild(document.importNode(node, true));
        });
        host.appendChild(screen);
        screens[route] = screen;
        if (parsed.title) routeTitles[route] = parsed.title;
        return screen;
      })
      .then(function (screen) {
        var script = routeScripts[route];
        if (!script) return screen;
        pendingReady[route] = false;
        return loadScript(script).then(function () {
          routeBackHandlers[route] = window.AppNativeBack;
          window.setTimeout(function () {
            if (!pendingReady[route]) markRouteReady(route);
          }, 4000);
          return new Promise(function (resolve) {
            var wait = function () {
              if (pendingReady[route]) return resolve(screen);
              window.setTimeout(wait, 16);
            };
            wait();
          });
        });
      });
  }

  function navigate(target, options) {
    options = options || {};
    var route = routeForHref(target) || target;
    if (!routeFiles[route] || !isShell()) {
      if (typeof target === "string") window.location.href = target;
      return;
    }
    // Lock immediately. Without this, rapid taps can start parallel fetches and
    // mounts of the same route before activate() gets a chance to set pendingRoute.
    if (route === activeRoute || pendingRoute) return;
    pendingRoute = route;
    var historyState = { spaRoute: route };
    if (!options.fromPopState) {
      if (options.replace) history.replaceState(historyState, "", routeFiles[route]);
      else history.pushState(historyState, "", routeFiles[route]);
    }
    var ready = screens[route] ? Promise.resolve(screens[route]) : mountRoute(route);
    ready.then(function () { return activate(route); }).catch(function () {
      pendingRoute = null;
      window.location.href = routeFiles[route];
    });
  }

  function markRouteReady(route) {
    pendingReady[route] = true;
  }

  function findAnchor(node) {
    while (node && node !== document) {
      if (String(node.tagName || "").toUpperCase() === "A") return node;
      node = node.parentNode;
    }
    return null;
  }

  function initialize() {
    if (!isShell() || host) return;
    markHomeNodes();
    host = document.createElement("div");
    host.id = "spaRouteHost";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    screens.home = null;
    routeTitles.home = document.title;
    routeBackHandlers.home = window.AppNativeBack;
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented) return;
      var anchor = findAnchor(event.target);
      if (!anchor || anchor.target === "_blank") return;
      var route = routeForHref(anchor.getAttribute("href"));
      if (!route) return;
      event.preventDefault();
      navigate(route);
    }, true);
    window.addEventListener("popstate", function (event) {
      var route = event.state && event.state.spaRoute ? event.state.spaRoute : routeForHref(location.pathname);
      if (route) navigate(route, { fromPopState: true });
    });
  }

  window.AppRouter = { navigate: navigate, markRouteReady: markRouteReady, isActive: isShell };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})(window, document);
