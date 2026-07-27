(function (window, document) {
  "use strict";

  function isSpa() {
    return !!(window.AppRouter && window.AppRouter.isActive && window.AppRouter.isActive());
  }

  function initPrivacyPage() {
    window.AppNativeBack = {
      handleBack: function () {
        if (isSpa()) {
          window.AppRouter.navigate("home", { replace: true });
          return true;
        }
        return "home";
      }
    };

    var openAppInfoBtn = document.getElementById("openAppInfoBtn");
    var canOpenAppInfo = !!(window.AndroidBridge && typeof window.AndroidBridge.openAppInfo === "function");
    if (openAppInfoBtn) {
      if (!canOpenAppInfo) {
        openAppInfoBtn.classList.add("app-info-unavailable");
        openAppInfoBtn.setAttribute("aria-disabled", "true");
        openAppInfoBtn.setAttribute("tabindex", "-1");
      }
      openAppInfoBtn.addEventListener("click", function (event) {
        if (!canOpenAppInfo) {
          event.preventDefault();
          return;
        }
        try { window.AndroidBridge.openAppInfo(); } catch (_error) {}
      });
    }

    if (!isSpa()) {
      try {
        if (!history.state || history.state.privacyPage !== true) {
          history.replaceState({ privacyPage: true }, "", location.href);
          history.pushState({ privacyGuard: true }, "", location.href);
        }
      } catch (_error) {}
      window.addEventListener("popstate", function () {
        location.href = "./inventory-management-app.html";
      });
    }

    if (window.AppI18n && typeof window.AppI18n.translateDocument === "function") {
      window.AppI18n.translateDocument();
    }
    if (window.AppRouter && typeof window.AppRouter.markRouteReady === "function") {
      window.AppRouter.markRouteReady("privacy");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPrivacyPage);
  } else {
    initPrivacyPage();
  }
})(window, document);
