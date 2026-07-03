// Greedev CV — Preview Module
// Harvard template renderer. Subscribes to GreedevCV:datachange and re-renders
// the merged CV data as a formatted résumé in the preview panel.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /** @type {HTMLElement|null} */
  var container = null;

  /** @type {number|null} */
  var debounceTimer = null;

  // ── Translation map for template headings ────────────────────────────
  var HEADINGS = {
    'Professional Summary': { en: 'Professional Summary', es: 'Resumen Profesional' },
    'Experience':           { en: 'Experience',           es: 'Experiencia' },
    'Education':            { en: 'Education',            es: 'Educación' },
    'Skills':               { en: 'Skills',               es: 'Habilidades' },
    'Projects':             { en: 'Projects',             es: 'Proyectos' },
    ' in ':                 { en: ' in ',                 es: ' en ' },
  };

  // Translation map for skill categories (display labels stay in sync with language)
  var SKILL_CATEGORIES = {
    'Languages':  { en: 'Languages',  es: 'Lenguajes' },
    'Frameworks': { en: 'Frameworks', es: 'Frameworks' },
    'Tools':      { en: 'Tools',      es: 'Herramientas' },
    'Concepts':   { en: 'Concepts',   es: 'Conceptos' },
  };

  /**
   * Translate a heading string according to the current language.
   * Falls back to the original string if no translation is found.
   *
   * @param {string} key
   * @param {string} lang
   * @returns {string}
   */
  function t(key, lang) {
    var entry = HEADINGS[key] || SKILL_CATEGORIES[key];
    if (entry && entry[lang]) return entry[lang];
    return key;
  }

  // ── Last known detail (base + version) for debounced re-render ──────
  var lastBase = null;
  var lastVersion = null;
  var currentLanguage = 'en';

  // ── Date helpers ────────────────────────────────────────────────────

  var MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /**
   * Convert "YYYY-MM" to readable date (e.g. "2025-01" → "Jan 2025").
   * null or undefined → "Present".
   *
   * @param {string|null} dateStr
   * @returns {string}
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'Present';
    var parts = dateStr.split('-');
    if (parts.length < 2) return dateStr;
    var year = parts[0];
    var month = parseInt(parts[1], 10);
    return MONTHS[month - 1] + ' ' + year;
  }

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
    };
  }

  // ── Contact line builder ────────────────────────────────────────────

  /**
   * Build a pipe-separated contact line from personal info fields.
   *
   * @param {object} info
   * @returns {string}
   */
  function buildContactLine(info) {
    var parts = [];
    if (info.email)   parts.push(info.email);
    if (info.phone)   parts.push(info.phone);
    if (info.location) parts.push(info.location);
    if (info.website) parts.push(info.website);
    if (info.linkedin) parts.push(info.linkedin);
    if (info.github)  parts.push(info.github);
    return parts.join(' &nbsp;|&nbsp; ');
  }

  // ── Template renderer ───────────────────────────────────────────────

  /**
   * Render the Harvard template into the preview container.
   *
   * @param {object|null} data  — composed data from buildRenderData()
   */
  function renderPreview(data) {
    if (!container) return;

    if (!data) {
      container.innerHTML = '<div class="preview-empty">No CV data loaded</div>';
      return;
    }

    var html = '';

    // ── Header ──────────────────────────────────────────────────────
    html += '<div class="preview-header">';
    html += '<h1 class="preview-name">' + data.personalInfo.name + '</h1>';
    html += '<p class="preview-contact">' + buildContactLine(data.personalInfo) + '</p>';
    html += '<span class="preview-lang-badge">' + currentLanguage.toUpperCase() + '</span>';
    html += '</div>';

    // ── Professional Summary ────────────────────────────────────────
    if (data.sections.summary && data.summary) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Professional Summary', currentLanguage) + '</h2>';
      html += '<p class="preview-summary">' + data.summary + '</p>';
      html += '</div>';
    }

    // ── Experience ──────────────────────────────────────────────────
    if (data.sections.experience && data.experiences.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Experience', currentLanguage) + '</h2>';

      for (var ei = 0; ei < data.experiences.length; ei++) {
        var exp = data.experiences[ei];
        html += '<div class="preview-entry">';
        html += '<div class="preview-entry-header">';
        html += '<span class="preview-entry-role">' + exp.role + '</span>';
        html += '<span class="preview-entry-date">' + formatDate(exp.startDate) + ' — ' + formatDate(exp.endDate) + '</span>';
        html += '</div>';
        html += '<div class="preview-entry-sub">';
        html += exp.company;
        if (exp.location) html += ', ' + exp.location;
        html += '</div>';

        if (exp.bullets && exp.bullets.length > 0) {
          html += '<ul class="preview-bullets">';
          for (var bi = 0; bi < exp.bullets.length; bi++) {
            html += '<li>' + exp.bullets[bi] + '</li>';
          }
          html += '</ul>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    // ── Education ───────────────────────────────────────────────────
    if (data.sections.education && data.education.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Education', currentLanguage) + '</h2>';

      for (var edui = 0; edui < data.education.length; edui++) {
        var edu = data.education[edui];
        html += '<div class="preview-entry">';
        html += '<div class="preview-entry-header">';
        html += '<span class="preview-entry-degree">' + edu.degree + t(' in ', currentLanguage) + edu.field + '</span>';
        html += '<span class="preview-entry-date">' + formatDate(edu.startDate) + ' — ' + formatDate(edu.endDate) + '</span>';
        html += '</div>';
        html += '<div class="preview-entry-sub">' + edu.institution + '</div>';
        html += '</div>';
      }

      html += '</div>';
    }

    // ── Skills ──────────────────────────────────────────────────────
    if (data.sections.skills && data.skills.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Skills', currentLanguage) + '</h2>';

      for (var si = 0; si < data.skills.length; si++) {
        var skill = data.skills[si];
        html += '<div class="preview-skill-line">';
        html += '<span class="preview-skill-category">' + t(skill.category, currentLanguage) + ':</span> ';
        html += skill.items.join(', ');
        html += '</div>';
      }

      html += '</div>';
    }

    // ── Projects ────────────────────────────────────────────────────
    if (data.sections.projects && data.projects.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Projects', currentLanguage) + '</h2>';

      for (var pi = 0; pi < data.projects.length; pi++) {
        var proj = data.projects[pi];
        html += '<div class="preview-entry">';
        html += '<div class="preview-entry-header">';
        html += '<span class="preview-entry-project">' + proj.name + '</span>';
        if (proj.url) {
          html += '<a class="preview-entry-url" href="' + proj.url + '" target="_blank" rel="noopener">' + proj.url + '</a>';
        }
        html += '</div>';

        if (proj.description) {
          html += '<div class="preview-entry-sub">' + proj.description + '</div>';
        }

        if (proj.bullets && proj.bullets.length > 0) {
          html += '<ul class="preview-bullets">';
          for (var pbi = 0; pbi < proj.bullets.length; pbi++) {
            html += '<li>' + proj.bullets[pbi] + '</li>';
          }
          html += '</ul>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    container.innerHTML = html;
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
      renderPreview(data);
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
      renderPreview(data);
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
          renderPreview(data);
        }
      }
    },

    /**
     * Render from raw composed data (used for testing or manual updates).
     *
     * @param {object} data  — composed render data (buildRenderData output)
     */
    render: function (data) {
      renderPreview(data);
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
