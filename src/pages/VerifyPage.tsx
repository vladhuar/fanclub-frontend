import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Spinner } from '../components/ui'
import { ApiError, api } from '../lib/api'
import type { CredentialVerification } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'valid'; data: CredentialVerification }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string }

/** Fecha corta legible para la credencial. */
function formatDate(raw?: string | null): string {
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/** Página pública que abre el QR de una credencial. */
export function VerifyPage() {
  const { token = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const inFlight = useRef(false)

  const load = useCallback(async () => {
    if (inFlight.current) return
    if (!token) {
      setState({ status: 'invalid', message: 'El enlace no incluye un token de credencial.' })
      return
    }

    inFlight.current = true
    setState({ status: 'loading' })
    try {
      const data = await api.verifyCredential(token)
      setState(data.valid ? { status: 'valid', data } : {
        status: 'invalid',
        message: 'La credencial no es válida o está inactiva.',
      })
    } catch (cause) {
      if (cause instanceof ApiError && cause.status !== 0) {
        // Tokens desconocidos o credenciales inactivas se muestran como inválidos.
        setState({ status: 'invalid', message: cause.message })
        return
      }
      setState({
        status: 'error',
        message:
          cause instanceof Error
            ? cause.message
            : 'No pudimos verificar la credencial. Intentá de nuevo.',
      })
    } finally {
      inFlight.current = false
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load, attempt])

  return (
    <section className="grunge">
      <div className="mx-auto min-h-[70vh] max-w-2xl px-5 py-16 sm:py-24">
        {state.status === 'loading' && (
          <div className="grid place-content-center py-10">
            <Spinner label="Verificando credencial…" />
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="rounded-2xl border border-red-400/40 bg-panel p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
              Credencial no válida
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase">No pudimos verificarla</h1>
            <p className="mt-3 text-mute">{state.message}</p>
            <p className="mt-4 text-sm text-mute">
              Si creés que es un error, contactá al staff del fanclub.
            </p>
            <Link
              to="/"
              className="mt-8 inline-block rounded-md border border-line px-5 py-2.5 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              Volver al inicio
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-2xl border border-line bg-panel p-8 text-center">
            <h1 className="font-display text-3xl uppercase">No pudimos conectar</h1>
            <p className="mt-3 text-mute">{state.message}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-6 rounded-md bg-brand px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-white"
            >
              Reintentar
            </button>
          </div>
        )}

        {state.status === 'valid' && state.data.profile && (
          <div className="overflow-hidden rounded-2xl border border-brand/40 bg-panel">
            <div className="border-b border-line bg-brand/10 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Credencial verificada
              </p>
              <p className="mt-1 text-sm text-mute">
                Verificada el {formatDate(state.data.verified_at)}
              </p>
            </div>

            <div className="flex flex-col items-center gap-5 px-6 py-8 text-center sm:flex-row sm:text-left">
              <Avatar
                name={state.data.profile.name}
                src={state.data.profile.avatar_url}
                size="lg"
              />
              <div className="min-w-0">
                <h1 className="font-display text-3xl uppercase leading-tight">
                  {state.data.profile.name}
                </h1>
                <p className="text-sm text-mute">@{state.data.profile.username}</p>
                <span className="mt-3 inline-block rounded-full border border-brand/50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand">
                  {state.data.profile.tier}
                </span>
              </div>
            </div>

            <dl className="grid gap-4 border-t border-line px-6 py-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-mute">
                  Número de serie
                </dt>
                <dd className="mt-1 break-all font-mono font-bold">
                  {state.data.profile.serial_number}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-mute">Emitida</dt>
                <dd className="mt-1 font-bold">{formatDate(state.data.profile.issued_at)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-mute">
                  Miembro desde
                </dt>
                <dd className="mt-1 font-bold">{formatDate(state.data.profile.joined_at)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
