import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Alert, Spinner } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { formatLongDate } from '../lib/format'
import type { QRTokenResponse } from '../types'

const ROLE_LABELS: Record<string, string> = {
  member: 'Miembro',
  staff: 'Staff',
  admin: 'Administrador',
  superadmin: 'Superadmin',
}

type CredentialState =
  | { status: 'loading' }
  | { status: 'ready'; data: QRTokenResponse }
  | { status: 'missing' }
  | { status: 'inactive' }
  | { status: 'error'; message: string }

/** Credencial digital con QR verificable. */
function CredentialCard() {
  const [state, setState] = useState<CredentialState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    api
      .myQR()
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((cause: unknown) => {
        if (!active) return
        if (cause instanceof ApiError && cause.status === 404) {
          setState({ status: 'missing' })
        } else if (cause instanceof ApiError && cause.status === 409) {
          setState({ status: 'inactive' })
        } else {
          setState({
            status: 'error',
            message:
              cause instanceof Error ? cause.message : 'No pudimos cargar tu credencial.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="rounded-2xl border border-line bg-panel p-6">
        <Spinner label="Cargando credencial…" />
      </div>
    )
  }

  if (state.status === 'missing' || state.status === 'inactive') {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-panel p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Credencial digital</p>
        <p className="mt-2 font-display text-2xl uppercase">
          {state.status === 'inactive' ? 'Credencial inactiva' : 'Todavía sin credencial'}
        </p>
        <p className="mt-2 max-w-xl text-sm text-mute">
          {state.status === 'inactive'
            ? 'Un administrador puede reactivarla. Mientras tanto, el QR no estará disponible.'
            : 'Cuando un administrador emita tu credencial, acá vas a encontrar tu serial y el QR verificable.'}
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return <Alert tone="error">{state.message}</Alert>
  }

  if (state.status === 'ready') {
    const verifyPath = `/verificar/${state.data.token}`
    const verifyURL = `${window.location.origin}${verifyPath}`

    return (
      <div className="overflow-hidden rounded-2xl border border-brand/30 bg-panel">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="mx-auto rounded-2xl bg-paper p-3 sm:mx-0">
            <QRCodeSVG
              value={verifyURL}
              size={164}
              bgColor="#f5f3ee"
              fgColor="#0e0e12"
              level="M"
              title="QR de tu credencial Hub3"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Credencial digital
            </p>
            <p className="mt-2 break-all font-mono text-lg font-bold">{state.data.serial_number}</p>
            <p className="mt-2 text-sm leading-relaxed text-mute">
              Escaneá el QR para abrir tu perfil verificable. El token es estable: solo cambia si
              un administrador rota la credencial.
            </p>
            <Link
              to={verifyPath}
              className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              Abrir verificación
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/** Datos de la sesión y atajos de la cuenta. */
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const handleLogout = async () => {
    // Salir del perfil navegando primero evita el redirect de ProtectedRoute.
    navigate('/', { replace: true })
    await logout()
  }

  const place = [user.city, user.country].filter(Boolean).join(', ')

  return (
    <section className="grunge">
      <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={user.name} src={user.avatar_url} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
              <h1 className="mt-1 truncate font-display text-4xl uppercase leading-none">
                {user.name}
              </h1>
              <p className="mt-1 text-mute">@{user.username}</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/crear"
                className="rounded-md bg-brand px-4 py-2.5 font-bold text-ink hover:bg-white"
              >
                Publicar
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-line px-4 py-2.5 font-bold hover:border-brand hover:text-brand"
              >
                Salir
              </button>
            </div>
          </div>

          <dl className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Email</dt>
              <dd className="mt-1 break-all">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Teléfono</dt>
              <dd className="mt-1">{user.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Ubicación</dt>
              <dd className="mt-1">{place || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Miembro desde</dt>
              <dd className="mt-1">{formatLongDate(user.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <CredentialCard />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            to="/"
            className="rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-brand"
          >
            <p className="font-display text-2xl uppercase">Ver el feed</p>
            <p className="mt-2 text-sm text-mute">Volvé a las historias de la comunidad.</p>
          </Link>
          <Link
            to="/crear"
            className="rounded-2xl bg-brand p-6 text-ink transition-colors hover:bg-white"
          >
            <p className="font-display text-2xl uppercase">Nueva publicación</p>
            <p className="mt-2 text-sm">Compartí un logro con fotos o video.</p>
          </Link>
        </div>
      </div>
    </section>
  )
}
