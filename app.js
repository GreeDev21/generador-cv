// Greedev CV — Application Orchestrator
// Boot sequence: DataStore.init() → Editor.init() → Preview.init()
// Handles version CRUD and server status indicator.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  // ── Auth helpers ─────────────────────────────────────────────────────

  var TOKEN_KEY = 'greedevcv-token';
  var USER_KEY = 'greedevcv-user';

  function getStoredUser() {
    try {
      var raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login.html';
  }

  /**
   * Set the app title to "<name> CV".
   */
  function updateAppTitle() {
    var user = getStoredUser();
    var titleEl = document.getElementById('app-title');
    if (titleEl) {
      titleEl.textContent = user && user.name ? (user.name + ' CV') : 'GreeDev CV';
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Show a temporary notification bar.
   *
   * @param {string} message
   * @param {'info'|'error'|'success'} type
   */
  function notify(message, type) {
    var el = document.getElementById('notification');
    if (!el) return;
    el.textContent = message;
    el.className = 'notification ' + (type || 'info');
    el.style.display = 'block';
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(function () {
      el.style.display = 'none';
    }, 4000);
  }

  /**
   * Populate the version selector <select>.
   */
  function populateVersionSelector() {
    var sel = document.getElementById('version-selector');
    if (!sel) return;

    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    var state = ds.getState();
    sel.innerHTML = '';

    (state.versions || []).forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.label;
      if (v.id === state.activeVersionId) {
        opt.selected = true;
      }
      sel.appendChild(opt);
    });
  }

  /**
   * Update the server status indicator.
   */
  function updateServerStatus() {
    var dot = document.getElementById('server-status');
    if (!dot) return;

    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    var state = ds.getState();
    dot.className = 'status-dot ' + (state.serverAvailable ? 'online' : 'offline');
    dot.title = state.serverAvailable ? 'Server online' : 'Server offline (download fallback)';
  }

  // ── Event handlers ──────────────────────────────────────────────────

  /**
   * Handle version selector change.
   */
  function onVersionChange(e) {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;
    ds.setActiveVersion(e.target.value);
  }

  /**
   * Handle Save button.
   */
  function onSave() {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    ds.save().then(function (ok) {
      if (ok) {
        notify('Version saved', 'success');
      } else {
        notify('Failed to save version', 'error');
      }
    });
  }

  /**
   * Handle New Version button.
   */
  async function onNewVersion() {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    var label = prompt('Enter a label for the new version:');
    if (!label) return; // cancelled

    await ds.newVersion(label);
    populateVersionSelector();
    notify('New version "' + label + '" created', 'success');
  }

  /**
   * Handle Duplicate button — delegates to DataStore.duplicateVersion().
   */
  async function onDuplicate() {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    var newId = await ds.duplicateVersion();
    if (newId) {
      populateVersionSelector();
      var state = ds.getState();
      notify('Version duplicated as "' + state.activeVersion.label + '"', 'success');
    }
  }

  /**
   * Handle Delete button.
   */
  async function onDelete() {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;

    var state = ds.getState();
    if (!state.activeVersion) return;

    if (!confirm('Delete version "' + state.activeVersion.label + '"?')) return;

    var deleted = await ds.deleteVersion(state.activeVersion.id);
    if (deleted) {
      populateVersionSelector();
      notify('Version deleted', 'info');
    } else {
      notify('Cannot delete the last version', 'error');
    }
  }

  // ── Draft restore handler ───────────────────────────────────────────

  /**
   * Handle GreedevCV:draft-found — show a Restore / Discard bar.
   */
  function onDraftFound(e) {
    var detail = e.detail;
    if (!detail || !detail.timestamp) return;

    var notification = document.getElementById('notification');
    if (!notification) return;

    // Keep the bar visible until the user acts
    clearTimeout(notification._hideTimer);

    var time = new Date(detail.timestamp).toLocaleString();
    notification.innerHTML = 'Unsaved changes from ' + time + '. ' +
      '<button class="btn draft-btn" id="draft-restore">Restore</button> ' +
      '<button class="btn draft-btn" id="draft-discard">Discard</button>';
    notification.className = 'notification info';
    notification.style.display = 'block';

    document.getElementById('draft-restore').addEventListener('click', function () {
      var ds = window.GreedevCV && window.GreedevCV.DataStore;
      if (ds) ds.restoreDraft();
      notification.style.display = 'none';
    });

    document.getElementById('draft-discard').addEventListener('click', function () {
      var ds = window.GreedevCV && window.GreedevCV.DataStore;
      if (ds) ds.discardDraft();
      notification.style.display = 'none';
    });
  }

  // ── Language toggle ──────────────────────────────────────────────────

  /**
   * Update the language toggle button active state from DataStore.
   */
  function updateLangToggle() {
    var ds = window.GreedevCV && window.GreedevCV.DataStore;
    if (!ds) return;
    var lang = ds.getLanguage();
    var langEn = document.getElementById('btn-lang-en');
    var langEs = document.getElementById('btn-lang-es');
    if (langEn) {
      langEn.classList.toggle('active', lang === 'en');
      langEn.setAttribute('aria-label', lang === 'en' ? 'Current: English' : 'Switch to English');
    }
    if (langEs) {
      langEs.classList.toggle('active', lang === 'es');
      langEs.setAttribute('aria-label', lang === 'es' ? 'Current: Spanish' : 'Switch to Spanish');
    }
  }

  // ── Data change handler ─────────────────────────────────────────────

  function onDataChange() {
    populateVersionSelector();
    updateServerStatus();
    updateLangToggle();
  }

  // ── Initialization ──────────────────────────────────────────────────

  var App = {
    /**
     * Boot the application.
     */
    async init() {
      console.log('Greedev CV initializing...');

      // Auth guard: redirect to login if no token
      var token = null;
      try { token = localStorage.getItem(TOKEN_KEY); } catch (_) {}
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      // Ensure we have user info in localStorage (backfill from API if missing)
      if (!getStoredUser()) {
        try {
          var meRes = await fetch('/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
          });
          if (meRes.ok) {
            var me = await meRes.json();
            localStorage.setItem(USER_KEY, JSON.stringify(me));
          }
        } catch (_) {}
      }

      // Update title with user's name
      updateAppTitle();

      // Wire UI controls
      var versionSel = document.getElementById('version-selector');
      if (versionSel) {
        versionSel.addEventListener('change', onVersionChange);
      }

      var saveBtn = document.getElementById('btn-save');
      if (saveBtn) saveBtn.addEventListener('click', onSave);

      var newBtn = document.getElementById('btn-new');
      if (newBtn) newBtn.addEventListener('click', onNewVersion);

      var dupBtn = document.getElementById('btn-duplicate');
      if (dupBtn) dupBtn.addEventListener('click', onDuplicate);

      var delBtn = document.getElementById('btn-delete');
      if (delBtn) delBtn.addEventListener('click', onDelete);

      var pdfBtn = document.getElementById('btn-pdf');
      if (pdfBtn) pdfBtn.addEventListener('click', function () {
        window.print();
      });

      // Logout button
      var logoutBtn = document.getElementById('btn-logout');
      if (logoutBtn) logoutBtn.addEventListener('click', logout);

      // Language toggle
      var langEn = document.getElementById('btn-lang-en');
      var langEs = document.getElementById('btn-lang-es');
      if (langEn) {
        langEn.addEventListener('click', function () {
          var ds = window.GreedevCV && window.GreedevCV.DataStore;
          if (ds) ds.setLanguage('en');
        });
      }
      if (langEs) {
        langEs.addEventListener('click', function () {
          var ds = window.GreedevCV && window.GreedevCV.DataStore;
          if (ds) ds.setLanguage('es');
        });
      }

      // Listen for data changes to keep UI in sync
      document.addEventListener('GreedevCV:datachange', onDataChange);

      // Listen for language change events to keep toggle in sync
      document.addEventListener('GreedevCV:languagechange', updateLangToggle);

      // Listen for localStorage draft restore prompt
      document.addEventListener('GreedevCV:draft-found', onDraftFound);

      try {
        // 1. Init DataStore — fetches cv.json + versions
        await window.GreedevCV.DataStore.init();

        // 2. Init Editor — renders forms in left panel
        var editorPanel = document.getElementById('editor-panel');
        if (editorPanel) {
          window.GreedevCV.Editor.init(editorPanel);
        }

        // 3. Init Preview — renders Harvard template in right panel
        var previewPanel = document.getElementById('preview-panel');
        if (previewPanel) {
          window.GreedevCV.Preview.init(previewPanel);
        }

        // 4. Populate version selector
        populateVersionSelector();
        updateServerStatus();

        console.log('Greedev CV initialized');
      } catch (err) {
        console.error('Init error:', err);
        var main = document.querySelector('#app main, .app-body');
        if (main) {
          main.innerHTML =
            '<div class="error-state">' +
            '<h2>Failed to load CV data</h2>' +
            '<p>' + err.message + '</p>' +
            '</div>';
        }
      }
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    App.init();
  });
})();
