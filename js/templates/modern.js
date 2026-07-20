// Greedev CV — Modern Template Module
// Self-registers with GreedevCV.Templates as "modern".
// 2-column layout: sidebar (photo, name, contact, skills) + main content.
// Invoked by the preview dispatcher via GreedevCV.Templates.get("modern")(data).

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  // ── Reuse translation maps from Harvard ───────────────────────────────
  var Harvard = window.GreedevCV.Templates && window.GreedevCV.Templates.Harvard;

  /** @type {Object<string, {en:string, es:string}>} */
  var HEADINGS = Harvard && Harvard.HEADINGS ? Harvard.HEADINGS : {
    'Professional Summary': { en: 'Professional Summary', es: 'Resumen Profesional' },
    'Experience':           { en: 'Experience',           es: 'Experiencia' },
    'Education':            { en: 'Education',            es: 'Educación' },
    'Skills':               { en: 'Skills',               es: 'Habilidades' },
    'Projects':             { en: 'Projects',             es: 'Proyectos' },
    ' in ':                 { en: ' in ',                 es: ' en ' },
  };

  /** @type {Object<string, {en:string, es:string}>} */
  var SKILL_CATEGORIES = Harvard && Harvard.SKILL_CATEGORIES ? Harvard.SKILL_CATEGORIES : {
    'Languages':  { en: 'Languages',  es: 'Lenguajes' },
    'Frameworks': { en: 'Frameworks', es: 'Frameworks' },
    'Tools':      { en: 'Tools',      es: 'Herramientas' },
    'Concepts':   { en: 'Concepts',   es: 'Conceptos' },
  };

  /**
   * Translate a heading string according to the given language.
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

  // ── Date helper ───────────────────────────────────────────────────────

  var MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /**
   * Convert "YYYY-MM" to readable date.
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

  // ── Contact builder (single-line for main header) ────────────────────

  /**
   * Build a compact contact line for the sidebar.
   *
   * @param {object} info
   * @returns {string}
   */
  function buildSidebarContact(info) {
    var parts = [];
    if (info.email)    parts.push(info.email);
    if (info.phone)    parts.push(info.phone);
    if (info.location) parts.push(info.location);
    if (info.website)  parts.push('<a class="md-contact-link" href="' + info.website + '" target="_blank" rel="noopener">' + info.website + '</a>');
    if (info.linkedin) parts.push('<a class="md-contact-link" href="' + info.linkedin + '" target="_blank" rel="noopener">LinkedIn</a>');
    if (info.github)   parts.push('<a class="md-contact-link" href="' + info.github + '" target="_blank" rel="noopener">GitHub</a>');
    return parts.join('<br>');
  }

  // ── Token helper for photo URL ────────────────────────────────────────

  /**
   * Build the photo URL with JWT token from localStorage.
   *
   * @returns {string}
   */
  function getPhotoUrl() {
    var token = '';
    try { token = localStorage.getItem('greedevcv-token') || ''; } catch (_) {}
    return '/api/cv/photo?token=' + encodeURIComponent(token);
  }

  // ── Template renderer ─────────────────────────────────────────────────

  /**
   * Render the Modern template into an HTML string.
   * Pure function — no DOM access, no side effects (except localStorage read for token).
   *
   * @param {object|null} data  — composed data from buildRenderData()
   *   { personalInfo, summary, sections, experiences, education,
   *     skills, projects, language }
   * @returns {string}  HTML string
   */
  function render(data) {
    if (!data) return '<div class="preview-empty">No CV data loaded</div>';

    var lang = data.language || 'en';
    var info = data.personalInfo || {};
    var html = '';

    // ── Layout wrapper ─────────────────────────────────────────────────
    html += '<div class="md-layout">';

    // ── Sidebar ────────────────────────────────────────────────────────
    html += '<aside class="md-sidebar">';

    // Photo
    if (info.photo) {
      html += '<div class="md-photo-wrapper">';
      html += '<img class="md-photo" src="' + getPhotoUrl() + '" alt="Photo">';
      html += '</div>';
    }

    // Name in sidebar
    html += '<h1 class="md-sidebar-name">' + (info.name || '') + '</h1>';

    // Contact
    html += '<div class="md-contact">';
    html += buildSidebarContact(info);
    html += '</div>';

    // Skills (as tags)
    if (data.sections.skills && data.skills.length > 0) {
      html += '<div class="md-sidebar-section">';
      html += '<h3 class="md-sidebar-heading">' + t('Skills', lang) + '</h3>';

      for (var si = 0; si < data.skills.length; si++) {
        var skill = data.skills[si];
        html += '<div class="md-skill-category">';
        html += '<h4 class="md-skill-category-name">' + t(skill.category, lang) + '</h4>';
        html += '<div class="md-skill-tags">';
        for (var sgi = 0; sgi < skill.items.length; sgi++) {
          html += '<span class="md-skill-tag">' + skill.items[sgi] + '</span>';
        }
        html += '</div>';
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</aside>'; // ── .md-sidebar

    // ── Main content ───────────────────────────────────────────────────
    html += '<main class="md-main">';

    // Language badge
    html += '<span class="preview-lang-badge">' + lang.toUpperCase() + '</span>';

    // Professional Summary
    if (data.sections.summary && data.summary) {
      html += '<section class="md-section">';
      html += '<h2 class="md-section-heading">' + t('Professional Summary', lang) + '</h2>';
      html += '<p class="md-summary">' + data.summary + '</p>';
      html += '</section>';
    }

    // Experience
    if (data.sections.experience && data.experiences.length > 0) {
      html += '<section class="md-section">';
      html += '<h2 class="md-section-heading">' + t('Experience', lang) + '</h2>';

      for (var ei = 0; ei < data.experiences.length; ei++) {
        var exp = data.experiences[ei];
        html += '<div class="md-entry">';
        html += '<div class="md-entry-header">';
        html += '<span class="md-entry-role">' + exp.role + '</span>';
        html += '<span class="md-entry-date">' + formatDate(exp.startDate) + ' — ' + formatDate(exp.endDate) + '</span>';
        html += '</div>';
        html += '<div class="md-entry-sub">' + exp.company;
        if (exp.location) html += ', ' + exp.location;
        html += '</div>';

        if (exp.bullets && exp.bullets.length > 0) {
          html += '<ul class="md-bullets">';
          for (var bi = 0; bi < exp.bullets.length; bi++) {
            html += '<li>' + exp.bullets[bi] + '</li>';
          }
          html += '</ul>';
        }
        html += '</div>';
      }

      html += '</section>';
    }

    // Education
    if (data.sections.education && data.education.length > 0) {
      html += '<section class="md-section">';
      html += '<h2 class="md-section-heading">' + t('Education', lang) + '</h2>';

      for (var edui = 0; edui < data.education.length; edui++) {
        var edu = data.education[edui];
        html += '<div class="md-entry">';
        html += '<div class="md-entry-header">';
        html += '<span class="md-entry-degree">' + edu.degree + t(' in ', lang) + edu.field + '</span>';
        html += '<span class="md-entry-date">' + formatDate(edu.startDate) + ' — ' + formatDate(edu.endDate) + '</span>';
        html += '</div>';
        html += '<div class="md-entry-sub">' + edu.institution + '</div>';
        html += '</div>';
      }

      html += '</section>';
    }

    // Projects
    if (data.sections.projects && data.projects.length > 0) {
      html += '<section class="md-section">';
      html += '<h2 class="md-section-heading">' + t('Projects', lang) + '</h2>';

      for (var pi = 0; pi < data.projects.length; pi++) {
        var proj = data.projects[pi];
        html += '<div class="md-entry">';
        html += '<div class="md-entry-header">';
        html += '<span class="md-entry-project-name">' + proj.name + '</span>';
        if (proj.url) {
          html += '<a class="md-entry-url" href="' + proj.url + '" target="_blank" rel="noopener">' + proj.url + '</a>';
        }
        html += '</div>';

        if (proj.description) {
          html += '<div class="md-entry-sub">' + proj.description + '</div>';
        }

        if (proj.bullets && proj.bullets.length > 0) {
          html += '<ul class="md-bullets">';
          for (var pbi = 0; pbi < proj.bullets.length; pbi++) {
            html += '<li>' + proj.bullets[pbi] + '</li>';
          }
          html += '</ul>';
        }
        html += '</div>';
      }

      html += '</section>';
    }

    html += '</main>'; // ── .md-main
    html += '</div>';  // ── .md-layout

    return html;
  }

  // ── Public API ────────────────────────────────────────────────────────

  window.GreedevCV.Templates.Modern = {
    render: render,
  };

  // Self-register as "modern" template
  window.GreedevCV.Templates.register('modern', render);
})();
