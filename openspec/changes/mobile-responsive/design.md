# Design: Mobile Responsive

## Technical Approach

Tres breakpoints progresivos sobre CSS existente + un tab toggle JS (~25 líneas) y dos botones en el HTML. Sin framework, sin build step, sin cambios al modelo de datos.

El layout ya tiene `@media (max-width: 767px)` que colapsa el grid a 1 columna. Se modifica ese breakpoint a 768px, se agrega `flex-wrap` a toolbar/header, se stackean los campos bilingües, y se introduce un tab toggle que en mobile permite alternar entre editor y preview sin perder estado.

---

## Architecture Decisions

### Breakpoints

| Breakpoint | Alcance |
|---|---|
| `1024px` | Padding/gap/font-size del contenedor `#app`, editor panel, preview panel |
| `768px` | Grid a 1 columna, toolbar/header wrap, bilingual rows stack, tab toggle visible |

**Rationale**: 768px cubre tablets en portrait (iPad ~768px). 1024px cubre tablets en landscape y pantallas chicas. Coinciden con breakpoints CSS estándar de la industria. No se necesita un breakpoint extra para teléfonos (<480px) porque auth pages ya manejan ese ancho y la UI de edición hereda correctamente.

### Tab toggle: `display: none` vs detach del DOM

**Choice**: `display: none` + clase CSS. No se mueven nodos ni se destruye/reactiva contenido.

**Rationale**: El panel oculto mantiene scroll position, valores de input, y estado del editor (bullet editors abiertos, inline forms con datos). Es cero riesgo de perder estado, y el costo de render es irrelevante porque los dos paneles ya existen en el DOM desde el init.

### Bilingual rows: stack en mobile

**Choice**: `.bilingual-row` cambia a `flex-direction: column` en 768px.

**Rationale**: En mobile el editor-panel ocupa el ancho completo, pero badge + input lado a lado sigue siendo usable hasta ~400px. Debajo de eso el badge y el input compiten por espacio. Stackearlos elimina el problema sin necesidad de redimensionar fuentes.

---

## Data Flow

Sin flujo nuevo. El tab toggle es UI-only:

```
Tab click → handler JS
  → toggle class "panel-hidden" en el otro panel
  → toggle class "active" en el tab clickeado
  → (no data mutations, no eventos)
```

El editor y preview ya escuchan `GreedevCV:datachange` para re-renderizar. Cambiar de tab no dispara re-render.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `index.html` | Modify | Agregar `<div class="tab-toggle">` con dos `<button>` ([Editor], [Preview]) entre toolbar y app-body |
| `css/styles.css` | Modify | Agregar breakpoints 1024px/768px, `flex-wrap`, reglas de stacking, `.tab-toggle` styles, `.panel-hidden` class |
| `app.js` | Modify | Agregar ~25 líneas para wirear tab click handlers al final del init(), antes del bloque try/catch |

### index.html — cambios

Insertar después del `</div>` que cierra `.toolbar` (línea 32):

```html
<div class="tab-toggle">
  <button class="tab-btn active" data-panel="editor">Editor</button>
  <button class="tab-btn" data-panel="preview">Preview</button>
</div>
```

### css/styles.css — cambios

1. Agregar `flex-wrap: wrap` a `.toolbar` (existente) y `.app-header`
2. Agregar `row-gap` a `.toolbar` para cuando los items envuelvan
3. Nuevo bloque `.tab-toggle` / `.tab-btn` (display:none en desktop, visible en mobile)
4. Nuevo `.panel-hidden` (display:none)
5. Modificar `.bilingual-row` en 768px a `flex-direction: column`
6. Ajustar `max-height` de `.editor-panel` y `.preview-panel` en 768px (remover el limite)
7. Breakpoint 1024px para reducir padding de `#app` y `preview-panel`

### app.js — cambios

Dentro del init(), antes del bloque try (línea 325), agregar:

```js
// Tab toggle (mobile)
var tabBtns = document.querySelectorAll('.tab-toggle .tab-btn');
var editorPanel = document.getElementById('editor-panel');
var previewPanel = document.getElementById('preview-panel');

function activateTab(panelId) {
  tabBtns.forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.panel === panelId);
  });
  editorPanel.classList.toggle('panel-hidden', panelId !== 'editor');
  previewPanel.classList.toggle('panel-hidden', panelId !== 'preview');
}

tabBtns.forEach(function (btn) {
  btn.addEventListener('click', function () {
    activateTab(btn.dataset.panel);
  });
});
```

---

## Interfaces / Contracts

Ninguna. El tab toggle es puramente UI, no expone API ni modifica el modelo de datos.

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Layout en 320px, 768px, 1024px, 1440px | Testing manual con DevTools responsive mode |
| Visual | Toolbar wrap con botones activos | Probar en 768px que los botones envuelven sin cortarse |
| Visual | Header wrap con título largo + logout | Probar en 768px que header items envuelven |
| Functional | Tab toggle alterna paneles | Click en [Editor] → preview oculto, click en [Preview] → editor oculto, sin pérdida de scroll/input |
| Functional | Preservación de estado | Escribir texto en un campo, cambiar a Preview, volver a Editor → el texto sigue ahí |
| Regression | Desktop sin cambios | Verificar que en viewports > 768px el tab toggle NO aparece y ambos paneles son visibles |
| Regression | Print styles | `Ctrl+P` debe mostrar solo preview, sin tab toggle visible |

---

## Rollout / Migration

Sin migración. Los cambios son aditivos: el tab toggle arranca oculto en desktop (`display: none`), y en mobile el `active` inicial muestra el editor por defecto manteniendo el comportamiento visual actual.

---

## Open Questions

Ninguna.
