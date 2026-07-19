// Greedev CV — Editor Module
// Form-based editor for all CV sections. Mutates state through DataStore.
// Subscribes to GreedevCV:datachange and re-renders when toggles/selections change.

window.GreedevCV = window.GreedevCV || {};

(function () {
  'use strict';

  /** @type {HTMLElement|null} */
  var container = null;

  /** @type {object|null} */
  var currentBase = null;

  /** @type {object|null} */
  var currentVersion = null;

  // ── Inline form helpers ─────────────────────────────────────────────

  /**
   * Show an inline error message for a form field.
   *
   * @param {HTMLElement} form     — the inline-form container
   * @param {string}      name     — the field name attribute
   * @param {string}      message  — error text
   */
  function showInlineError(form, name, message) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) return;
    var errorEl = field.parentNode.querySelector('.inline-form-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  /**
   * Clear all visible inline errors inside a form.
   *
   * @param {HTMLElement} form
   */
  function clearInlineErrors(form) {
    var errors = form.querySelectorAll('.inline-form-error.visible');
    for (var i = 0; i < errors.length; i++) {
      errors[i].classList.remove('visible');
      errors[i].textContent = '';
    }
  }

  /**
   * Reset all inputs, checkboxes, and selects inside an inline form,
   * clear validation errors, and close it.
   *
   * @param {HTMLElement} form
   */
  function resetInlineForm(form) {
    var inputs = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      if (el.type === 'checkbox') {
        el.checked = false;
        el.disabled = false;
      } else if (el.type === 'select-one') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    }
    clearInlineErrors(form);
    form.classList.remove('open');
  }

  // ── Paths that are arrays in the version config ─────────────────────
  var ARRAY_PATHS = [
    'selectedExperiences',
    'selectedEducation',
    'selectedSkills',
    'selectedProjects',
  ];

  // ── Event handler ───────────────────────────────────────────────────

  /**
   * Generic change handler via event delegation.
   * Reads data-store and data-path from the target element.
   */
  function handleChange(e) {
    var target = e.target;

    // Handle inline-form "current" checkbox toggle (disable endDate when checked)
    if (target.getAttribute('data-current') !== null) {
      var form = target.closest('.inline-form');
      if (form) {
        var endDateInput = form.querySelector('[name="endDate"]');
        if (endDateInput) {
          if (target.checked) {
            endDateInput.value = '';
            endDateInput.disabled = true;
          } else {
            endDateInput.disabled = false;
          }
        }
      }
      return;
    }

    var store = target.getAttribute('data-store');
    var path  = target.getAttribute('data-path');
    var lang  = target.getAttribute('data-lang');

    // Bullet textareas are handled separately
    if (target.getAttribute('data-bullet-for')) {
      handleBulletChange(target);
      return;
    }

    if (!store || !path) return;

    // For bilingual fields, append language suffix to path
    // so setNested writes to the correct sub-property (e.g. "summary.en")
    if (lang) {
      path = path + '.' + lang;
    }

    var ds = window.GreedevCV.DataStore;
    if (!ds) return;

    var value;

    if (target.type === 'checkbox') {
      if (ARRAY_PATHS.indexOf(path) !== -1) {
        // Array field (selectedExperiences, selectedEducation, etc.)
        var currentState = ds.getState();
        var source = store === 'version' ? currentState.activeVersion : currentState.base;
        var current = source && source[path] ? source[path].slice() : [];
        var itemValue = target.value || target.getAttribute('data-value') || '';

        if (target.checked) {
          if (current.indexOf(itemValue) === -1) {
            current.push(itemValue);
          }
        } else {
          var idx = current.indexOf(itemValue);
          if (idx !== -1) {
            current.splice(idx, 1);
          }
        }
        value = current;
      } else {
        // Boolean toggle (sections.*)
        value = target.checked;
      }
    } else {
      value = target.value;
    }

    if (store === 'base') {
      ds.updateBase(path, value);
    } else {
      ds.updateVersion(path, value);
    }
  }

  /**
   * Handle a click on toggle buttons (bullet editor expansion, add/remove bullets).
   */
  function handleClick(e) {
    var target = e.target;

    // ── Bullet editor toggle ────────────────────────────────────────
    if (target.classList.contains('bullet-toggle')) {
      var expId = target.getAttribute('data-exp');
      if (!expId) return;
      var editor = container.querySelector('.bullet-editor[data-exp="' + expId + '"]');
      if (editor) {
        editor.classList.toggle('open');
        target.textContent = editor.classList.contains('open') ? '✎' : '✎';
      }
      return;
    }

    // ── Add bullet ──────────────────────────────────────────────────
    if (target.classList.contains('add-bullet')) {
      var expIdAdd = target.getAttribute('data-exp');
      if (!expIdAdd) return;

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;

      var currentState = ds.getState();
      var version = currentState.activeVersion;
      var currentBullets = (version && version.experienceBullets && version.experienceBullets[expIdAdd])
        ? version.experienceBullets[expIdAdd].slice()
        : getBaseBullets(expIdAdd).slice();

      currentBullets.push({ en: '', es: '' });
      ds.updateVersion('experienceBullets.' + expIdAdd, currentBullets);
      return;
    }

    // ── Remove bullet ───────────────────────────────────────────────
    if (target.classList.contains('remove-bullet')) {
      var bulletFor = target.getAttribute('data-bullet-for');
      var bulletIdx = parseInt(target.getAttribute('data-bullet-index'), 10);
      if (!bulletFor || isNaN(bulletIdx)) return;

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;

      var currentState = ds.getState();
      var version = currentState.activeVersion;
      var bullets = (version && version.experienceBullets && version.experienceBullets[bulletFor])
        ? version.experienceBullets[bulletFor].slice()
        : getBaseBullets(bulletFor).slice();

      bullets.splice(bulletIdx, 1);
      ds.updateVersion('experienceBullets.' + bulletFor, bullets);
      return;
    }

    // ── Delete item: experience / education / skill-category / skill-item ─
    if (target.classList.contains('delete-btn') || target.classList.contains('delete-item-btn')) {
      var delType = target.getAttribute('data-type');
      var delId = target.getAttribute('data-id');
      if (!delType || !delId) return;

      if (delType === 'experience' || delType === 'education' || delType === 'skill-category') {
        var label = target.closest('.editor-selector-item').querySelector('span').textContent.trim();
        if (!confirm('Delete "' + label + '"?')) return;
      }

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();

      if (delType === 'experience') {
        // Remove from base pool
        var exps = (state.base.experiences || []).filter(function (e) { return e.id !== delId; });
        ds.updateBase('experiences', exps);
        // Remove from version selections
        var selExps = (state.version.selectedExperiences || []).filter(function (id) { return id !== delId; });
        ds.updateVersion('selectedExperiences', selExps);
        ds.saveBase();
        return;
      }

      if (delType === 'education') {
        var edus = (state.base.education || []).filter(function (e) { return e.id !== delId; });
        ds.updateBase('education', edus);
        var selEdus = (state.version.selectedEducation || []).filter(function (id) { return id !== delId; });
        ds.updateVersion('selectedEducation', selEdus);
        ds.saveBase();
        return;
      }

      if (delType === 'skill-category') {
        var catName = '';
        var skills = state.base.skills || [];
        for (var sc = 0; sc < skills.length; sc++) {
          if (skills[sc].id === delId) { catName = skills[sc].category; break; }
        }
        var filtered = skills.filter(function (s) { return s.id !== delId; });
        ds.updateBase('skills', filtered);
        if (catName) {
          var selSkills = (state.version.selectedSkills || []).filter(function (c) { return c !== catName; });
          ds.updateVersion('selectedSkills', selSkills);
        }
        ds.saveBase();
        return;
      }

      if (delType === 'skill-item') {
        var itemName = target.getAttribute('data-item');
        if (!itemName) return;
        if (!confirm('Remove "' + itemName + '" from category?')) return;
        var skillsCopy = (state.base.skills || []).slice();
        for (var si2 = 0; si2 < skillsCopy.length; si2++) {
          if (skillsCopy[si2].id === delId) {
            skillsCopy[si2].items = skillsCopy[si2].items.filter(function (it) { return it !== itemName; });
            break;
          }
        }
        ds.updateBase('skills', skillsCopy);
        ds.saveBase();
        return;
      }

      return;
    }

    // ── Inline form: toggle ────────────────────────────────────────────
    if (target.classList.contains('inline-form-toggle')) {
      var section = target.getAttribute('data-section');
      var form = container.querySelector('.inline-form[data-section="' + section + '"]');
      if (form) {
        form.classList.toggle('open');
      }
      return;
    }

    // ── Inline form: cancel ────────────────────────────────────────────
    if (target.classList.contains('inline-form-cancel')) {
      var section = target.getAttribute('data-section');
      var form = container.querySelector('.inline-form[data-section="' + section + '"]');
      if (form) {
        resetInlineForm(form);
      }
      return;
    }

    // ── Inline form: submit — Skills: add item to category ─────────────
    if (target.classList.contains('inline-form-submit') && target.getAttribute('data-section') === 'skills-add-item') {
      var form = target.closest('.inline-form');
      if (!form) return;
      clearInlineErrors(form);

      var categorySelect = form.querySelector('[name="category"]');
      var itemInput = form.querySelector('[name="item"]');
      var category = categorySelect ? categorySelect.value : '';
      var item = itemInput ? itemInput.value.trim() : '';

      if (!item) {
        showInlineError(form, 'item', 'Item name is required');
        return;
      }

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();
      var skills = state.base.skills.slice();
      for (var si = 0; si < skills.length; si++) {
        if (skills[si].category === category) {
          skills[si].items = skills[si].items.slice().concat([item]);
          break;
        }
      }
      ds.updateBase('skills', skills);
      ds.saveBase();
      resetInlineForm(form);
      return;
    }

    // ── Inline form: submit — Skills: new category ─────────────────────
    if (target.classList.contains('inline-form-submit') && target.getAttribute('data-section') === 'skills-new-cat') {
      var form = target.closest('.inline-form');
      if (!form) return;
      clearInlineErrors(form);

      var catInput = form.querySelector('[name="categoryName"]');
      var itemsInput = form.querySelector('[name="items"]');
      var categoryName = catInput ? catInput.value.trim() : '';
      var itemsStr = itemsInput ? itemsInput.value.trim() : '';

      if (!categoryName) {
        showInlineError(form, 'categoryName', 'Category name is required');
        return;
      }
      if (!itemsStr) {
        showInlineError(form, 'items', 'At least one item is required');
        return;
      }

      var items = itemsStr.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      if (items.length === 0) {
        showInlineError(form, 'items', 'At least one item is required');
        return;
      }

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();
      var id = ds.generateId();
      var newSkill = { id: id, category: categoryName, items: items };
      var skills = state.base.skills.slice();
      skills.push(newSkill);
      ds.updateBase('skills', skills);

      var selectedSkills = (state.version.selectedSkills || []).slice();
      selectedSkills.push(categoryName);
      ds.updateVersion('selectedSkills', selectedSkills);
      ds.saveBase();
      resetInlineForm(form);
      return;
    }

    // ── Inline form: submit — Experience ───────────────────────────────
    if (target.classList.contains('inline-form-submit') && target.getAttribute('data-section') === 'experience') {
      var form = target.closest('.inline-form');
      if (!form) return;
      clearInlineErrors(form);

      var company = form.querySelector('[name="company"]').value.trim();
      var role = form.querySelector('[name="role"]').value.trim();
      var location = form.querySelector('[name="location"]').value.trim();
      var startDate = form.querySelector('[name="startDate"]').value.trim();
      var endDateInput = form.querySelector('[name="endDate"]');
      var currentChk = form.querySelector('[name="current"]');
      var bulletsTA = form.querySelector('[name="bullets"]');

      var valid = true;
      if (!company) { showInlineError(form, 'company', 'Company is required'); valid = false; }
      if (!role) { showInlineError(form, 'role', 'Role is required'); valid = false; }
      if (!startDate) { showInlineError(form, 'startDate', 'Start date is required'); valid = false; }
      if (!valid) return;

      var isCurrent = currentChk ? currentChk.checked : false;
      var endDate = isCurrent ? null : (endDateInput.value.trim() || null);
      var bullets = bulletsTA && bulletsTA.value ? bulletsTA.value.split('\n').map(function (b) { return b.trim(); }).filter(Boolean) : [];

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();
      var id = ds.generateId();
      var newExp = {
        id: id,
        company: company,
        role: { en: role, es: role },
        location: location ? { en: location, es: location } : '',
        startDate: startDate,
        endDate: endDate,
        current: isCurrent,
        bullets: bullets.length > 0 ? bullets.map(function (b) { return { en: b, es: b }; }) : [],
      };

      var experiences = state.base.experiences.slice();
      experiences.push(newExp);
      ds.updateBase('experiences', experiences);

      var selected = (state.version.selectedExperiences || []).slice();
      selected.push(id);
      ds.updateVersion('selectedExperiences', selected);
      ds.saveBase();
      resetInlineForm(form);
      return;
    }

    // ── Inline form: submit — Education ────────────────────────────────
    if (target.classList.contains('inline-form-submit') && target.getAttribute('data-section') === 'education') {
      var form = target.closest('.inline-form');
      if (!form) return;
      clearInlineErrors(form);

      var institution = form.querySelector('[name="institution"]').value.trim();
      var degree = form.querySelector('[name="degree"]').value.trim();
      var field = form.querySelector('[name="field"]').value.trim();
      var startDate = form.querySelector('[name="startDate"]').value.trim();
      var endDateInput = form.querySelector('[name="endDate"]');
      var gpaInput = form.querySelector('[name="gpa"]');
      var currentChk = form.querySelector('[name="current"]');

      var valid = true;
      if (!institution) { showInlineError(form, 'institution', 'Institution is required'); valid = false; }
      if (!degree) { showInlineError(form, 'degree', 'Degree is required'); valid = false; }
      if (!field) { showInlineError(form, 'field', 'Field is required'); valid = false; }
      if (!startDate) { showInlineError(form, 'startDate', 'Start date is required'); valid = false; }
      if (!valid) return;

      var isCurrent = currentChk ? currentChk.checked : false;
      var endDate = isCurrent ? null : (endDateInput.value.trim() || null);
      var gpa = gpaInput ? gpaInput.value.trim() : '';

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();
      var id = ds.generateId();
      var newEdu = {
        id: id,
        institution: institution,
        degree: { en: degree, es: degree },
        field: { en: field, es: field },
        startDate: startDate,
        endDate: endDate,
        current: isCurrent,
        gpa: gpa,
        achievements: [],
      };

      var education = state.base.education.slice();
      education.push(newEdu);
      ds.updateBase('education', education);

      var selected = (state.version.selectedEducation || []).slice();
      selected.push(id);
      ds.updateVersion('selectedEducation', selected);
      ds.saveBase();
      resetInlineForm(form);
      return;
    }

    // ── Inline form: submit — Projects ─────────────────────────────────
    if (target.classList.contains('inline-form-submit') && target.getAttribute('data-section') === 'projects') {
      var form = target.closest('.inline-form');
      if (!form) return;
      clearInlineErrors(form);

      var name = form.querySelector('[name="name"]').value.trim();

      if (!name) {
        showInlineError(form, 'name', 'Project name is required');
        return;
      }

      var description = form.querySelector('[name="description"]').value.trim();
      var url = form.querySelector('[name="url"]').value.trim();
      var techStr = form.querySelector('[name="technologies"]').value.trim();
      var bulletsStr = form.querySelector('[name="bullets"]').value.trim();

      var technologies = techStr
        ? techStr.split(',').map(function (t) { return t.trim(); }).filter(Boolean)
        : [];
      var bullets = bulletsStr
        ? bulletsStr.split('\n').map(function (b) { return b.trim(); }).filter(Boolean)
        : [];

      var ds = window.GreedevCV.DataStore;
      if (!ds) return;
      var state = ds.getState();
      var id = ds.generateId();
      var newProj = {
        id: id,
        name: { en: name, es: name },
        description: description ? { en: description, es: description } : '',
        url: url,
        technologies: technologies,
        bullets: bullets.length > 0 ? bullets.map(function (b) { return { en: b, es: b }; }) : [],
      };

      var projects = state.base.projects.slice();
      projects.push(newProj);
      ds.updateBase('projects', projects);

      var selected = (state.version.selectedProjects || []).slice();
      selected.push(id);
      ds.updateVersion('selectedProjects', selected);
      ds.saveBase();
      resetInlineForm(form);
      return;
    }
  }

  /**
   * Handle a bullet textarea change (blur).
   * Collects all textareas for the same experience, groups by index + lang,
   * and saves as array of { en, es } objects.
   */
  function handleBulletChange(changedTextarea) {
    var expId = changedTextarea.getAttribute('data-bullet-for');
    if (!expId) return;

    var textareas = container.querySelectorAll(
      'textarea[data-bullet-for="' + expId + '"]'
    );

    // Group textareas by (bullet-index, lang)
    var bulletMap = {};
    for (var i = 0; i < textareas.length; i++) {
      var ta = textareas[i];
      var idx = ta.getAttribute('data-bullet-index');
      var lang = ta.getAttribute('data-lang');
      if (!bulletMap[idx]) bulletMap[idx] = {};
      bulletMap[idx][lang || 'en'] = ta.value;
    }

    // Build sorted array of { en, es } objects
    var bullets = [];
    var indices = Object.keys(bulletMap).sort(function (a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    });
    for (var j = 0; j < indices.length; j++) {
      var entry = bulletMap[indices[j]];
      bullets.push({ en: entry.en || '', es: entry.es || '' });
    }

    var ds = window.GreedevCV.DataStore;
    if (!ds) return;
    ds.updateVersion('experienceBullets.' + expId, bullets);
  }

  // ── Data helpers ────────────────────────────────────────────────────

  /**
   * Get base bullets for an experience by ID.
   *
   * @param {string} expId
   * @returns {string[]}
   */
  function getBaseBullets(expId) {
    if (!currentBase || !currentBase.experiences) return [];
    for (var i = 0; i < currentBase.experiences.length; i++) {
      if (currentBase.experiences[i].id === expId) {
        return currentBase.experiences[i].bullets || [];
      }
    }
    return [];
  }

  /**
   * Get bullets for display in the editor (custom or base).
   *
   * @param {string} expId
   * @returns {string[]}
   */
  function getBulletsForDisplay(expId) {
    if (
      currentVersion &&
      currentVersion.experienceBullets &&
      currentVersion.experienceBullets[expId] !== undefined
    ) {
      return currentVersion.experienceBullets[expId];
    }
    return getBaseBullets(expId);
  }

  /**
   * Check if a value exists in an array.
   *
   * @param {Array} arr
   * @param {*} val
   * @returns {boolean}
   */
  function includes(arr, val) {
    return arr && arr.indexOf(val) !== -1;
  }

  // ── Render ──────────────────────────────────────────────────────────

  /**
   * Build the editor HTML string from base + version data.
   *
   * @param {object|null} base
   * @param {object|null} version
   * @returns {string}
   */
  function buildEditorHtml(base, version) {
    if (!base || !version) {
      return '<div class="editor-empty">No data loaded. Start the server and refresh.</div>';
    }

    var info = base.personalInfo || {};
    var sections = version.sections || {};
    var html = '';

    // ── Version Settings ────────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Version Settings</h3>';
    html += '<label class="editor-field">';
    html += '<span class="editor-field-label">Template:</span>';
    html += '<select class="editor-input" data-store="version" data-path="template">';
    var templateNames = (window.GreedevCV.Templates && window.GreedevCV.Templates.list()) || [];
    var currentTemplate = version.template || 'harvard';
    for (var ti = 0; ti < templateNames.length; ti++) {
      html += '<option value="' + templateNames[ti] + '"' + (templateNames[ti] === currentTemplate ? ' selected' : '') + '>' + templateNames[ti] + '</option>';
    }
    html += '</select>';
    html += '</label>';
    html += '</section>';

    // ── Personal Info ───────────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Personal Info</h3>';
    html += buildInput('Name', 'base', 'personalInfo.name', info.name || '');
    html += buildInput('Email', 'base', 'personalInfo.email', info.email || '');
    html += buildInput('Phone', 'base', 'personalInfo.phone', info.phone || '');
    html += buildInput('Location', 'base', 'personalInfo.location', info.location || '');
    html += buildInput('Website', 'base', 'personalInfo.website', info.website || '');
    html += buildInput('LinkedIn', 'base', 'personalInfo.linkedin', info.linkedin || '');
    html += buildInput('GitHub', 'base', 'personalInfo.github', info.github || '');
    html += '</section>';

    // ── Summary ─────────────────────────────────────────────────────
    var enSummary = (version.summary && version.summary.en) || (base.summary && base.summary.en) || '';
    var esSummary = (version.summary && version.summary.es) || (base.summary && base.summary.es) || '';
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Summary</h3>';
    html += buildBilingualTextarea('Summary', 'version', 'summary', enSummary, esSummary);
    html += '<span class="char-count">' + enSummary.length + ' chars (EN)</span>';
    html += '</section>';

    // ── Sections ────────────────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Sections</h3>';
    html += buildToggle('summary', 'Summary', sections.summary);
    html += buildToggle('experience', 'Experience', sections.experience);
    html += buildToggle('education', 'Education', sections.education);
    html += buildToggle('skills', 'Skills', sections.skills);
    html += buildToggle('projects', 'Projects', sections.projects);
    html += '</section>';

    // ── Experience Selector ─────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Experience</h3>';

    var experiences = base.experiences || [];
    for (var ei = 0; ei < experiences.length; ei++) {
      var exp = experiences[ei];
      var checked = includes(version.selectedExperiences, exp.id);

      html += '<div class="editor-selector-item">';
      html += '<label class="editor-checkbox-label">';
      html += '<input type="checkbox" data-store="version" data-path="selectedExperiences" data-value="' + exp.id + '" value="' + exp.id + '"' + (checked ? ' checked' : '') + '> ';
      html += '<span>' + exp.company + ' — ' + exp.role + '</span>';
      html += '</label>';
      html += '<button type="button" class="bullet-toggle" data-exp="' + exp.id + '" title="Edit bullets">✎</button>';
      html += '<button type="button" class="delete-btn" data-action="delete" data-type="experience" data-id="' + exp.id + '" title="Delete experience">×</button>';

      // Bullet editor
      var hasCustomBullets = version.experienceBullets && version.experienceBullets[exp.id] !== undefined;
      var displayBullets = getBulletsForDisplay(exp.id);
      var editorOpen = hasCustomBullets;

      html += '<div class="bullet-editor' + (editorOpen ? ' open' : '') + '" data-exp="' + exp.id + '">';
      for (var bi = 0; bi < displayBullets.length; bi++) {
        var bullet = displayBullets[bi];
        var enBullet = (typeof bullet === 'string') ? bullet : (bullet.en || '');
        var esBullet = (typeof bullet === 'object' && bullet !== null) ? (bullet.es || '') : '';
        html += '<div class="bullet-row bilingual">';
        html += '<div class="bullet-lang-row">';
        html += '<span class="lang-badge lang-en">EN</span>';
        html += '<textarea class="bullet-textarea" data-bullet-for="' + exp.id + '" data-bullet-index="' + bi + '" data-lang="en" rows="2">' + enBullet + '</textarea>';
        html += '</div>';
        html += '<div class="bullet-lang-row">';
        html += '<span class="lang-badge lang-es">ES</span>';
        html += '<textarea class="bullet-textarea" data-bullet-for="' + exp.id + '" data-bullet-index="' + bi + '" data-lang="es" rows="2">' + esBullet + '</textarea>';
        html += '</div>';
        html += '<button type="button" class="remove-bullet" data-bullet-for="' + exp.id + '" data-bullet-index="' + bi + '" title="Remove bullet">×</button>';
        html += '</div>';
      }
      html += '<button type="button" class="add-bullet" data-exp="' + exp.id + '">+ Add bullet</button>';
      html += '</div>';

      html += '</div>';
    }

    // ── Experience inline form ─────────────────────────────────────
    html += buildExperienceInlineForm();

    html += '</section>';

    // ── Skills Selector ─────────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Skills</h3>';

    var skills = base.skills || [];
    for (var si = 0; si < skills.length; si++) {
      var skill = skills[si];
      var checkedSkill = includes(version.selectedSkills, skill.category);
      html += '<div class="editor-selector-item">';
      html += '<label class="editor-checkbox-label">';
      html += '<input type="checkbox" data-store="version" data-path="selectedSkills" data-value="' + skill.category + '" value="' + skill.category + '"' + (checkedSkill ? ' checked' : '') + '> ';
      html += '<span>' + skill.category + '</span>';
      html += '</label>';
      html += '<button type="button" class="delete-btn" data-action="delete" data-type="skill-category" data-id="' + skill.id + '" title="Delete category">×</button>';
      // Show individual skill items with delete buttons
      if (skill.items && skill.items.length > 0) {
        html += '<div class="skill-items-list">';
        for (var itemIdx = 0; itemIdx < skill.items.length; itemIdx++) {
          var itemName = skill.items[itemIdx];
          html += '<span class="skill-item">';
          html += itemName;
          html += '<button type="button" class="delete-item-btn" data-action="delete" data-type="skill-item" data-id="' + skill.id + '" data-item="' + itemName + '" title="Remove ' + itemName + '">×</button>';
          html += '</span>';
        }
        html += '</div>';
      }
      html += '</div>';
    }

    // ── Skills inline forms ────────────────────────────────────────
    html += buildSkillsInlineForms(skills);

    html += '</section>';

    // ── Education Selector ──────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Education</h3>';

    var education = base.education || [];
    for (var edui = 0; edui < education.length; edui++) {
      var edu = education[edui];
      var checkedEdu = includes(version.selectedEducation, edu.id);
      html += '<div class="editor-selector-item">';
      html += '<label class="editor-checkbox-label">';
      html += '<input type="checkbox" data-store="version" data-path="selectedEducation" data-value="' + edu.id + '" value="' + edu.id + '"' + (checkedEdu ? ' checked' : '') + '> ';
      html += '<span>' + edu.institution + ' — ' + edu.degree + ' in ' + edu.field + '</span>';
      html += '</label>';
      html += '<button type="button" class="delete-btn" data-action="delete" data-type="education" data-id="' + edu.id + '" title="Delete education">×</button>';
      html += '</div>';
    }

    // ── Education inline form ──────────────────────────────────────
    html += buildEducationInlineForm();

    html += '</section>';

    // ── Projects Selector ───────────────────────────────────────────
    html += '<section class="editor-section">';
    html += '<h3 class="editor-section-title">Projects</h3>';

    var projects = base.projects || [];
    for (var pi = 0; pi < projects.length; pi++) {
      var proj = projects[pi];
      var checkedProj = includes(version.selectedProjects, proj.id);
      html += '<label class="editor-checkbox-label">';
      html += '<input type="checkbox" data-store="version" data-path="selectedProjects" data-value="' + proj.id + '" value="' + proj.id + '"' + (checkedProj ? ' checked' : '') + '> ';
      html += '<span>' + proj.name + '</span>';
      html += '</label>';
    }

    // ── Projects inline form ───────────────────────────────────────
    html += buildProjectsInlineForm();

    html += '</section>';

    return html;
  }

  /**
   * Build a labelled text input.
   *
   * @param {string} label
   * @param {string} store  — 'base' or 'version'
   * @param {string} path
   * @param {string} value
   * @returns {string}
   */
  function buildInput(label, store, path, value) {
    return '<label class="editor-field">' +
      '<span class="editor-field-label">' + label + ':</span>' +
      '<input type="text" class="editor-input" data-store="' + store + '" data-path="' + path + '" value="' + value + '">' +
      '</label>';
  }

  /**
   * Build a bilingual (EN/ES) text input pair side by side.
   *
   * @param {string} label
   * @param {string} store  — 'base' or 'version'
   * @param {string} path
   * @param {string} enVal
   * @param {string} esVal
   * @returns {string}
   */
  function buildBilingualInput(label, store, path, enVal, esVal) {
    return '<label class="editor-field-label">' + label + ':</label>' +
      '<div class="bilingual-field">' +
      '<label class="bilingual-row">' +
      '<span class="lang-badge lang-en">EN</span>' +
      '<input type="text" class="editor-input" data-store="' + store + '" data-path="' + path + '" data-lang="en" value="' + enVal + '">' +
      '</label>' +
      '<label class="bilingual-row">' +
      '<span class="lang-badge lang-es">ES</span>' +
      '<input type="text" class="editor-input" data-store="' + store + '" data-path="' + path + '" data-lang="es" value="' + esVal + '">' +
      '</label>' +
      '</div>';
  }

  /**
   * Build a bilingual (EN/ES) textarea pair side by side.
   *
   * @param {string} label
   * @param {string} store  — 'base' or 'version'
   * @param {string} path
   * @param {string} enVal
   * @param {string} esVal
   * @returns {string}
   */
  function buildBilingualTextarea(label, store, path, enVal, esVal) {
    return '<label class="editor-field-label">' + label + ':</label>' +
      '<div class="bilingual-field">' +
      '<div class="bilingual-row">' +
      '<span class="lang-badge lang-en">EN</span>' +
      '<textarea class="editor-textarea" data-store="' + store + '" data-path="' + path + '" data-lang="en" rows="4">' + enVal + '</textarea>' +
      '</div>' +
      '<div class="bilingual-row">' +
      '<span class="lang-badge lang-es">ES</span>' +
      '<textarea class="editor-textarea" data-store="' + store + '" data-path="' + path + '" data-lang="es" rows="4">' + esVal + '</textarea>' +
      '</div>' +
      '</div>';
  }

  /**
   * Build a section toggle checkbox.
   *
   * @param {string} id    — section id (maps to sections.{id})
   * @param {string} label — display label
   * @param {boolean} checked
   * @returns {string}
   */
  function buildToggle(id, label, checked) {
    return '<label class="editor-checkbox-label">' +
      '<input type="checkbox" data-store="version" data-path="sections.' + id + '"' + (checked ? ' checked' : '') + '> ' +
      '<span>' + label + '</span>' +
      '</label>';
  }

  // ── Inline form builders ─────────────────────────────────────────────

  /**
   * Build the "Add item to category" and "New category" inline forms
   * for the Skills section.
   *
   * @param {Array} skills  — base.skills array
   * @returns {string}
   */
  function buildSkillsInlineForms(skills) {
    var h = '';

    // ── Add item to existing category ───────────────────────────────
    h += '<button type="button" class="inline-form-toggle" data-section="skills-add-item">+ Add skill item</button>';
    h += '<div class="inline-form" data-section="skills-add-item">';

    h += '<div class="inline-form-field">';
    h += '<label>Category:</label>';
    h += '<select name="category" class="editor-input">';
    for (var si = 0; si < skills.length; si++) {
      h += '<option value="' + skills[si].category + '">' + skills[si].category + '</option>';
    }
    h += '</select>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Item:</label>';
    h += '<input type="text" name="item" class="editor-input" placeholder="e.g. Python">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-actions">';
    h += '<button type="button" class="inline-form-submit" data-section="skills-add-item">Add</button>';
    h += '<button type="button" class="inline-form-cancel" data-section="skills-add-item">Cancel</button>';
    h += '</div>';
    h += '</div>';

    // ── New category ────────────────────────────────────────────────
    h += '<button type="button" class="inline-form-toggle" data-section="skills-new-cat">+ New category</button>';
    h += '<div class="inline-form" data-section="skills-new-cat">';

    h += '<div class="inline-form-field">';
    h += '<label>Category name:</label>';
    h += '<input type="text" name="categoryName" class="editor-input" placeholder="e.g. Databases">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Items (comma-separated):</label>';
    h += '<input type="text" name="items" class="editor-input" placeholder="e.g. PostgreSQL, MongoDB">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-actions">';
    h += '<button type="button" class="inline-form-submit" data-section="skills-new-cat">Add</button>';
    h += '<button type="button" class="inline-form-cancel" data-section="skills-new-cat">Cancel</button>';
    h += '</div>';
    h += '</div>';

    return h;
  }

  /**
   * Build the inline form for adding a new experience entry.
   *
   * @returns {string}
   */
  function buildExperienceInlineForm() {
    var h = '';

    h += '<button type="button" class="inline-form-toggle" data-section="experience">+ Add experience</button>';
    h += '<div class="inline-form" data-section="experience">';

    h += '<div class="inline-form-field">';
    h += '<label>Company:</label>';
    h += '<input type="text" name="company" class="editor-input" placeholder="e.g. Acme Corp">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Role:</label>';
    h += '<input type="text" name="role" class="editor-input" placeholder="e.g. Engineer">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Location:</label>';
    h += '<input type="text" name="location" class="editor-input" placeholder="e.g. Remote">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Start date:</label>';
    h += '<input type="text" name="startDate" class="editor-input" placeholder="YYYY-MM">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>End date:</label>';
    h += '<input type="text" name="endDate" class="editor-input" placeholder="YYYY-MM">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label class="editor-checkbox-label">';
    h += '<input type="checkbox" name="current" data-current="true"> Currently here';
    h += '</label>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Bullets (one per line):</label>';
    h += '<textarea name="bullets" class="editor-textarea" rows="3" placeholder="Enter each bullet on a new line"></textarea>';
    h += '</div>';

    h += '<div class="inline-form-actions">';
    h += '<button type="button" class="inline-form-submit" data-section="experience">Add</button>';
    h += '<button type="button" class="inline-form-cancel" data-section="experience">Cancel</button>';
    h += '</div>';
    h += '</div>';

    return h;
  }

  /**
   * Build the inline form for adding a new education entry.
   *
   * @returns {string}
   */
  function buildEducationInlineForm() {
    var h = '';

    h += '<button type="button" class="inline-form-toggle" data-section="education">+ Add education</button>';
    h += '<div class="inline-form" data-section="education">';

    h += '<div class="inline-form-field">';
    h += '<label>Institution:</label>';
    h += '<input type="text" name="institution" class="editor-input" placeholder="e.g. MIT">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Degree:</label>';
    h += '<input type="text" name="degree" class="editor-input" placeholder="e.g. B.S.">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Field:</label>';
    h += '<input type="text" name="field" class="editor-input" placeholder="e.g. Computer Science">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Start date:</label>';
    h += '<input type="text" name="startDate" class="editor-input" placeholder="YYYY-MM">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>End date:</label>';
    h += '<input type="text" name="endDate" class="editor-input" placeholder="YYYY-MM">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>GPA:</label>';
    h += '<input type="text" name="gpa" class="editor-input" placeholder="e.g. 3.8">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label class="editor-checkbox-label">';
    h += '<input type="checkbox" name="current" data-current="true"> Currently enrolled';
    h += '</label>';
    h += '</div>';

    h += '<div class="inline-form-actions">';
    h += '<button type="button" class="inline-form-submit" data-section="education">Add</button>';
    h += '<button type="button" class="inline-form-cancel" data-section="education">Cancel</button>';
    h += '</div>';
    h += '</div>';

    return h;
  }

  /**
   * Build the inline form for adding a new project entry.
   *
   * @returns {string}
   */
  function buildProjectsInlineForm() {
    var h = '';

    h += '<button type="button" class="inline-form-toggle" data-section="projects">+ Add project</button>';
    h += '<div class="inline-form" data-section="projects">';

    h += '<div class="inline-form-field">';
    h += '<label>Name:</label>';
    h += '<input type="text" name="name" class="editor-input" placeholder="e.g. My App">';
    h += '<span class="inline-form-error"></span>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Description:</label>';
    h += '<textarea name="description" class="editor-textarea" rows="3" placeholder="Describe the project"></textarea>';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>URL:</label>';
    h += '<input type="text" name="url" class="editor-input" placeholder="https://example.com">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Technologies:</label>';
    h += '<input type="text" name="technologies" class="editor-input" placeholder="e.g. React, Node.js">';
    h += '</div>';

    h += '<div class="inline-form-field">';
    h += '<label>Bullets (one per line):</label>';
    h += '<textarea name="bullets" class="editor-textarea" rows="3" placeholder="Enter each bullet on a new line"></textarea>';
    h += '</div>';

    h += '<div class="inline-form-actions">';
    h += '<button type="button" class="inline-form-submit" data-section="projects">Add</button>';
    h += '<button type="button" class="inline-form-cancel" data-section="projects">Cancel</button>';
    h += '</div>';
    h += '</div>';

    return h;
  }

  // ── Event handler for data changes (re-render) ──────────────────────

  function handleDataChange(e) {
    var detail = e.detail;
    currentBase = detail.base;
    currentVersion = detail.version;

    if (!container) return;
    container.innerHTML = buildEditorHtml(currentBase, currentVersion);
  }

  // ── Public API ──────────────────────────────────────────────────────

  window.GreedevCV.Editor = {
    /**
     * Set up the editor container and subscribe to data changes.
     *
     * @param {HTMLElement} containerEl
     */
    init: function (containerEl) {
      container = containerEl;

      // Set up event delegation
      container.addEventListener('change', handleChange);
      container.addEventListener('click', handleClick);

      document.addEventListener('GreedevCV:datachange', handleDataChange);

      // If DataStore already has state, render immediately
      var ds = window.GreedevCV && window.GreedevCV.DataStore;
      if (ds) {
        var state = ds.getState();
        if (state.base && state.activeVersion) {
          currentBase = state.base;
          currentVersion = state.activeVersion;
          container.innerHTML = buildEditorHtml(currentBase, currentVersion);
        }
      }
    },

    /**
     * Render from raw data (used for testing or manual updates).
     *
     * @param {object} data  — { base, version }
     */
    render: function (data) {
      currentBase = data.base;
      currentVersion = data.version;
      if (container) {
        container.innerHTML = buildEditorHtml(currentBase, currentVersion);
      }
    },

    /**
     * Remove event listeners and clean up.
     */
    destroy: function () {
      if (container) {
        container.removeEventListener('change', handleChange);
        container.removeEventListener('click', handleClick);
      }
      document.removeEventListener('GreedevCV:datachange', handleDataChange);
      container = null;
      currentBase = null;
      currentVersion = null;
    },
  };
})();
