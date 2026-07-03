# GreeDev CV — Gestor de Currículums

Aplicación web para crear, editar y gestionar versiones de tu currículum vitae en múltiples idiomas, con vista previa en tiempo real y plantilla profesional tipo Harvard.

## ✨ Funcionalidades

- **Editor visual** — Modificá cada sección del CV desde un panel lateral: datos personales, resumen, experiencias, educación, skills y proyectos.
- **Versiones** — Creá distintas versiones de tu CV para diferentes postulaciones. Cada versión tiene su propio target, selección de items y bullets personalizados.
- **Idioma EN/ES** — Cambiá entre español e inglés con un toggle. Los textos traducibles se guardan en ambos idiomas.
- **Vista previa en vivo** — El CV se renderiza automáticamente al editar. Dale a "PDF" para imprimir o guardar como PDF.
- **Persistencia** — Los cambios se guardan en el servidor. Si el servidor no está disponible, se descarga un archivo JSON como respaldo.
- **Recuperación de borrador** — Si editás y cerrás sin guardar, al recargar la página se te ofrece restaurar el borrador automático.
- **CRUD completo** — Creá, duplicá, eliminá y seleccioná versiones desde la barra de herramientas.

## 🚀 Cómo usarlo

### Requisitos

- [Node.js](https://nodejs.org/) (v18 o superior)

### Arrancar el servidor

```bash
# Puerto 3000 por defecto
node serve.js

# Puerto personalizado
PORT=3001 node serve.js
```

Abrí **http://localhost:3000** (o el puerto que hayas elegido) en el navegador.

### Usar con datos de ejemplo

El repo tiene dos ramas:

| Rama | Contenido |
|------|-----------|
| `main` | Código + datos personales reales |
| `sample-data` | Código + datos ficticios de ejemplo |

Si querés mostrar la app sin exponer datos reales, cambiá la rama a `sample-data`.

## 📁 Estructura del proyecto

```
greedev-cv/
├── serve.js              # Servidor HTTP local (Node.js stdlib, sin npm)
├── index.html            # Página principal
├── js/
│   ├── data-store.js     # Módulo de datos: carga, versión, persistencia
│   ├── editor.js         # Editor de formularios
│   ├── preview.js        # Renderizado de la plantilla Harvard
├── css/
│   └── styles.css        # Estilos completos
├── data/
│   ├── cv.json           # Base pool con toda la información del CV
│   └── versions/         # Archivos JSON de cada versión
└── openspec/             # Documentación SDD (especificaciones y diseño)
```

## 🧠 Cómo funciona

**Arquitectura**: Todo corre en el navegador con un servidor HTTP mínimo. Los módulos JS se cargan como IIFEs (sin build step, sin npm). El flujo es:

1. `serve.js` sirve archivos estáticos y expone endpoints para guardar/borrar archivos JSON en el servidor.
2. `data-store.js` carga el CV base y las versiones, maneja el estado y la persistencia.
3. `editor.js` construye formularios dinámicos para editar cada sección.
4. `preview.js` renderiza el CV en vivo con la plantilla Harvard.

Los módulos se comunican mediante eventos personalizados (`GreedevCV:datachange`, `GreedevCV:languagechange`, etc.).

## 🌐 API del servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/versions` | Lista las versiones disponibles |
| `POST` | `/api/save` | Guarda un archivo JSON en el servidor |
| `DELETE` | `/api/save` | Elimina un archivo JSON del servidor |

## 🛠️ Stack

- **Frontend**: JavaScript vanilla (IIFE modules), HTML5, CSS3
- **Backend**: Node.js (stdlib — cero dependencias)
- **Persistencia**: Archivos JSON en el servidor + localStorage para borradores
