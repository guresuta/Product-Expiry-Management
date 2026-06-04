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
