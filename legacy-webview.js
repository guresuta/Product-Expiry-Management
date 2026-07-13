(function () {
  "use strict";

  var root = document.documentElement;
  var supportsInset = window.CSS
    && typeof window.CSS.supports === "function"
    && window.CSS.supports("inset", "0");

  if (!supportsInset) {
    root.classList.add("legacy-webview");
  }

  if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function (search, start) {
      var position = start || 0;
      return this.substr(position, search.length) === search;
    };
  }

  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function (search, length) {
      var value = String(this);
      var end = length === undefined ? value.length : Math.min(Number(length) || 0, value.length);
      return value.substring(end - search.length, end) === search;
    };
  }

  if (!String.prototype.padStart) {
    String.prototype.padStart = function (targetLength, padString) {
      var value = String(this);
      var target = Number(targetLength) || 0;
      var pad = padString === undefined ? " " : String(padString);
      if (value.length >= target || !pad) {
        return value;
      }
      var needed = target - value.length;
      while (pad.length < needed) {
        pad += pad;
      }
      return pad.slice(0, needed) + value;
    };
  }

  if (!Array.prototype.includes) {
    Array.prototype.includes = function (search, start) {
      return this.indexOf(search, start || 0) !== -1;
    };
  }

  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  if (window.Element && !Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
  }

  if (window.Element && !Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      var element = this;
      while (element && element.nodeType === 1) {
        if (element.matches(selector)) {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    };
  }

  function installMousePageDragScroll() {
    var dragState = null;
    var suppressNextClick = false;
    var nativeInteractionSelector = "a, button, input, textarea, select, option, label, [role='button'], [contenteditable='true'], .custom-select, .category-list, .modal";

    function keepsNativePointerBehavior(target) {
      return !!(target && target.closest && target.closest(nativeInteractionSelector));
    }

    document.addEventListener("mousedown", function (event) {
      if (event.button !== 0 || event.defaultPrevented || (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) || keepsNativePointerBehavior(event.target)) {
        return;
      }
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        scrollX: window.pageXOffset || document.documentElement.scrollLeft || 0,
        scrollY: window.pageYOffset || document.documentElement.scrollTop || 0,
        moved: false
      };
      event.preventDefault();
    }, true);

    document.addEventListener("mousemove", function (event) {
      if (!dragState) {
        return;
      }
      var deltaX = event.clientX - dragState.startX;
      var deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        dragState.moved = true;
        document.documentElement.classList.add("mouse-page-dragging");
      }
      if (dragState.moved) {
        window.scrollTo(dragState.scrollX - deltaX, dragState.scrollY - deltaY);
        event.preventDefault();
      }
    }, true);

    document.addEventListener("mouseup", function (event) {
      if (!dragState) {
        return;
      }
      suppressNextClick = dragState.moved;
      dragState = null;
      document.documentElement.classList.remove("mouse-page-dragging");
      if (suppressNextClick) {
        event.preventDefault();
      }
    }, true);

    document.addEventListener("click", function (event) {
      if (!suppressNextClick) {
        return;
      }
      suppressNextClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function installPressFeedback() {
    var pressSelector = "button, a[href], .nav-link, [role='button'], .custom-select-button, .custom-select-option, .calendar-day, .custom-date-day, .category-chip, .chip-delete, .health-check-btn, .theme-option-btn";
    var activeTarget = null;
    var pressedAt = 0;
    var releaseTimer = null;
    var minimumVisibleMs = 120;

    function findPressTarget(target) {
      if (!target || !target.closest) {
        return null;
      }
      var control = target.closest(pressSelector);
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true" || control.classList.contains("empty")) {
        return null;
      }
      return control;
    }

    function clearPressedTarget(target) {
      if (releaseTimer !== null) {
        window.clearTimeout(releaseTimer);
        releaseTimer = null;
      }
      if (target) {
        target.classList.remove("is-pressed");
      }
    }

    function releasePressFeedback() {
      if (!activeTarget) {
        return;
      }
      var target = activeTarget;
      activeTarget = null;
      var remaining = Math.max(0, minimumVisibleMs - (Date.now() - pressedAt));
      if (releaseTimer !== null) {
        window.clearTimeout(releaseTimer);
      }
      releaseTimer = window.setTimeout(function () {
        target.classList.remove("is-pressed");
        releaseTimer = null;
      }, remaining);
    }

    document.addEventListener("pointerdown", function (event) {
      if (event.defaultPrevented || event.isPrimary === false || (typeof event.button === "number" && event.button !== 0)) {
        return;
      }
      var target = findPressTarget(event.target);
      if (!target) {
        return;
      }
      clearPressedTarget(activeTarget);
      activeTarget = target;
      pressedAt = Date.now();
      target.classList.add("is-pressed");
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.repeat || (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar")) {
        return;
      }
      var target = findPressTarget(event.target);
      if (!target) {
        return;
      }
      clearPressedTarget(activeTarget);
      activeTarget = target;
      pressedAt = Date.now();
      target.classList.add("is-pressed");
    }, true);

    document.addEventListener("keyup", function (event) {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        releasePressFeedback();
      }
    }, true);
    document.addEventListener("pointerup", releasePressFeedback, true);
    document.addEventListener("pointercancel", releasePressFeedback, true);
    document.addEventListener("pointerleave", releasePressFeedback, true);
  }
  installPressFeedback();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installMousePageDragScroll);
  } else {
    installMousePageDragScroll();
  }
  try {
    new window.CustomEvent("legacy-webview-test");
  } catch (_error) {
    window.CustomEvent = function (eventName, params) {
      var options = params || {};
      var event = document.createEvent("CustomEvent");
      event.initCustomEvent(eventName, !!options.bubbles, !!options.cancelable, options.detail);
      return event;
    };
  }
})();
