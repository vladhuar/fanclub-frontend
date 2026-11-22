import { useEffect, useRef, useState, type FormEvent } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Alert, FieldLabel, Spinner, inputClass } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { COUNTRIES } from '../lib/countries'
import { formatLongDate } from '../lib/format'
import type { QRTokenResponse, SessionUser } from '../types'

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

/** Credencial digital con QR verificable, descargable como PNG e imprimible. */
function CredentialCard({ user }: { user: SessionUser }) {
  const [state, setState] = useState<CredentialState>({ status: 'loading' })
  const [downloading, setDownloading] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

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

  const verifyPath = `/verificar/${state.data.token}`
  const verifyURL = `${window.location.origin}${verifyPath}`

  // Compone una credencial completa en un canvas para descargarla como PNG.
  const handleDownload = () => {
    const qr = qrCanvasRef.current
    if (!qr || downloading) return
    setDownloading(true)

    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1000
      canvas.height = 620
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#0e0e12'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#2f9e62'
      ctx.fillRect(0, 0, canvas.width, 14)

      ctx.fillStyle = '#2f9e62'
      ctx.font = 'bold 46px sans-serif'
      ctx.fillText('HUB3', 60, 104)

      ctx.fillStyle = '#f5f3ee'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText('CREDENCIAL DE MIEMBRO', 60, 156)

      ctx.font = 'bold 54px sans-serif'
      ctx.fillText(user.name, 60, 246)

      ctx.fillStyle = '#a1a1aa'
      ctx.font = '30px sans-serif'
      ctx.fillText(`@${user.username}`, 60, 292)

      ctx.fillStyle = '#2f9e62'
      ctx.font = 'bold 18px monospace'
      ctx.fillText('SERIAL', 60, 380)

      ctx.fillStyle = '#f5f3ee'
      ctx.font = 'bold 30px monospace'
      ctx.fillText(state.data.serial_number, 60, 420)

      ctx.fillStyle = '#f5f3ee'
      ctx.fillRect(720, 150, 220, 220)
      ctx.drawImage(qr, 735, 165, 190, 190)

      ctx.fillStyle = '#71717a'
      ctx.font = '20px sans-serif'
      ctx.fillText('Verificá esta credencial escaneando el QR.', 60, 560)

      const link = document.createElement('a')
      link.download = `hub3-credencial-${state.data.serial_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="print-credential overflow-hidden rounded-2xl border border-brand/30 bg-panel">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="mx-auto rounded-2xl bg-paper p-3 sm:mx-0">
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={verifyURL}
            size={512}
            bgColor="#f5f3ee"
            fgColor="#0e0e12"
            level="M"
            title="QR de tu credencial Hub3"
            className="h-[164px] w-[164px]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
            Credencial digital
          </p>
          <p className="mt-2 truncate font-display text-2xl uppercase leading-tight">
            {user.name}
          </p>
          <p className="text-sm text-mute">@{user.username}</p>
          <p className="mt-3 break-all font-mono text-lg font-bold">{state.data.serial_number}</p>
          <p className="mt-2 text-sm leading-relaxed text-mute">
            Escaneá el QR para abrir tu perfil verificable. El token es estable: solo cambia si un
            administrador rota la credencial.
          </p>
          <div className="no-print mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {downloading ? 'Generando…' : 'Descargar PNG'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              Imprimir
            </button>
            <Link
              to={verifyPath}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              Abrir verificación
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Formulario de edición del perfil propio. */
function EditProfileForm({ user, onClose }: { user: SessionUser; onClose: () => void }) {
  const { refreshUser } = useAuth()
  const [username, setUsername] = useState(user.username)
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [country, setCountry] = useState(user.country ?? '')
  const [city, setCity] = useState(user.city ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const response = await api.updateProfile({
        username: username.trim(),
        name: name.trim(),
        phone: phone.trim(),
        country: country.trim().toUpperCase(),
        city: city.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      await refreshUser()
      setSuccess(response.message || 'Perfil actualizado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos actualizar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-6" noValidate>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl uppercase">Editar perfil</p>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-mute hover:text-brand"
        >
          Cancelar
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="profile-username">Nombre de usuario *</FieldLabel>
          <input
            id="profile-username"
            type="text"
            required
            className={inputClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="profile-name">Nombre *</FieldLabel>
          <input
            id="profile-name"
            type="text"
            required
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="profile-phone">Teléfono</FieldLabel>
          <input
            id="profile-phone"
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="profile-country">País</FieldLabel>
          <select
            id="profile-country"
            className={inputClass}
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          >
            <option value="">Sin especificar</option>
            {COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="profile-city">Ciudad</FieldLabel>
          <input
            id="profile-city"
            type="text"
            className={inputClass}
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="profile-avatar">Avatar (URL)</FieldLabel>
          <input
            id="profile-avatar"
            type="url"
            className={inputClass}
            placeholder="https://api.dicebear.com/9.x/identicon/svg?seed=tu-usuario"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
          />
          <p className="mt-2 text-xs leading-relaxed text-mute">
            Pegá una URL pública de imagen (DiceBear, Gravatar o cualquier CDN). No se suben
            archivos de avatar.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert tone="success">{success}</Alert>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

/** Cambio de contraseña con revocación de sesiones en el backend. */
function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return

    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y su confirmación no coinciden.')
      return
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const response = await api.changePassword(currentPassword, newPassword)
      setSuccess(response.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-panel p-6 sm:p-8"
      noValidate
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl uppercase">Cambiar contraseña</p>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-bold text-mute hover:text-brand"
        >
          Cancelar
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <FieldLabel htmlFor="current-password">Contraseña actual *</FieldLabel>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="new-password">Nueva contraseña *</FieldLabel>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="confirm-password">Confirmar contraseña *</FieldLabel>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={inputClass}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-mute">
        Al cambiarla se cierran las demás sesiones. Vas a necesitar iniciar sesión de nuevo cuando
        expire el token actual.
      </p>

      {error && (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert tone="success">{success}</Alert>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          {saving ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </div>
    </form>
  )
}

/** Datos de la sesión, edición de perfil y credencial. */
export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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
            <div className="flex flex-wrap gap-2">
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

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => setEditing((open) => !open)}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              {editing ? 'Cerrar edición' : 'Editar perfil'}
            </button>
            <button
              type="button"
              onClick={() => setChangingPassword((open) => !open)}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              {changingPassword ? 'Cerrar contraseña' : 'Cambiar contraseña'}
            </button>
            <Link
              to={`/u/${user.username}`}
              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand"
            >
              Ver perfil público
            </Link>
          </div>
        </div>

        {editing && (
          <div className="mt-6">
            <EditProfileForm user={user} onClose={() => setEditing(false)} />
          </div>
        )}

        {changingPassword && (
          <div className="mt-6">
            <ChangePasswordForm onClose={() => setChangingPassword(false)} />
          </div>
        )}

        <div className="mt-6">
          <CredentialCard user={user} />
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
