import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { HERO_MEDIA_TYPE, HERO_MEDIA_URL, HERO_POSTER_URL } from '../config'
import { Avatar } from './Avatar'

/** Patrón decorativo que evoca un QR en la credencial del hero. */
const QR_CELLS = [
  1, 1, 1, 1, 1, 0, 1,
  1, 0, 0, 0, 1, 0, 1,
  1, 0, 1, 0, 1, 1, 0,
  1, 0, 0, 0, 1, 0, 1,
  1, 1, 1, 1, 1, 0, 1,
  0, 0, 0, 0, 0, 1, 1,
  1, 1, 0, 1, 1, 0, 0,
]

// Datos de muestra de la credencial del hero: son genéricos y no dependen
// de la sesión, para no exponer información real del visitante.
const SAMPLE_MEMBER = {
  name: 'John Doe',
  username: 'johndoe',
  email: 'john.doe@hub3.club',
  serial: 'FAN-STD-00042-JD07',
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}

function detectMediaKind(): 'video' | 'image' {
  if (HERO_MEDIA_TYPE === 'video' || HERO_MEDIA_TYPE === 'image') return HERO_MEDIA_TYPE
  return /\.(mp4|webm|ogv|mov|m4v)(?:[?#]|$)/i.test(HERO_MEDIA_URL) ? 'video' : 'image'
}

/**
 * Hero cinematográfico inspirado en lab3.gg.
 * Usa el GIF/imagen o mini-video configurado por variables de entorno y cae en
 * una animación CSS cuando no hay media o falla su carga.
 */
export function Hero() {
  const { user } = useAuth()
  const reducedMotion = usePrefersReducedMotion()
  const [offset, setOffset] = useState(0)
  const [mediaFailed, setMediaFailed] = useState(false)

  const mediaKind = detectMediaKind()
  const hasMedia = Boolean(HERO_MEDIA_URL) && !mediaFailed

  // Parallax suave del fondo; se desactiva con prefers-reduced-motion.
  useEffect(() => {
    if (reducedMotion) {
      setOffset(0)
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      setOffset(Math.min(window.scrollY * 0.16, 72))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      {/* Fondo: media opcional + aurora CSS de respaldo. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="hero-aurora" />
        <div className="hero-grid absolute inset-0 opacity-70" />
        <div className="hero-ring absolute -right-40 top-1/2 h-[44rem] w-[44rem] -translate-y-1/2 rounded-full opacity-60 blur-2xl" />

        {hasMedia && (
          <div
            className="absolute inset-0"
            style={{
              transform: `translate3d(0, ${offset}px, 0) scale(1.06)`,
            }}
          >
            {mediaKind === 'video' ? (
              <video
                className="h-full w-full object-cover"
                src={HERO_MEDIA_URL}
                poster={HERO_POSTER_URL || undefined}
                autoPlay={!reducedMotion}
                muted
                loop={!reducedMotion}
                playsInline
                preload="metadata"
                disablePictureInPicture
                onError={() => setMediaFailed(true)}
              />
            ) : (
              <img
                className="h-full w-full object-cover"
                src={HERO_MEDIA_URL}
                alt=""
                onError={() => setMediaFailed(true)}
              />
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/35" />
        <div className="hero-sheen absolute inset-0" />
      </div>

      <div className="mx-auto grid min-h-[620px] max-w-6xl items-center gap-12 px-5 py-20 md:min-h-[720px] md:grid-cols-[1.15fr_.85fr] md:py-24">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-mute backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
            Comunidad · Historias · Logros
          </p>

          <h1 className="stamp font-display text-[clamp(3.4rem,9vw,7.5rem)] uppercase leading-[.9]">
            El club
            <br />
            en
            <br />
            <span className="text-brand">movimiento</span>
          </h1>

          <p className="mt-6 max-w-md text-lg text-paper/80">
            Comparte lo que construyes, descubre lo que hace la comunidad y celebremos cada logro.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link
                to="/crear"
                className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white"
              >
                Crear publicación
              </Link>
            ) : (
              <Link
                to="/register"
                className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white"
              >
                Unirme ahora
              </Link>
            )}
            <Link
              to="/feed"
              className="rounded-md border border-line bg-ink/40 px-6 py-3 font-bold backdrop-blur transition-colors hover:border-brand hover:text-brand"
            >
              Ver el feed
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs font-bold uppercase tracking-[0.16em] text-mute">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Historias de la comunidad
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Credencial digital
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              Eventos y logros
            </li>
          </ul>
        </div>

        {/* Credencial flotante: refuerza la identidad y anticipa el QR. */}
        <div className="relative hidden md:block" aria-hidden="true">
          <div className="hero-card relative mx-auto w-full max-w-sm rotate-3">
            <div className="absolute -inset-6 rounded-[2.2rem] bg-brand/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-brand/40 bg-ink/75 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-3xl leading-none tracking-wide">
                    HUB<span className="text-brand">3</span>
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-mute">Member pass</p>
                </div>
                <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-brand">
                  Activo
                </span>
              </div>

              <div className="mt-10 flex items-end justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={SAMPLE_MEMBER.name} />
                  <div className="min-w-0">
                    <p className="truncate font-bold leading-tight">{SAMPLE_MEMBER.name}</p>
                    <p className="truncate text-sm text-mute">@{SAMPLE_MEMBER.username}</p>
                    <p className="truncate text-[10px] text-mute/80">{SAMPLE_MEMBER.email}</p>
                  </div>
                </div>
                <div className="grid h-24 w-24 shrink-0 grid-cols-7 gap-[2px] rounded-xl bg-paper p-2">
                  {QR_CELLS.map((on, index) => (
                    <span
                      key={index}
                      className={`aspect-square rounded-[1px] ${on ? 'bg-ink' : 'bg-transparent'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-[10px] uppercase tracking-[0.2em] text-mute">
                <span>{SAMPLE_MEMBER.serial}</span>
                <span className="text-brand">2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
