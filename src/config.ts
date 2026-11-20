// Configuración del cliente. Vite sólo expone variables con prefijo VITE_.
// En producción, VITE_API_URL debe apuntar al backend público.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined

/** URL base del backend sin barra final. */
export const API_URL = (rawApiUrl ?? '').replace(/\/+$/, '')

/** Clave de localStorage donde se guarda la sesión. */
export const TOKEN_STORAGE_KEY = 'hub3.tokens.v1'

// Media opcional del hero: un GIF/imagen o un mini-video liviano.
// Si no se configura, el hero usa la animación CSS de respaldo.
const rawHeroMedia = (import.meta.env.VITE_HERO_MEDIA_URL as string | undefined) ?? ''
const rawHeroType = (import.meta.env.VITE_HERO_MEDIA_TYPE as string | undefined) ?? ''
const rawHeroPoster = (import.meta.env.VITE_HERO_POSTER_URL as string | undefined) ?? ''

export const HERO_MEDIA_URL = rawHeroMedia.trim()
export const HERO_MEDIA_TYPE = rawHeroType.trim().toLowerCase()
export const HERO_POSTER_URL = rawHeroPoster.trim()

/** Cantidad de publicaciones por página del feed. */
export const FEED_PAGE_SIZE = 10

/** Límites de media alineados con el backend. */
export const MAX_MEDIA_ITEMS = 6
export const MAX_VIDEOS = 1
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
