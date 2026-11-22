# Fanclub Frontend

Cliente web del fanclub, construido con Vite, React, TypeScript y Tailwind CSS sobre el diseño Hub3 (tipografías Anton/DM Sans y paleta verde).

Consume la API en Go del repositorio [`vladhuar/Fanclub`](https://github.com/vladhuar/Fanclub).

## Stack

- Vite 5 + React 18 + TypeScript
- React Router 6
- Tailwind CSS 3 con tokens propios (`ink`, `panel`, `line`, `brand`, `paper`, `mute`)
- `qrcode.react` para generar el QR de la credencial en el navegador

## Requisitos

- Node.js 20 o superior
- Acceso al backend (por defecto el desplegado en Northflank)

## Puesta en marcha

```bash
npm install
cp .env.example .env   # en PowerShell: Copy-Item .env.example .env
npm run dev            # http://localhost:5173
```

Scripts disponibles:

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Typecheck (`tsc --noEmit`) + build en `dist/` |
| `npm run preview` | Sirve el build localmente |

## Variables de entorno

Solo se exponen las variables con prefijo `VITE_`. Se leen en `src/config.ts`.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_URL` | Sí | URL pública del backend, sin barra final |
| `VITE_HERO_MEDIA_URL` | No | Ruta del GIF/imagen o mini-video del hero |
| `VITE_HERO_MEDIA_TYPE` | No | `image` o `video`; si se omite se detecta por extensión |
| `VITE_HERO_POSTER_URL` | No | Imagen de portada mientras carga el video |

Sin `VITE_API_URL` la constante `API_URL` queda vacía y las peticiones apuntan al mismo origen que sirve la app.

## Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | Público | Hero animado, lema, últimas publicaciones y membresía |
| `/feed` | Público | Publicaciones con filtros `Recientes` y `Más gustadas` |
| `/discografia` | Público | Discografía estática cargada desde `public/data/discography.json` |
| `/verificar/:token` | Público | Verificación del QR de una credencial |
| `/u/:username` | Público | Perfil público con nombre, `@username` y solo sus publicaciones |
| `/login` | Público | Inicio de sesión con email o usuario |
| `/register` | Público | Registro con aprobación pendiente |
| `/crear` | Autenticado | Publicación con hasta 6 elementos de media |
| `/publicaciones/:id/editar` | Autor | Edición de una publicación propia |
| `/perfil` | Autenticado | Datos, edición de perfil, contraseña y credencial con QR |
| `/admin` | Admin | Usuarios, aprobaciones, roles y credenciales |

El acceso se resuelve con `ProtectedRoute`; el rol se valida contra el backend, que es la autoridad final.

## Hero animado

El hero acepta un GIF/imagen o un mini-video liviano. Los archivos van en `public/hero/` y se configuran en `.env`:

```bash
# Mini-video (recomendado: WebM/MP4 de 3-6 MB, sin audio)
VITE_HERO_MEDIA_URL=/hero/hero.webm
VITE_HERO_MEDIA_TYPE=video
VITE_HERO_POSTER_URL=/hero/hero-poster.jpg

# O un GIF/imagen (hasta ~5 MB para no demorar la primera carga)
VITE_HERO_MEDIA_URL=/hero/hero.gif
VITE_HERO_MEDIA_TYPE=image
```

El video se reproduce en loop, silenciado y con `playsInline`. Con `prefers-reduced-motion` no arranca automáticamente y el parallax se desactiva. Si no hay archivo o falla la carga, se muestra la animación CSS de respaldo.

## Discografía

El contenido es estático: se edita `public/data/discography.json` y la página lo carga con `fetch` al entrar a `/discografia`. No requiere cambios en el backend.

## Panel de administración

- `/admin` lista usuarios y credenciales con **paginación y búsqueda server-side**: cada cambio de texto o de filtro consulta `GET /users` o `GET /credentials` con `q`, `status`, `limit` y `offset`.
- Los usuarios muestran tarjetas con totales globales (`counts`) provistos por el backend; aprobar, desactivar o cambiar un rol recarga la página actual y los totales.
- Al emitir una credencial, los candidatos se piden a `GET /users?status=active&credential=none`, así que el formulario no depende de descargar todos los usuarios.
- Cada credencial ya trae `user_name`, `user_username` y `user_avatar_url`; el panel no necesita cruzar listas en el navegador.

## Credencial y QR

- `GET /credentials/me/qr` devuelve el serial y el token de la credencial propia.
- El QR se genera localmente con `qrcode.react` y apunta a `{QR_BASE_URL}/verificar/{token}`; esa base la define el backend con la variable `QR_BASE_URL`.
- `/verificar/:token` consulta `GET /credentials/verify/{token}` y muestra si la credencial es válida.
- La credencial se puede descargar como PNG (se compone en un canvas con el QR) o imprimir con el botón **Imprimir**; la hoja de impresión oculta el resto de la página.

## Perfiles, edición y media

- Los autores pueden editar o eliminar sus propias publicaciones desde el menú `⋯` de cada tarjeta.
- Los admins y superadmins solo pueden eliminar publicaciones ajenas, no editarlas.
- El avatar del perfil se configura pegando una URL pública (por ejemplo DiceBear o Gravatar); no hay subida de archivos.
- Las imágenes del feed se abren en un visor modal y se cierran con Escape, con el botón o al hacer clic fuera.

## Despliegue

1. Configurar `VITE_API_URL` con el dominio del backend en el panel del hosting (Vercel, Netlify, Cloudflare Pages, etc.).
2. Publicar el resultado de `npm run build` (`dist/`).
3. Habilitar **SPA fallback** (redirigir rutas desconocidas a `index.html`) para que `/feed`, `/discografia`, `/verificar/:token`, `/u/:username`, `/publicaciones/:id/editar`, `/admin` y `/perfil` funcionen al recargar.
4. Agregar el dominio del frontend a `CORS_ALLOWED_ORIGINS` y a `QR_BASE_URL` en el backend, y a la política CORS del bucket R2 (`PUT` y `Content-Type`) para que funcionen las subidas firmadas.

## Estructura

```
src/
├── auth/         # Contexto de sesión y refresh automático
├── components/   # Layout, hero, tarjetas, comentarios y UI compartida
├── lib/          # Cliente HTTP, formato y países
└── pages/        # Inicio, feed, discografía, verificación, login, registro, crear, perfil y admin
public/
├── data/         # JSON estático de la discografía
└── hero/         # Media opcional del hero
```
