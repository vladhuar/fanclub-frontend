/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** URL del GIF/imagen o mini-video de fondo del hero. */
  readonly VITE_HERO_MEDIA_URL?: string
  /** "video" o "image"; si se omite se detecta por la extensión. */
  readonly VITE_HERO_MEDIA_TYPE?: string
  /** Imagen que se muestra mientras carga el video del hero. */
  readonly VITE_HERO_POSTER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
