# Proposal: Multi-Template Support

## Intent

El preview actual está 100% atado al layout Harvard — HTML structure, clases CSS, todo hardcoded en `preview.js` (422 líneas). No se puede agregar un segundo template sin reescribir todo. Esta propuesta desacopla la capa de renderizado visual del dispatcher de preview, permitiendo registrar y seleccionar entre múltiples templates sin cambiar el core.

## Scope

### In Scope
- Crear `js/templates/registry.js` — registro global nombre → render()
- Extraer render Harvard actual → `js/templates/harvard.js`
- Refactorizar `preview.js` a dispatcher que delega en el template activo
- Agregar campo `template` a la config de versión en `data-store.js`
- Agregar selector de template en `editor.js` (dropdown en settings de versión)
- Aislar estilos CSS por template con prefijos BEM (`.hr-*`, `.md-*`)

### Out of Scope
- Imágenes / Vercel Blob (próximo cambio)
- Más de 2 templates — se entregan Harvard + Modern
- Server-side rendering o build step
- Dependencias externas

## Capabilities

### New Capabilities
- `template-management`: Template registry pluggable, renderers independientes, selector UI, estilos scoped por template

### Modified Capabilities
- None

## Approach

**Strategy Pattern + Registry**, sin framework, sin build step:

1. `js/templates/registry.js` — API pública `register(name, renderFn)`, `get(name)`, y `list()`
2. `js/templates/harvard.js` — extraer cuerpo de `renderPreview()` como `GreedevCV.Templates.Harvard.render(data)`
3. `preview.js` — se simplifica a: leer `versionConfig.template` del DataStore → `registry.get(template).render(mergedData)` → insertar HTML
4. `data-store.js` — agregar `template: "harvard"` al default de versión (backward compatible)
5. `editor.js` — agregar `<select>` en panel de configuración de versión; al cambiar, llama `DataStore.updateVersionConfig({ template })`
6. `css/styles.css` — prefijar clases Harvard actuales con `.hr-`, agregar bloque `.md-` para Modern

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `js/preview.js` | **Modified** → Reduced | Se vuelve dispatcher delgado, delega en template activo |
| `js/templates/` | **New** | registry.js + harvard.js (y futuros templates) |
| `js/data-store.js` | **Modified** | Agrega campo `template` al version config schema |
| `js/editor.js` | **Modified** | Agrega selector de template en settings de versión |
| `css/styles.css` | **Modified** | Scope de clases Harvard bajo `.hr-*`, nuevo bloque `.md-*` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Extracción rompe layout Harvard existente | Medium | Mantener `preview.js` original como referencia; diff visual post-extracción |
| Scoping CSS rompe estilos actuales | Medium | Prefijo BEM `.hr-` en todas las clases Harvard; sin cambios de layout |
| Selector UX confuso | Low | Ubicar junto al nombre de versión en header del editor |

## Rollback Plan

- `git checkout -- js/preview.js css/styles.css js/data-store.js js/editor.js` revierte todo
- Eliminar directorio `js/templates/`
- El campo `template` sobrante en version config es inocuo — default es `"harvard"`
- Sin migración de datos necesaria

## Dependencies

- Ninguna (zero deps, sin build step)

## Success Criteria

- [ ] Harvard template renderiza idéntico antes y después de la extracción
- [ ] Template registry registra y resuelve "harvard" y "modern"
- [ ] Editor muestra selector de template en settings de versión
- [ ] Cambiar template re-renderiza preview sin recargar página
- [ ] Version config persiste template elegido entre recargas
- [ ] Campo `template` defaultea a `"harvard"` para versiones existentes (backward compat)
