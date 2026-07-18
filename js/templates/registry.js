// Greedev CV — Template Registry
// Global registry for pluggable template renderers.
// API: register(name, renderFn), get(name), list()

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /** @type {Object<string, Function>} */
  var templates = {};

  /**
   * Register a template renderer.
   *
   * @param {string}   name     — unique key, e.g. "harvard"
   * @param {Function} renderFn — function(data) → HTML string
   */
  function register(name, renderFn) {
    templates[name] = renderFn;
  }

  /**
   * Get a registered renderer by name.
   *
   * @param {string} name
   * @returns {Function|undefined}
   */
  function get(name) {
    return templates[name];
  }

  /**
   * List all registered template names.
   *
   * @returns {string[]}
   */
  function list() {
    return Object.keys(templates);
  }

  // ── Export ────────────────────────────────────────────────────────

  window.GreedevCV.Templates = {
    register: register,
    get: get,
    list: list,
  };
})();
