// Greedev CV — Harvard Template Module
// Pluggable template renderer extracted from preview.js (PR1).
// Self-registers with GreedevCV.Templates as "harvard".
// Invoked by the preview dispatcher (PR2+) via GreedevCV.Templates.get("harvard")(data).

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

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
   * Translate a heading string according to the given language.
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

  // ── Date helpers ────────────────────────────────────────────────────

  var MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /**
   * Convert "YYYY-MM" to readable date (e.g. "2025-01" -> "Jan 2025").
   * null or undefined -> "Present".
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
   * Render the Harvard template into an HTML string.
   * Pure function — no DOM access, no side effects.
   *
   * @param {object|null} data  — composed data from buildRenderData()
   *   { personalInfo, summary, sections, experiences, education,
   *     skills, projects, language }
   * @returns {string}  HTML string
   */
  function render(data) {
    if (!data) return '<div class="preview-empty">No CV data loaded</div>';

    var lang = data.language || 'en';
    var html = '';

    // ── Header ──────────────────────────────────────────────────────
    html += '<div class="preview-header">';
    html += '<h1 class="preview-name">' + data.personalInfo.name + '</h1>';
    html += '<p class="preview-contact">' + buildContactLine(data.personalInfo) + '</p>';
    html += '<span class="preview-lang-badge">' + lang.toUpperCase() + '</span>';
    html += '</div>';

    // ── Professional Summary ────────────────────────────────────────
    if (data.sections.summary && data.summary) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Professional Summary', lang) + '</h2>';
      html += '<p class="preview-summary">' + data.summary + '</p>';
      html += '</div>';
    }

    // ── Experience ──────────────────────────────────────────────────
    if (data.sections.experience && data.experiences.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Experience', lang) + '</h2>';

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
      html += '<h2 class="preview-section-heading">' + t('Education', lang) + '</h2>';

      for (var edui = 0; edui < data.education.length; edui++) {
        var edu = data.education[edui];
        html += '<div class="preview-entry">';
        html += '<div class="preview-entry-header">';
        html += '<span class="preview-entry-degree">' + edu.degree + t(' in ', lang) + edu.field + '</span>';
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
      html += '<h2 class="preview-section-heading">' + t('Skills', lang) + '</h2>';

      for (var si = 0; si < data.skills.length; si++) {
        var skill = data.skills[si];
        html += '<div class="preview-skill-line">';
        html += '<span class="preview-skill-category">' + t(skill.category, lang) + ':</span> ';
        html += skill.items.join(', ');
        html += '</div>';
      }

      html += '</div>';
    }

    // ── Projects ────────────────────────────────────────────────────
    if (data.sections.projects && data.projects.length > 0) {
      html += '<div class="preview-section">';
      html += '<h2 class="preview-section-heading">' + t('Projects', lang) + '</h2>';

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

    return html;
  }

  // ── Public API ──────────────────────────────────────────────────────

  window.GreedevCV.Templates.Harvard = {
    render: render,
  };

  // Self-register as "harvard" template
  window.GreedevCV.Templates.register('harvard', render);
})();
