// Greedev CV — DataStore Module
// Two-tier JSON data model: base pool (API) + version config overlay.
// Dispatches GreedevCV:datachange on state mutations.
// All persistence goes through the Vercel API with Bearer token auth.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /**
   * Internal state of the DataStore.
   *
   * @typedef {Object} DataStoreState
   * @property {Object|null}  base              — Raw base pool from API (GET /api/cv/pool)
   * @property {Array}        versions          — List of version manifests [{ id, label, created, updated }]
   * @property {string|null}  activeVersionId   — Currently selected version ID
   * @property {Object|null}  activeVersion     — Full version config for the active version
   * @property {boolean}      serverAvailable   — Always true on Vercel
   */

  /** @type {DataStoreState} */
  var state = {
    base: null,
    versions: [],
    activeVersionId: null,
    activeVersion: null,
    serverAvailable: true,
  };

  // ── Event helpers ─────────────────────────────────────────────────

  /**
   * Dispatch a CustomEvent on the document.
   * @param {string} name
   * @param {*}      detail
   */
  function dispatch(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  /**
   * Emit the standard datachange event with current state.
   */
  function emitChange() {
    dispatch('GreedevCV:datachange', {
      base: state.base,
      version: state.activeVersion,
      versions: state.versions,
      language: getLanguage(),
    });
  }

  // ── Utility ───────────────────────────────────────────────────────

  /**
   * Set a value at a dot-delimited path on a target object (mutates in place).
   *
   * @param {Object} obj
   * @param {string} path   — e.g. "personalInfo.name"
   * @param {*}      value
   */
  function setNested(obj, path, value) {
    var keys = path.split('.');
    var current = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Create a debounced version of a function.
   *
   * @param {Function} fn
   * @param {number}   delay  — milliseconds
   * @returns {Function}
   */
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  /**
   * Generate a unique ID using crypto.randomUUID with fallback.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  // ── Schema v1 → v2 migration ──────────────────────────────────────────

  /**
   * Migrate translatable fields from plain strings to { en, es } objects.
   * Idempotent: returns v2 data unchanged.
   *
   * @param {*} data
   * @returns {*}
   */
  function migrateToV2(data) {
    if (!data || data.schemaVersion >= 2) return data;

    var wrap = function (v) {
      if (v === null || v === undefined || typeof v === 'object') return v;
      return { en: v, es: v };
    };

    // Base pool
    if (typeof data.summary === 'string') data.summary = wrap(data.summary);

    (data.experiences || []).forEach(function (exp) {
      exp.role = wrap(exp.role);
      exp.location = wrap(exp.location);
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets = exp.bullets.map(wrap);
      }
    });

    (data.education || []).forEach(function (edu) {
      edu.degree = wrap(edu.degree);
      edu.field = wrap(edu.field);
      if (edu.achievements && edu.achievements.length > 0) {
        edu.achievements = edu.achievements.map(wrap);
      }
    });

    (data.projects || []).forEach(function (proj) {
      proj.name = wrap(proj.name);
      proj.description = wrap(proj.description);
      if (proj.bullets && proj.bullets.length > 0) {
        proj.bullets = proj.bullets.map(wrap);
      }
    });

    // Version config
    if (typeof data.targetRole === 'string') data.targetRole = wrap(data.targetRole);
    if (typeof data.targetCompany === 'string') data.targetCompany = wrap(data.targetCompany);
    if (typeof data.summary === 'string') data.summary = wrap(data.summary); // version summary
    if (data.experienceBullets) {
      Object.keys(data.experienceBullets).forEach(function (key) {
        if (data.experienceBullets[key] && data.experienceBullets[key].length > 0) {
          data.experienceBullets[key] = data.experienceBullets[key].map(wrap);
        }
      });
    }

    data.schemaVersion = 2;
    return data;
  }

  // ── Auth helpers ──────────────────────────────────────────────────────

  var TOKEN_KEY = 'greedevcv-token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  /**
   * Fetch wrapper that attaches Bearer token and handles 401 redirect.
   *
   * @param {string} path
   * @param {Object} [options]
   * @returns {Promise<Response>}
   */
  async function apiFetch(path, options) {
    options = options || {};
    var token = getToken();
    var headers = { 'Content-Type': 'application/json' };

    // Merge caller headers
    if (options.headers) {
      for (var k in options.headers) {
        if (options.headers.hasOwnProperty(k)) {
          headers[k] = options.headers[k];
        }
      }
    }

    if (token) headers['Authorization'] = 'Bearer ' + token;

    var res = await fetch(path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined,
    });

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login.html';
      throw new Error('Unauthorized');
    }

    return res;
  }

  // ── localStorage scratchpad ─────────────────────────────────────────

  var DRAFT_KEY = 'greedevcv-draft';

  /**
   * Save the current editor state (base + active version) to localStorage.
   */
  function saveDraft() {
    if (!state.base || !state.activeVersion) return;
    try {
      var draft = {
        timestamp: new Date().toISOString(),
        base: state.base,
        version: state.activeVersion,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (_) {
      // localStorage full or unavailable — silently ignore
    }
  }

  /** Debounced variant for use on every editor keystroke. */
  var debouncedSaveDraft = debounce(saveDraft, 500);

  // ── Version manifest normalizer ──────────────────────────────────────

  /**
   * Normalize a version record from the API (snake_case columns) to
   * the frontend's camelCase convention.
   *
   * @param {Object} v  — API version row { id, label, created_at, updated_at }
   * @returns {Object}  — { id, label, created, updated }
   */
  function normalizeVersion(v) {
    return {
      id: v.id,
      label: v.label,
      created: v.created_at || v.created,
      updated: v.updated_at || v.updated,
    };
  }

  // ── Default version config builder ───────────────────────────────────

  /**
   * Build a fresh version config object (without an id — the server
   * assigns one on POST).
   *
   * @param {string} label
   * @returns {Object}
   */
  function buildVersionConfig(label) {
    var now = new Date().toISOString().slice(0, 10);
    return {
      $schema: 'greedev-version-1.0',
      label: label,
      created: now,
      updated: now,
      language: 'en',
      targetRole: '',
      targetCompany: '',
      summary: '',
      sections: {
        summary: true,
        education: true,
        experience: true,
        skills: true,
        projects: true,
      },
      selectedExperiences: [],
      selectedEducation: [],
      selectedSkills: [],
      selectedProjects: [],
      experienceBullets: {},
      template: 'harvard',
    };
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Initialise the DataStore: fetch base pool, load versions, load the
   * first version config.  Dispatches GreedevCV:datachange on success or
   * GreedevCV:error on failure.
   *
   * @returns {Promise<void>}
   */
  async function init() {
    try {
      // 1. Fetch base pool from API
      var poolRes = await apiFetch('/api/cv/pool');
      var poolData = await poolRes.json();
      state.base = poolData && poolData.data !== undefined ? poolData.data : null;

      // 2. Validate and migrate schema
      var needsMigration = false;
      if (state.base) {
        if (state.base.schemaVersion !== 1 && state.base.schemaVersion !== 2) {
          throw new Error('Unsupported schema version. Expected 1 or 2.');
        }
        needsMigration = state.base.schemaVersion === 1;
        state.base = migrateToV2(state.base);
      }

      // 3. Fetch version list
      var versionsRes = await apiFetch('/api/cv/versions');
      state.versions = (await versionsRes.json()).map(normalizeVersion);
      state.serverAvailable = true;

      // 4. Load first available version
      if (state.versions.length > 0) {
        state.activeVersionId = state.versions[0].id;
        var vRes = await apiFetch('/api/cv/versions/' + state.activeVersionId);
        if (vRes.ok) {
          state.activeVersion = await vRes.json();
          state.activeVersion = migrateToV2(state.activeVersion);
          state.activeVersion.id = state.activeVersionId;
        } else {
          state.activeVersion = null;
        }
      }

      // Auto-save migrated data as v2
      if (needsMigration) {
        if (state.base) saveBase();
        if (state.activeVersion) save();
      }

      // 5. Seed default data for brand-new users (no pool, no versions)
      if (!state.base) {
        state.base = {
          $schema: 'greedev-cv-1.0',
          schemaVersion: 2,
          personalInfo: {},
          summary: '',
          experiences: [],
          education: [],
          skills: [],
          projects: [],
        };
        await saveBase();
      }

      if (state.versions.length === 0) {
        var firstVersionId = await newVersion('First Version');
        // newVersion already emits change, skip the emit below
        // but we still need draft check
        checkDraft();
        return;
      }

      emitChange();

      // 6. Check for a newer localStorage draft
      checkDraft();
    } catch (err) {
      dispatch('GreedevCV:error', { message: err.message });
    }
  }

  /**
   * Return a shallow copy of the current state.
   * @returns {DataStoreState}
   */
  function getState() {
    return {
      base: state.base,
      versions: state.versions.slice(),
      activeVersionId: state.activeVersionId,
      activeVersion: state.activeVersion,
      serverAvailable: state.serverAvailable,
    };
  }

  /**
   * Switch the active version by ID.
   * Fetches the version config from the API.
   *
   * @param {string} id
   */
  async function setActiveVersion(id) {
    if (id === state.activeVersionId && state.activeVersion) {
      return; // Already active
    }

    state.activeVersionId = id;

    try {
      var res = await apiFetch('/api/cv/versions/' + id);
      if (!res.ok) {
        throw new Error('Version "' + id + '" not found');
      }
      state.activeVersion = await res.json();
      state.activeVersion.id = id;
      emitChange();
    } catch (err) {
      dispatch('GreedevCV:error', { message: err.message });
    }
  }

  /**
   * Update a path on the base pool and emit change.
   *
   * @param {string} path  — Dot-path, e.g. "personalInfo.name"
   * @param {*}      value
   */
  function updateBase(path, value) {
    if (!state.base) return;
    setNested(state.base, path, value);
    debouncedSaveDraft();
    emitChange();
  }

  /**
   * Update a path on the active version config and emit change.
   *
   * @param {string} path  — Dot-path, e.g. "targetRole"
   * @param {*}      value
   */
  function updateVersion(path, value) {
    if (!state.activeVersion) return;
    setNested(state.activeVersion, path, value);
    debouncedSaveDraft();
    emitChange();
  }

  /**
   * Save the active version config to the API via PATCH /api/cv/versions/[id].
   *
   * @returns {Promise<boolean>}  — true on success, false on failure
   */
  async function save() {
    if (!state.activeVersion) return false;

    try {
      var res = await apiFetch('/api/cv/versions/' + state.activeVersion.id, {
        method: 'PATCH',
        body: JSON.stringify({ config: state.activeVersion }),
      });

      if (res.ok) {
        dispatch('GreedevCV:saved', { source: 'server' });
        return true;
      }

      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Save the base pool to the API via PUT /api/cv/pool.
   *
   * @returns {Promise<boolean>}  — true on success, false on failure
   */
  async function saveBase() {
    if (!state.base) return false;

    try {
      var res = await apiFetch('/api/cv/pool', {
        method: 'PUT',
        body: JSON.stringify({ data: state.base }),
      });

      return res.ok;
    } catch (_) {
      return false;
    }
  }

  /**
   * Create a new version on the server, add it to the local list, and
   * switch to it.
   *
   * @param {string} label
   * @returns {Promise<string|null>}  — the new version id, or null on failure
   */
  async function newVersion(label) {
    var config = buildVersionConfig(label);

    try {
      var res = await apiFetch('/api/cv/versions', {
        method: 'POST',
        body: JSON.stringify({ label: label, config: config }),
      });

      if (!res.ok) {
        dispatch('GreedevCV:error', { message: 'Failed to create version' });
        return null;
      }

      var result = await res.json();
      var id = result.id;

      // Apply server-assigned id to the local config
      config.id = id;

      // Add to version list
      state.versions.push(normalizeVersion(result));

      // Switch to it
      state.activeVersionId = id;
      state.activeVersion = config;

      emitChange();
      return id;
    } catch (err) {
      dispatch('GreedevCV:error', { message: err.message });
      return null;
    }
  }

  /**
   * Delete a version on the server and from the local list.
   * The server enforces the "last version cannot be deleted" rule
   * (returns 400).
   *
   * @param {string} id
   * @returns {Promise<boolean>}  — true if deleted, false if blocked (last version)
   */
  async function deleteVersion(id) {
    if (state.versions.length <= 1) {
      return false;
    }

    try {
      var res = await apiFetch('/api/cv/versions/' + id, { method: 'DELETE' });

      // Server returns 400 when attempting to delete the last version
      if (res.status === 400) {
        return false;
      }

      if (!res.ok && res.status !== 204) {
        throw new Error('Server responded with ' + res.status);
      }

      // Remove from local list
      state.versions = state.versions.filter(function (v) {
        return v.id !== id;
      });

      // If the active version was deleted, switch to the first remaining
      if (state.activeVersionId === id) {
        var next = state.versions[0];
        state.activeVersionId = next.id;
        state.activeVersion = null;

        // Load the next version config
        var vRes = await apiFetch('/api/cv/versions/' + next.id);
        if (vRes.ok) {
          state.activeVersion = await vRes.json();
          state.activeVersion.id = next.id;
        }
      }

      emitChange();
      return true;
    } catch (err) {
      dispatch('GreedevCV:error', { message: err.message });
      return false;
    }
  }

  /**
   * Deep-clone the active version (or the version identified by `id`)
   * via the API, add it to the version list, switch to it, and emit change.
   *
   * @param {string} [id]  — source version ID; defaults to active version
   * @returns {Promise<string|null>}  — new version ID, or null on failure
   */
  async function duplicateVersion(id) {
    var sourceId = id || state.activeVersionId;
    var source = state.activeVersion;

    if (!source || source.id !== sourceId) {
      dispatch('GreedevCV:error', { message: 'Cannot duplicate: source version not loaded' });
      return null;
    }

    // Deep clone
    var cloned = JSON.parse(JSON.stringify(source));
    cloned.label = cloned.label + ' (copy)';
    var now = new Date().toISOString().slice(0, 10);
    cloned.created = now;
    cloned.updated = now;
    delete cloned.id; // server generates a new id

    try {
      var res = await apiFetch('/api/cv/versions', {
        method: 'POST',
        body: JSON.stringify({ label: cloned.label, config: cloned }),
      });

      if (!res.ok) {
        dispatch('GreedevCV:error', { message: 'Failed to duplicate version' });
        return null;
      }

      var result = await res.json();
      var newId = result.id;
      cloned.id = newId;

      // Add manifest entry
      state.versions.push(normalizeVersion(result));

      // Switch active version to the clone
      state.activeVersionId = newId;
      state.activeVersion = cloned;

      emitChange();
      return newId;
    } catch (err) {
      dispatch('GreedevCV:error', { message: err.message });
      return null;
    }
  }

  // ── localStorage draft: check / discard / restore ─────────────────

  /**
   * After init, check if a newer localStorage draft exists and dispatch
   * GreedevCV:draft-found so the App can offer Restore / Discard.
   */
  function checkDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      var draft = JSON.parse(raw);
      if (!draft.timestamp || !draft.version || !draft.base) return;

      var draftTime = new Date(draft.timestamp).getTime();
      var savedTime = state.activeVersion
        ? new Date(state.activeVersion.updated).getTime()
        : 0;

      if (draftTime > savedTime) {
        dispatch('GreedevCV:draft-found', {
          timestamp: draft.timestamp,
          draft: draft,
        });
      }
    } catch (_) {
      // Malformed draft — ignore
    }
  }

  /**
   * Clear the localStorage draft without restoring it.
   */
  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (_) {}
  }

  /**
   * Replace current state with the draft data and clear the draft.
   */
  function restoreDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;

      var draft = JSON.parse(raw);
      if (!draft.base || !draft.version) return;

      state.base = draft.base;
      state.activeVersion = draft.version;

      // Keep version manifest in sync with restored version
      for (var i = 0; i < state.versions.length; i++) {
        if (state.versions[i].id === draft.version.id) {
          state.versions[i].label = draft.version.label;
          state.versions[i].updated = draft.version.updated;
          break;
        }
      }

      localStorage.removeItem(DRAFT_KEY);
      emitChange();
    } catch (_) {}
  }

  // ── Language state ────────────────────────────────────────────────────

  /**
   * Get the current language from the active version config.
   * Defaults to "en" if not set.
   *
   * @returns {string}
   */
  function getLanguage() {
    return (state.activeVersion && state.activeVersion.language) || 'en';
  }

  /**
   * Set the active language. Validates lang is "en" or "es".
   * Persists to version config, dispatches GreedevCV:languagechange.
   *
   * @param {string} lang
   */
  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'es') return;
    if (!state.activeVersion) return;
    state.activeVersion.language = lang;
    debouncedSaveDraft();
    dispatch('GreedevCV:languagechange', { language: lang });
  }

  // ── Export ────────────────────────────────────────────────────────

  window.GreedevCV.DataStore = {
    init: init,
    getState: getState,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    setActiveVersion: setActiveVersion,
    updateBase: updateBase,
    updateVersion: updateVersion,
    save: save,
    saveBase: saveBase,
    generateId: generateId,
    newVersion: newVersion,
    deleteVersion: deleteVersion,
    duplicateVersion: duplicateVersion,
    discardDraft: discardDraft,
    restoreDraft: restoreDraft,
  };
})();
