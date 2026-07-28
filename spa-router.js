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
  var routeMountPromises = {};
  var routePrewarmStarted = false;

  function routeForHref(href) {
    var clean = String(href || "").split("#")[0].split("?")[0];
    clean = clean.split("/").pop();
    return routeByFile[clean] || null;
  }

  function isShell() {
    return !!(document.body && document.body.getAttribute("data-spa-shell") === "true");
  }

  function mountHomeScreen() {
    var screen = document.createElement("section");
    var nodes = Array.prototype.slice.call(document.body.children);
    var firstHomeNode = null;
    screen.id = "spaHomeRoute";
    screen.className = "spa-route-screen spa-route-home spa-route-visible";
    nodes.forEach(function (node) {
      if (
        node.classList.contains("app-background-layer") ||
        node.classList.contains("app-boot-screen") ||
        node.tagName === "SCRIPT"
      ) return;
      if (!firstHomeNode) firstHomeNode = node;
    });
    if (firstHomeNode) document.body.insertBefore(screen, firstHomeNode);
    else document.body.appendChild(screen);
    nodes.forEach(function (node) {
      if (node === screen || node.tagName === "SCRIPT") return;
      if (node.classList.contains("app-background-layer") || node.classList.contains("app-boot-screen")) return;
      screen.appendChild(node);
    });
    screens.home = screen;
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
    if (document.documentElement.classList.contains("app-background-layer-active")) return;
    var theme = "dark-1";
    try { theme = localStorage.getItem("uiTheme") || theme; } catch (_error) {}
    window.AppBackground.start(theme);
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function supportsSnapshotTransition() {
    return typeof document.startViewTransition === "function";
  }

  function ensureRouteScanLine() {
    var scanLine = document.getElementById("spaRouteScanline");
    if (scanLine) return scanLine;
    scanLine = document.createElement("div");
    scanLine.id = "spaRouteScanline";
    scanLine.setAttribute("aria-hidden", "true");
    document.body.appendChild(scanLine);
    return scanLine;
  }

  function setHomeBackHandler(handler) {
    if (!handler || typeof handler.handleBack !== "function") return;
    routeBackHandlers.home = handler;
  }

  function applyRouteSwitch(route, previous, previousScreen, nextScreen) {
    nextScreen.hidden = false;
    setActiveBodyClass(route);
    if (window.AppI18n && typeof window.AppI18n.translateDocument === "function") {
      window.AppI18n.translateDocument();
    }
    startCurrentBackground();
    if (previousScreen && previousScreen !== nextScreen) {
      previousScreen.hidden = true;
      previousScreen.classList.remove("spa-route-visible");
    }
    nextScreen.classList.add("spa-route-visible");
    resetRouteScroll();
  }

  function finishRouteSwitch(route, previous, previousScreen) {
    var nextScreen = screens[route];
    if (nextScreen) {
      nextScreen.classList.add("spa-route-visible");
    }
    activeRoute = route;
    if (routeTitles[route]) document.title = routeTitles[route];
    if (routeBackHandlers[route]) window.AppNativeBack = routeBackHandlers[route];
    pendingRoute = null;
    window.dispatchEvent(new CustomEvent("app-route-visible", { detail: { route: route, previousRoute: previous } }));
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
    if (prefersReducedMotion() || !supportsSnapshotTransition()) {
      applyRouteSwitch(route, previous, previousScreen, nextScreen);
      finishRouteSwitch(route, previous, previousScreen);
      return;
    }
    ensureRouteScanLine();
    document.documentElement.classList.add("spa-route-transitioning", "spa-route-snapshotting");
    var transition;
    try {
      transition = document.startViewTransition(function () {
        document.documentElement.classList.add("spa-route-scanline-active");
        applyRouteSwitch(route, previous, previousScreen, nextScreen);
      });
    } catch (_error) {
      document.documentElement.classList.remove("spa-route-transitioning", "spa-route-snapshotting", "spa-route-scanline-active");
      applyRouteSwitch(route, previous, previousScreen, nextScreen);
      finishRouteSwitch(route, previous, previousScreen);
      return;
    }
    transition.ready.then(function () {
      document.documentElement.classList.remove("spa-route-snapshotting");
    }).catch(function () {
      document.documentElement.classList.remove("spa-route-snapshotting");
    });
    transition.finished.then(function () {
      document.documentElement.classList.remove("spa-route-snapshotting", "spa-route-scanline-active");
      finishRouteSwitch(route, previous, previousScreen);
    }).catch(function () {
      document.documentElement.classList.remove("spa-route-transitioning", "spa-route-snapshotting", "spa-route-scanline-active");
      finishRouteSwitch(route, previous, previousScreen);
    });
  }

  function activate(route) {
    if (route === activeRoute && !pendingRoute) return Promise.resolve();
    pendingRoute = route;
    // Home is mounted from the first paint and its preparation deliberately
    // refreshes in the background.  Starting its View Transition synchronously
    // avoids two Promise turns (mountRoute -> prepareRoute) that were visible
    // as a short still frame before a quick return-home scan began.
    if (route === "home" && screens.home) {
      runRoutePreparation(route).catch(function () {});
      reveal(route);
      return Promise.resolve();
    }
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

  function runWhenIdle(callback, timeout) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: timeout || 1200 });
      return;
    }
    window.setTimeout(callback, Math.min(timeout || 1200, 400));
  }

  function prewarmRoute(route) {
    if (route === activeRoute || routeMountPromises[route]) return;
    mountRoute(route).catch(function () {
      // A normal navigation will retry or fall back to the standalone page.
    });
  }

  function scheduleRoutePrewarm() {
    if (routePrewarmStarted) return;
    if (!document.documentElement.classList.contains("app-ready")) {
      window.setTimeout(scheduleRoutePrewarm, 400);
      return;
    }
    routePrewarmStarted = true;
    runWhenIdle(function () { prewarmRoute("settings"); }, 900);
    runWhenIdle(function () { prewarmRoute("privacy"); }, 1800);
    window.setTimeout(function () {
      runWhenIdle(function () { prewarmRoute("analytics"); }, 1800);
    }, 2600);
  }

  function mountRoute(route) {
    if (routeMountPromises[route]) return routeMountPromises[route];
    if (screens[route]) return Promise.resolve(screens[route]);
    var file = routeFiles[route];
    if (!file || typeof window.fetch !== "function" || typeof window.DOMParser !== "function") {
      return Promise.reject(new Error("SPA route loading is unavailable"));
    }
    var mountPromise = window.fetch(file, { cache: "force-cache" })
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
          if (activeRoute !== route && routeBackHandlers[activeRoute]) {
            window.AppNativeBack = routeBackHandlers[activeRoute];
          }
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
    routeMountPromises[route] = mountPromise.then(function (screen) {
      return screen;
    }, function (error) {
      delete routeMountPromises[route];
      throw error;
    });
    return routeMountPromises[route];
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
    // The home screen already exists in the SPA shell.  Do not queue a resolved
    // mount Promise before activation; a quick back-to-home action should enter
    // the snapshot transition in this same event turn.
    if (route === "home" && screens.home) {
      activate(route);
      return;
    }
    var ready = mountRoute(route);
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
    mountHomeScreen();
    host = document.createElement("div");
    host.id = "spaRouteHost";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
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
    window.setTimeout(scheduleRoutePrewarm, 900);
  }

  window.AppRouter = {
    navigate: navigate,
    markRouteReady: markRouteReady,
    setHomeBackHandler: setHomeBackHandler,
    isActive: isShell
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})(window, document);
