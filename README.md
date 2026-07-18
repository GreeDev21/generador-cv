# KudosCV — Gestor de Currículums

Aplicación web multiusuario para crear, editar y gestionar versiones de tu currículum vitae en múltiples idiomas, con vista previa en tiempo real y plantilla profesional tipo Harvard.

## ✨ Funcionalidades

- **Editor visual** — Modificá cada sección del CV desde un panel lateral: datos personales, resumen, experiencias, educación, skills y proyectos.
- **Versiones** — Creá distintas versiones de tu CV para diferentes postulaciones. Cada versión tiene su propio target, selección de items y bullets personalizados.
- **Idioma EN/ES** — Cambiá entre español e inglés con un toggle. Los textos traducibles se guardan en ambos idiomas.
- **Vista previa en vivo** — El CV se renderiza automáticamente al editar.
- **Multiusuario** — Cada usuario tiene su propio espacio de trabajo con sus CVs.
- **Autenticación** — Registro y login con JWT. Datos aislados por usuario (nadie ve CVs de otros).
- **Persistencia** — Los datos se guardan en PostgreSQL, disponibles desde cualquier dispositivo.
- **Recuperación de borrador** — Autoguardado local por si cerrás sin guardar.

## 🚀 Deploy

La app está diseñada para correr en **Vercel** con **Vercel Postgres**.

1. Cloná el repo y conectalo a Vercel
2. Provisioná Vercel Postgres (Storage → Create Database)
3. Seteá `JWT_SECRET` en Environment Variables
4. Corré las migraciones en `api/_lib/migrations/`
5. Deployá con `vercel --prod`

## 📁 Estructura del proyecto

```
greedev-cv/
├── api/                   # Vercel Functions (Node.js serverless)
│   ├── auth/
│   │   ├── register.js    # POST /api/auth/register
│   │   ├── login.js       # POST /api/auth/login
│   │   └── me.js          # GET  /api/auth/me
│   ├── cv/
│   │   ├── pool.js        # GET|PUT /api/cv/pool
│   │   ├── versions.js    # GET|POST /api/cv/versions
│   │   └── versions/[id].js # GET|PATCH|DELETE /api/cv/versions/:id
│   └── _lib/
│       ├── auth.js        # Middleware JWT (requireAuth, signToken)
│       ├── db.js          # Conexión a @vercel/postgres
│       └── migrations/    # Migraciones SQL
├── js/
│   ├── data-store.js      # Módulo de datos con Bearer auth
│   ├── editor.js          # Editor de formularios
│   └── preview.js         # Renderizado de la plantilla Harvard
├── css/
│   └── styles.css         # Estilos completos
├── assets/                # Logo y favicon
├── login.html             # Inicio de sesión
├── register.html          # Registro de usuario
├── credits.html           # Créditos de recursos
└── serve.js               # Servidor local (deprecado, reemplazado por Vercel Functions)
```

## 🧠 Arquitectura

- **Frontend**: JavaScript vanilla (IIFE modules), HTML5, CSS3 — sin frameworks, sin build step.
- **Backend**: Vercel Functions (Node.js serverless) con `@vercel/postgres`.
- **Auth**: JWT con bcryptjs, token en localStorage, expiración de 7 días.
- **Base de datos**: Vercel Postgres (Neon) con 3 tablas: `users`, `cv_pools`, `cv_versions`.
- **Aislamiento**: Cada query incluye `WHERE user_id = $1` — un usuario nunca ve datos de otro.

## 🌐 API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registro de usuario |
| POST | `/api/auth/login` | No | Inicio de sesión |
| GET | `/api/auth/me` | Sí | Datos del usuario autenticado |
| GET | `/api/cv/pool` | Sí | Obtener pool de datos del CV |
| PUT | `/api/cv/pool` | Sí | Guardar pool de datos del CV |
| GET | `/api/cv/versions` | Sí | Listar versiones |
| POST | `/api/cv/versions` | Sí | Crear nueva versión |
| GET | `/api/cv/versions/:id` | Sí | Obtener versión |
| PATCH | `/api/cv/versions/:id` | Sí | Actualizar versión |
| DELETE | `/api/cv/versions/:id` | Sí | Eliminar versión |

## 🛠️ Stack

- **Frontend**: JavaScript vanilla, HTML5, CSS3
- **Backend**: Node.js, Vercel Functions
- **Base de datos**: Vercel Postgres (Neon)
- **Auth**: JWT + bcryptjs
- **Hosting**: Vercel

## 🙌 Créditos

Los iconos del logo fueron creados por [wahya - Flaticon](https://www.flaticon.es/autores/wahya).
Ver [Créditos](/credits.html) para más información.
