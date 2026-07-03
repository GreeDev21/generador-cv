// Greedev CV — DataStore Module
// Two-tier JSON data model: base pool (data/cv.json) + version config overlay.
// Dispatches GreedevCV:datachange on state mutations.
// Falls back to Blob download when the server is unreachable.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /**
   * Internal state of the DataStore.
   *
   * @typedef {Object} DataStoreState
   * @property {Object|null}  base              — Raw base pool from data/cv.json
   * @property {Array}        versions          — List of version manifests [{ id, label, created, updated }]
   * @property {string|null}  activeVersionId   — Currently selected version ID
   * @property {Object|null}  activeVersion     — Full version config for the active version
   * @property {boolean}      serverAvailable   — Whether the server responded to a ping
   */

  /** @type {DataStoreState} */
  var state = {
    base: null,
    versions: [],
    activeVersionId: null,
    activeVersion: null,
    serverAvailable: false,
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

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Initialise the DataStore: ping server, load base pool, load versions.
   * Dispatches GreedevCV:datachange on success or GreedevCV:error on failure.
   *
   * @returns {Promise<void>}
   */
  async function init() {
    try {
      // 1. Load base pool
      var baseRes = await fetch('/data/cv.json');
      if (!baseRes.ok) {
        throw new Error('Missing data/cv.json');
      }
      state.base = await baseRes.json();

      // 2. Validate schema version (accept v1 or v2)
      if (state.base.schemaVersion !== 1 && state.base.schemaVersion !== 2) {
        throw new Error('Unsupported schema version. Expected 1 or 2.');
      }

      // 2b. Migrate v1 → v2 if needed
      var needsMigration = state.base.schemaVersion === 1;
      state.base = migrateToV2(state.base);

      // 3. Try loading version list — doubles as server availability check
      state.serverAvailable = false;
      try {
        var versionsRes = await fetch('/api/versions');
        if (versionsRes.ok) {
          state.versions = await versionsRes.json();
          state.serverAvailable = true;
        }
      } catch (_) {
        // Server unreachable — version list stays empty
      }

      // 5. Load first available version
      if (state.versions.length > 0) {
        state.activeVersionId = state.versions[0].id;
        try {
          var vRes = await fetch('/data/versions/' + state.activeVersionId + '.json');
          if (vRes.ok) {
            state.activeVersion = await vRes.json();
            state.activeVersion = migrateToV2(state.activeVersion);
          }
        } catch (_) {
          state.activeVersion = null;
        }
      }

      // Auto-save migrated data as v2
      if (needsMigration) {
        saveBase();
        if (state.activeVersion) save();
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
   * Fetches the version config from the server.
   *
   * @param {string} id
   */
  async function setActiveVersion(id) {
    if (id === state.activeVersionId && state.activeVersion) {
      return; // Already active
    }

    state.activeVersionId = id;

    try {
      var res = await fetch('/data/versions/' + id + '.json');
      if (!res.ok) {
        throw new Error('Version "' + id + '" not found');
      }
      state.activeVersion = await res.json();
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
   * Internal helper: persist content to a file path via POST /api/save.
   * Falls back to Blob download if the server is unreachable.
   *
   * @param {string} path     — file path, e.g. "data/cv.json"
   * @param {*}      content  — JSON-serializable content
   * @returns {Promise<boolean>}  — true if saved to server; false if fallback was used
   */
  async function saveToServer(path, content) {
    if (!content) return false;

    var payload = { path: path, content: content };

    try {
      var res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        dispatch('GreedevCV:saved', { source: 'server' });
        return true;
      }

      throw new Error('Server responded with ' + res.status);
    } catch (_) {
      // Fallback: trigger a Blob download
      var blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = path.split('/').pop() || 'export.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      dispatch('GreedevCV:saved', { source: 'local' });
      return false;
    }
  }

  /**
   * Delete a version file from the server via DELETE /api/save.
   * Silently fails if the server is unreachable (memory-only delete).
   *
   * @param {string} id  — version ID (maps to data/versions/{id}.json)
   */
  async function deleteVersionFile(id) {
    if (!state.serverAvailable) return;
    var payload = { path: 'data/versions/' + id + '.json' };
    try {
      var res = await fetch('/api/save', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn('Server delete failed (' + res.status + ') — version file may remain on disk');
      }
    } catch (_) {
      // Server unreachable — version removed from memory only
    }
  }

  /**
   * Save the active version to the server via POST /api/save.
   * Delegates to saveToServer with the version file path.
   *
   * @returns {Promise<boolean>}  — true if saved to server; false if fallback was used
   */
  async function save() {
    if (!state.activeVersion) return false;
    return saveToServer('data/versions/' + state.activeVersion.id + '.json', state.activeVersion);
  }

  /**
   * Save the base pool to the server via POST /api/save.
   *
   * @returns {Promise<boolean>}  — true if saved to server; false if fallback was used
   */
  async function saveBase() {
    return saveToServer('data/cv.json', state.base);
  }

  /**
   * Create a new version from scratch, save it, and switch to it.
   *
   * @param {string} id
   * @param {string} label
   * @returns {string}  — the new version id
   */
  function newVersion(id, label) {
    var now = new Date().toISOString().slice(0, 10);

    var version = {
      $schema: 'greedev-version-1.0',
      id: id,
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
    };

    // Add to version list
    state.versions.push({
      id: id,
      label: label,
      created: now,
      updated: now,
    });

    // Switch to it
    state.activeVersionId = id;
    state.activeVersion = version;

    // Save immediately (fire-and-forget is fine — user can also click Save)
    save();

    emitChange();
    return id;
  }

  /**
   * Delete a version from the in-memory list and from the server file system.
   * Will not delete the last remaining version.
   *
   * @param {string} id
   * @returns {Promise<boolean>}  — true if deleted, false if blocked (last version)
   */
  async function deleteVersion(id) {
    if (state.versions.length <= 1) {
      return false;
    }

    // Delete the version file from server (silent if unreachable)
    await deleteVersionFile(id);

    state.versions = state.versions.filter(function (v) {
      return v.id !== id;
    });

    // If the active version was deleted, switch to the first remaining
    if (state.activeVersionId === id) {
      var next = state.versions[0];
      state.activeVersionId = next.id;
      state.activeVersion = null;

      // Load the next version config
      fetch('/data/versions/' + next.id + '.json')
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (v) {
          state.activeVersion = v;
          emitChange();
        });

      // Return early — emitChange happens after async load
      return true;
    }

    emitChange();
    return true;
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

  // ── duplicateVersion ────────────────────────────────────────────────

  /**
   * Deep-clone the active version (or the version identified by `id`)
   * with a new ID, "(copy)" label, and today's dates.  Adds it to the
   * version list, switches the active version, saves, and emits change.
   *
   * @param {string} [id]  — source version ID; defaults to active version
   * @returns {string|null}  — new version ID, or null on failure
   */
  function duplicateVersion(id) {
    var sourceId = id || state.activeVersionId;
    var source = state.activeVersion;

    if (!source || source.id !== sourceId) {
      dispatch('GreedevCV:error', { message: 'Cannot duplicate: source version not loaded' });
      return null;
    }

    var newId = generateId();
    var now = new Date().toISOString().slice(0, 10);

    // Deep clone
    var cloned = JSON.parse(JSON.stringify(source));
    cloned.id = newId;
    cloned.label = cloned.label + ' (copy)';
    cloned.created = now;
    cloned.updated = now;

    // Add manifest entry
    state.versions.push({
      id: newId,
      label: cloned.label,
      created: now,
      updated: now,
    });

    // Switch active version to the clone
    state.activeVersionId = newId;
    state.activeVersion = cloned;

    // Persist to server
    save();

    // Notify UI
    emitChange();

    return newId;
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
