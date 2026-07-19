// Greedev CV — Preview Module
// Preview dispatcher: resolves the active template from versionConfig,
// delegates render() to the template, and inserts the returned HTML.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /** @type {HTMLElement|null} */
  var container = null;

  /** @type {number|null} */
  var debounceTimer = null;

  // ── Last known detail (base + version) for debounced re-render ──────
  var lastBase = null;
  var lastVersion = null;
  var currentLanguage = 'en';

  // ── Language-aware field resolution ─────────────────────────────────

  /**
   * Resolve a field value for the given language.
   * If field is a plain string (non-translatable), return it as-is.
   * If field is { en, es } object, return the language value.
   *
   * @param {*} field
   * @param {string} lang
   * @returns {string}
   */
  function resolveField(field, lang) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] !== undefined ? field[lang] : (field.en || '');
  }

  // ── Data composition ────────────────────────────────────────────────

  /**
   * Merge base pool + version config into the shape the template needs.
   * Accepts an optional language parameter (default "en") for bilingual fields.
   * Returns null when data is not ready.
   *
   * @param {object|null} base
   * @param {object|null} version
   * @param {string}     [language]  — "en" or "es", defaults to "en"
   * @returns {object|null}
   */
  function buildRenderData(base, version, language) {
    if (!base || !version) return null;
    language = language || 'en';

    // Resolve a translatable string or return plain string unchanged
    var $ = function (field) { return resolveField(field, language); };

    // Experience entries — filtered by selected IDs, bullets overridden
    // by version.experienceBullets when present
    var experiences = (base.experiences || [])
      .filter(function (exp) {
        return version.selectedExperiences.indexOf(exp.id) !== -1;
      })
      .map(function (exp) {
        var bullets = (version.experienceBullets && version.experienceBullets[exp.id])
          ? version.experienceBullets[exp.id]
          : exp.bullets;
        return {
          id: exp.id,
          company: exp.company,
          role: $(exp.role),
          location: $(exp.location),
          startDate: exp.startDate,
          endDate: exp.endDate,
          bullets: (bullets || []).map(function (b) { return $(b); }),
        };
      });

    // Education entries — filtered by selected IDs
    var education = (base.education || [])
      .filter(function (edu) {
        return version.selectedEducation.indexOf(edu.id) !== -1;
      })
      .map(function (edu) {
        return {
          id: edu.id,
          institution: edu.institution,
          degree: $(edu.degree),
          field: $(edu.field),
          startDate: edu.startDate,
          endDate: edu.endDate,
          current: edu.current,
          gpa: edu.gpa,
          achievements: (edu.achievements || []).map(function (a) { return $(a); }),
        };
      });

    // Skills — filtered by selected categories
    var skills = (base.skills || [])
      .filter(function (skill) {
        return version.selectedSkills.indexOf(skill.category) !== -1;
      });

    // Projects — filtered by selected IDs
    var projects = (base.projects || [])
      .filter(function (proj) {
        return version.selectedProjects.indexOf(proj.id) !== -1;
      })
      .map(function (proj) {
        return {
          id: proj.id,
          name: $(proj.name),
          description: $(proj.description),
          url: proj.url,
          technologies: proj.technologies,
          bullets: (proj.bullets || []).map(function (b) { return $(b); }),
        };
      });

    return {
      personalInfo: base.personalInfo || {},
      summary: $(function () {
        var vs = version.summary;
        // If version summary exists but both languages are empty, fall through to base
        if (vs && typeof vs === 'object') {
          if (vs.en || vs.es) return vs;
        } else if (vs) {
          return vs;
        }
        return base.summary || '';
      }()),
      sections: version.sections || {},
      experiences: experiences,
      education: education,
      skills: skills,
      projects: projects,
      language: language,
    };
  }

  // ── Preview Dispatcher ──────────────────────────────────────────────

  /**
   * Resolve the active template from versionConfig and render into container.
   * Falls back to "harvard" with console.warn if template is unknown.
   *
   * @param {object|null} data  — composed data from buildRenderData()
   */
  function resolveAndRender(data) {
    if (!container) return;

    if (!data) {
      container.innerHTML = '<div class="preview-empty">No CV data loaded</div>';
      return;
    }

    var templateName = (lastVersion && lastVersion.template) || 'harvard';
    var templates = window.GreedevCV.Templates;
    var renderFn = templates && templates.get(templateName);

    if (typeof renderFn !== 'function') {
      console.warn('Template "' + templateName + '" not found. Falling back to "harvard".');
      renderFn = templates && templates.get('harvard');
    }

    if (typeof renderFn !== 'function') {
      container.innerHTML = '<div class="preview-empty">Template renderer not available</div>';
      return;
    }

    container.innerHTML = renderFn(data);
  }

  // ── Event handlers ──────────────────────────────────────────────────

  /**
   * Handle a GreedevCV:datachange event.
   */
  function handleDataChange(e) {
    var detail = e.detail;
    lastBase = detail.base;
    lastVersion = detail.version;
    currentLanguage = detail.language || 'en';

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var data = buildRenderData(lastBase, lastVersion, currentLanguage);
      resolveAndRender(data);
    }, 100);
  }

  /**
   * Handle a GreedevCV:languagechange event — re-render without data mutation.
   */
  function handleLanguageChange(e) {
    currentLanguage = (e.detail && e.detail.language) || 'en';
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var data = buildRenderData(lastBase, lastVersion, currentLanguage);
      resolveAndRender(data);
    }, 100);
  }

  // ── Public API ──────────────────────────────────────────────────────

  window.GreedevCV.Preview = {
    /**
     * Set up the preview container and subscribe to data changes.
     *
     * @param {HTMLElement} containerEl
     */
    init: function (containerEl) {
      container = containerEl;

      document.addEventListener('GreedevCV:datachange', handleDataChange);
      document.addEventListener('GreedevCV:languagechange', handleLanguageChange);

      // If DataStore already has state, render immediately
      var ds = window.GreedevCV && window.GreedevCV.DataStore;
      if (ds) {
        var state = ds.getState();
        if (state.base && state.activeVersion) {
          lastBase = state.base;
          lastVersion = state.activeVersion;
          currentLanguage = ds.getLanguage();
          var data = buildRenderData(state.base, state.activeVersion, currentLanguage);
          resolveAndRender(data);
        }
      }
    },

    /**
     * Render from raw composed data (used for testing or manual updates).
     *
     * @param {object} data  — composed render data (buildRenderData output)
     */
    render: function (data) {
      resolveAndRender(data);
    },

    /**
     * Remove event listeners and clean up.
     */
    destroy: function () {
      document.removeEventListener('GreedevCV:datachange', handleDataChange);
      document.removeEventListener('GreedevCV:languagechange', handleLanguageChange);
      if (debounceTimer) clearTimeout(debounceTimer);
      container = null;
    },
  };
})();
