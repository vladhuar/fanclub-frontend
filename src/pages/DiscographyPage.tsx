import { useCallback, useEffect, useState } from 'react'
import { Alert, Spinner } from '../components/ui'

interface Track {
  title: string
  duration: string
  featured: boolean
}

interface Release {
  id: string
  title: string
  year: number
  type: string
  accent: string
  description: string
  tracks: Track[]
}

interface Discography {
  title: string
  intro: string
  updated_at: string
  releases: Release[]
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; data: Discography }
  | { status: 'error'; message: string }

/** Iniciales para la portada generada de cada lanzamiento. */
function initials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** Sección estática: carga la discografía desde un JSON con fetch. */
export function DiscographyPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/discography.json`)
      if (!response.ok) {
        throw new Error(`No pudimos cargar la discografía (${response.status}).`)
      }
      const data = (await response.json()) as Discography
      setState({ status: 'ready', data })
    } catch (cause) {
      setState({
        status: 'error',
        message: cause instanceof Error ? cause.message : 'No pudimos cargar la discografía.',
      })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, attempt])

  const totalTracks =
    state.status === 'ready'
      ? state.data.releases.reduce((sum, release) => sum + release.tracks.length, 0)
      : 0

  return (
    <section className="grunge">
      <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Música</p>
        <h1 className="mt-2 font-display text-[clamp(2.8rem,8vw,6rem)] uppercase leading-none">
          Discografía
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-mute">
          {state.status === 'ready'
            ? state.data.intro
            : 'Lanzamientos, sesiones y colaboraciones del club en un solo lugar.'}
        </p>

        {state.status === 'loading' && (
          <div className="mt-10 grid place-items-center rounded-2xl border border-line bg-panel py-20">
            <Spinner label="Cargando discografía…" />
          </div>
        )}

        {state.status === 'error' && (
          <div className="mt-10 space-y-4">
            <Alert tone="error">{state.message}</Alert>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="rounded-md border border-line px-5 py-2.5 font-bold transition-colors hover:border-brand"
            >
              Reintentar
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line py-4 text-xs font-bold uppercase tracking-[0.16em] text-mute">
              <span>{state.data.releases.length} lanzamientos</span>
              <span>{totalTracks} canciones</span>
              <span className="text-brand">Contenido estático · JSON</span>
            </div>

            <div className="mt-10 space-y-6">
              {state.data.releases.map((release) => (
                <article
                  key={release.id}
                  className="grid gap-6 rounded-2xl border border-line bg-panel p-6 md:grid-cols-[11rem_1fr] md:p-7"
                >
                  <div
                    className="relative grid aspect-square w-full max-w-[11rem] place-items-center overflow-hidden rounded-xl"
                    style={{
                      background: `linear-gradient(145deg, ${release.accent} 0%, #0e0e12 130%)`,
                    }}
                    aria-hidden="true"
                  >
                    <span className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.35)_1px,transparent_1.5px)] [background-size:16px_16px]" />
                    <span className="relative font-display text-5xl uppercase text-ink">
                      {initials(release.title)}
                    </span>
                    <span className="absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink/70">
                      {release.year}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-4xl uppercase leading-none">{release.title}</h2>
                      <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                        {release.type}
                      </span>
                      <span className="text-sm text-mute">{release.year}</span>
                    </div>
                    <p className="mt-2 max-w-2xl text-mute">{release.description}</p>

                    <ol className="mt-5 divide-y divide-line border-t border-line">
                      {release.tracks.map((track, index) => (
                        <li
                          key={`${release.id}-${track.title}`}
                          className="flex items-center gap-3 py-2.5 text-sm"
                        >
                          <span className="w-6 shrink-0 text-right font-mono text-xs text-mute">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {track.title}
                            {track.featured && (
                              <span className="ml-2 rounded border border-brand/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">
                                Destacada
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-mute">{track.duration}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-8 text-xs text-mute">
              Última actualización del archivo: {state.data.updated_at}.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
