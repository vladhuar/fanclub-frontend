import { useCallback, useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Alert, Spinner, inputClass } from '../components/ui'
import { api } from '../lib/api'
import { formatLongDate } from '../lib/format'
import type {
  AdminUser,
  Credential,
  Pagination,
  QRTokenResponse,
  UserCounts,
  UserRole,
} from '../types'

const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Miembro',
  staff: 'Staff',
  admin: 'Administrador',
  superadmin: 'Superadmin',
}

type Filter = 'pending' | 'active' | 'all'
type CredentialFilter = 'all' | 'active' | 'inactive'

/** Tamaño de página compartido por los listados del panel admin. */
const PAGE_SIZE = 20

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos completar la acción.'
}

/** Controles de paginación por offset reutilizados por usuarios y credenciales. */
function PaginationControls({
  pagination,
  loading,
  onPage,
}: {
  pagination: Pagination | null
  loading: boolean
  onPage: (offset: number) => void
}) {
  if (!pagination || pagination.total <= pagination.limit) return null

  const page = Math.floor(pagination.offset / pagination.limit) + 1
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.limit))

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Paginación">
      <button
        type="button"
        onClick={() => onPage(Math.max(0, pagination.offset - pagination.limit))}
        disabled={loading || page <= 1}
        className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
      >
        Anterior
      </button>
      <p className="text-sm text-mute">
        Página {page} de {pages}
      </p>
      <button
        type="button"
        onClick={() => onPage(pagination.offset + pagination.limit)}
        disabled={loading || page >= pages}
        className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
      >
        Siguiente
      </button>
    </nav>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        active
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
      }`}
    >
      {active ? 'Activo' : 'Pendiente'}
    </span>
  )
}

/** Panel de administración: aprobación de cuentas y gestión de roles. */
export function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [counts, setCounts] = useState<UserCounts>({ pending: 0, active: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'credentials'>('users')

  // La búsqueda se envía al backend con un pequeño debounce.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setOffset(0)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.listUsers({
        q: query || undefined,
        status: filter,
        limit: PAGE_SIZE,
        offset,
      })
      setUsers(response.data ?? [])
      setPagination(response.pagination)
      setCounts(response.counts)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoading(false)
    }
  }, [filter, offset, query])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  const selectFilter = (value: Filter) => {
    setFilter(value)
    setOffset(0)
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  const canManage = (target: AdminUser): boolean => {
    if (target.id === user.id) return false
    if (user.role === 'superadmin') return true
    return target.role === 'member' || target.role === 'staff'
  }

  const roleOptions = (target: AdminUser): UserRole[] => {
    if (!canManage(target)) return []
    if (user.role === 'superadmin') return ['member', 'staff', 'admin', 'superadmin']
    return ['member', 'staff']
  }

  const changeStatus = async (target: AdminUser, active: boolean) => {
    if (updatingId) return
    setUpdatingId(target.id)
    setError(null)
    setNotice(null)
    try {
      await api.setUserActive(target.id, active)
      setNotice(
        active
          ? `${target.name} fue aprobado y ya puede iniciar sesión.`
          : `${target.name} fue desactivado.`,
      )
      await loadUsers()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setUpdatingId(null)
    }
  }

  const changeRole = async (target: AdminUser, role: UserRole) => {
    if (updatingRoleId) return
    setUpdatingRoleId(target.id)
    setError(null)
    setNotice(null)
    try {
      await api.setUserRole(target.id, role)
      setNotice(`El rol de ${target.name} ahora es ${ROLE_LABELS[role].toLowerCase()}.`)
      await loadUsers()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setUpdatingRoleId(null)
    }
  }

  return (
    <section className="grunge">
      <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Administración</p>
            <h1 className="mt-2 font-display text-[clamp(2.8rem,7vw,5rem)] uppercase leading-none">
              Panel del club
            </h1>
            <p className="mt-3 max-w-xl text-mute">
              Revisá las solicitudes de ingreso, aprobá cuentas y administrá los roles del equipo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={loading}
            className="self-start rounded-md border border-line px-4 py-2.5 font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-60 md:self-auto"
          >
            {loading ? 'Actualizando…' : 'Recargar'}
          </button>
        </div>

        <div className="mt-8 flex gap-2 border-b border-line">
          {(
            [
              ['users', 'Usuarios'],
              ['credentials', 'Credenciales'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                tab === value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-mute hover:text-paper'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {(
            [
              ['pending', 'Pendientes', counts.pending],
              ['active', 'Activos', counts.active],
              ['all', 'Total', counts.total],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => selectFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                filter === value
                  ? 'border-brand bg-brand/10'
                  : 'border-line bg-panel hover:border-brand/60'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wide text-mute">{label}</span>
              <span className="mt-1 block font-display text-4xl leading-none">{count}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="w-full sm:max-w-sm">
            <span className="sr-only">Buscar usuarios</span>
            <input
              type="search"
              className={inputClass}
              placeholder="Buscar por nombre, usuario o email…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <p className="text-sm text-mute">
            {pagination?.total ?? 0}{' '}
            {(pagination?.total ?? 0) === 1 ? 'usuario' : 'usuarios'}
          </p>
        </div>

        {notice && (
          <div className="mt-5">
            <Alert tone="success">{notice}</Alert>
          </div>
        )}
        {error && (
          <div className="mt-5">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        {counts.pending > 0 && filter !== 'pending' && (
          <div className="mt-5">
            <Alert tone="info">
              Hay {counts.pending} {counts.pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de
              aprobación.{' '}
              <button
                type="button"
                onClick={() => selectFilter('pending')}
                className="font-bold text-brand hover:text-white"
              >
                Revisarlas
              </button>
            </Alert>
          </div>
        )}

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="grid place-items-center rounded-2xl border border-line bg-panel py-16">
              <Spinner label="Cargando usuarios…" />
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
              <p className="font-display text-3xl uppercase">
                {filter === 'pending' ? 'No hay solicitudes pendientes' : 'Sin resultados'}
              </p>
              <p className="mx-auto mt-3 max-w-md text-mute">
                {search
                  ? 'Probá con otro nombre, usuario o email.'
                  : filter === 'pending'
                    ? 'Todas las cuentas registradas están aprobadas.'
                    : 'Todavía no hay usuarios para mostrar en este filtro.'}
              </p>
            </div>
          )}

          {!loading &&
            users.map((target) => {
              const manageable = canManage(target)
              const options = roleOptions(target)
              const place = [target.city, target.country].filter(Boolean).join(', ')

              return (
                <article key={target.id} className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <Avatar name={target.name} src={target.avatar_url} size="lg" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-display text-2xl uppercase leading-none">
                          {target.name}
                        </h2>
                        <StatusBadge active={target.active} />
                        <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mute">
                          {ROLE_LABELS[target.role] ?? target.role}
                        </span>
                        {target.id === user.id && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-brand">
                            Vos
                          </span>
                        )}
                      </div>

                      <p className="mt-2 break-all text-sm text-mute">
                        @{target.username} · {target.email}
                      </p>
                      <p className="mt-1 text-sm text-mute">
                        {place || 'Sin ubicación'} · Alta {formatLongDate(target.created_at)}
                        {target.phone ? ` · ${target.phone}` : ''}
                      </p>
                      {target.approved_at && (
                        <p className="mt-1 text-xs text-mute">
                          Aprobado el {formatLongDate(target.approved_at)}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                      {manageable ? (
                        <>
                          {target.active ? (
                            <button
                              type="button"
                              onClick={() => void changeStatus(target, false)}
                              disabled={updatingId === target.id}
                              className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-60"
                            >
                              {updatingId === target.id ? 'Guardando…' : 'Desactivar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void changeStatus(target, true)}
                              disabled={updatingId === target.id}
                              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
                            >
                              {updatingId === target.id ? 'Aprobando…' : 'Aprobar'}
                            </button>
                          )}

                          {options.length > 0 && (
                            <label className="text-xs font-bold uppercase tracking-wide text-mute">
                              <span className="sr-only">Rol de {target.name}</span>
                              <select
                                value={target.role}
                                disabled={updatingRoleId === target.id}
                                onChange={(event) =>
                                  void changeRole(target, event.target.value as UserRole)
                                }
                                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-sm font-bold text-paper focus:border-brand focus:outline-none disabled:opacity-60"
                              >
                                {options.map((role) => (
                                  <option key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </>
                      ) : (
                        <span className="max-w-[10rem] text-xs leading-relaxed text-mute">
                          {target.id === user.id
                            ? 'Tu propia cuenta'
                            : 'Solo un superadmin puede gestionar este perfil.'}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
        </div>

        <PaginationControls
          pagination={pagination}
          loading={loading}
          onPage={(next) => setOffset(Math.max(0, next))}
        />
          </>
        )}

        {tab === 'credentials' && <CredentialsPanel />}
      </div>
    </section>
  )
}

const TIERS = ['Standard', 'VIP', 'Founder'] as const
type Tier = (typeof TIERS)[number]

/** URL interna de verificación para el QR que se muestra en el panel. */
function verifyURL(token: string): string {
  return `${window.location.origin}/verificar/${token}`
}

/** Pestaña de credenciales: emisión, estado y rotación de QR. */
function CredentialsPanel() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<CredentialFilter>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [offset, setOffset] = useState(0)

  const [candidates, setCandidates] = useState<AdminUser[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [selectedUser, setSelectedUser] = useState('')
  const [tier, setTier] = useState<Tier>('Standard')
  const [creating, setCreating] = useState(false)

  const [qr, setQr] = useState<{ credential: Credential; data: QRTokenResponse } | null>(null)

  // La búsqueda se envía al backend con un pequeño debounce.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim())
      setOffset(0)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.listCredentials({
        q: query || undefined,
        status: filter,
        limit: PAGE_SIZE,
        offset,
      })
      setCredentials(response.data ?? [])
      setPagination(response.pagination)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoading(false)
    }
  }, [filter, offset, query])

  useEffect(() => {
    void load()
  }, [load])

  // Los candidatos salen del backend: activos y todavía sin credencial.
  // Se recorren las páginas para no perder cuentas si hay más de 100.
  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true)
    try {
      const collected: AdminUser[] = []
      let nextOffset = 0
      for (;;) {
        const response = await api.listUsers({
          status: 'active',
          credential: 'none',
          limit: 100,
          offset: nextOffset,
        })
        collected.push(...(response.data ?? []))
        nextOffset += response.pagination.limit
        if (nextOffset >= response.pagination.total) break
      }
      setCandidates(collected)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  const eligible = useMemo(
    () => [...candidates].sort((a, b) => a.name.localeCompare(b.name)),
    [candidates],
  )

  useEffect(() => {
    if (!selectedUser && eligible.length > 0) setSelectedUser(eligible[0].id)
    if (selectedUser && !eligible.some((target) => target.id === selectedUser)) {
      setSelectedUser(eligible[0]?.id ?? '')
    }
  }, [eligible, selectedUser])

  const selectFilter = (value: CredentialFilter) => {
    setFilter(value)
    setOffset(0)
  }

  const create = async () => {
    if (!selectedUser || creating) return
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      const created = await api.createCredential({ user_id: selectedUser, tier })
      setNotice(`Credencial ${created.serial_number} emitida.`)
      if (offset === 0) {
        await load()
      } else {
        setOffset(0)
      }
      await loadCandidates()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (credential: Credential) => {
    if (busyId) return
    setBusyId(credential.id)
    setError(null)
    setNotice(null)
    try {
      const updated = await api.setCredentialActive(credential.id, !credential.is_active)
      setNotice(
        updated.is_active
          ? `La credencial ${updated.serial_number} fue activada.`
          : `La credencial ${updated.serial_number} fue desactivada.`,
      )
      await load()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusyId(null)
    }
  }

  const showQR = async (credential: Credential) => {
    if (busyId) return
    setBusyId(credential.id)
    setError(null)
    try {
      const data = await api.credentialQR(credential.id)
      setQr({ credential, data })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusyId(null)
    }
  }

  const rotate = async (credential: Credential) => {
    if (busyId) return
    if (
      !window.confirm(
        'Rotar el QR invalida el anterior. Las credenciales ya impresas dejarán de funcionar. ¿Continuar?',
      )
    ) {
      return
    }
    setBusyId(credential.id)
    setError(null)
    setNotice(null)
    try {
      const data = await api.rotateCredentialQR(credential.id)
      setNotice(`El QR de ${credential.serial_number} fue rotado.`)
      if (qr?.credential.id === credential.id) setQr({ credential, data })
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="font-display text-2xl uppercase">Emitir credencial</h2>
        <p className="mt-1 text-sm text-mute">
          Solo usuarios activos y sin credencial previa. El serial se genera automáticamente.
        </p>

        {loadingCandidates ? (
          <div className="mt-4 grid place-items-center rounded-md border border-dashed border-line px-4 py-6">
            <Spinner label="Buscando candidatos…" />
          </div>
        ) : eligible.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-line px-4 py-3 text-sm text-mute">
            No hay usuarios activos sin credencial.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-mute">
              Usuario
              <select
                value={selectedUser}
                onChange={(event) => setSelectedUser(event.target.value)}
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-sm font-bold text-paper focus:border-brand focus:outline-none"
              >
                {eligible.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name} (@{target.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-mute">
              Nivel
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as Tier)}
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-sm font-bold text-paper focus:border-brand focus:outline-none"
              >
                {TIERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void create()}
              disabled={creating || !selectedUser}
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {creating ? 'Emitiendo…' : 'Emitir'}
            </button>
          </div>
        )}
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase">Credenciales</h2>
        <button
          type="button"
          onClick={() => {
            void load()
            void loadCandidates()
          }}
          disabled={loading}
          className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {loading ? 'Actualizando…' : 'Recargar'}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Buscar credenciales</span>
          <input
            type="search"
            className={inputClass}
            placeholder="Buscar por serial, nombre, usuario o email…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'Todas'],
              ['active', 'Activas'],
              ['inactive', 'Inactivas'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => selectFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
                filter === value
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-mute hover:border-brand/60 hover:text-paper'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid place-items-center rounded-2xl border border-line bg-panel py-16">
          <Spinner label="Cargando credenciales…" />
        </div>
      )}

      {!loading && credentials.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
          <p className="font-display text-3xl uppercase">
            {query || filter !== 'all' ? 'Sin resultados' : 'Todavía no hay credenciales'}
          </p>
          <p className="mt-3 text-mute">
            {query || filter !== 'all'
              ? 'Probá con otro término o cambiá el filtro de estado.'
              : 'Emití la primera con el formulario de arriba.'}
          </p>
        </div>
      )}

      {!loading && credentials.length > 0 && (
        <div className="space-y-3">
          {credentials.map((credential) => {
            const ownerName = credential.user_name || 'Usuario desconocido'
            const ownerUsername = credential.user_username
            return (
              <article
                key={credential.id}
                className="rounded-2xl border border-line bg-panel p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={ownerName} src={credential.user_avatar_url ?? undefined} />
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {ownerName}
                        {ownerUsername && (
                          <span className="ml-2 text-sm font-normal text-mute">@{ownerUsername}</span>
                        )}
                      </p>
                      <p className="mt-0.5 break-all font-mono text-xs text-mute">
                        {credential.serial_number}
                      </p>
                      <p className="mt-1 text-xs text-mute">
                        {credential.tier} · emitida el {formatLongDate(credential.issued_at)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      credential.is_active
                        ? 'border-brand/40 bg-brand/10 text-brand'
                        : 'border-red-400/40 bg-red-400/10 text-red-200'
                    }`}
                  >
                    {credential.is_active ? 'Activa' : 'Inactiva'}
                  </span>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void showQR(credential)}
                      disabled={busyId === credential.id}
                      className="rounded-md border border-line px-3 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      Ver QR
                    </button>
                    <button
                      type="button"
                      onClick={() => void rotate(credential)}
                      disabled={busyId === credential.id}
                      className="rounded-md border border-line px-3 py-2 text-sm font-bold transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      Rotar QR
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(credential)}
                      disabled={busyId === credential.id}
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
                        credential.is_active
                          ? 'border-line hover:border-red-400 hover:text-red-300'
                          : 'border-brand/50 text-brand hover:bg-brand hover:text-ink'
                      }`}
                    >
                      {credential.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <PaginationControls
        pagination={pagination}
        loading={loading}
        onPage={(next) => setOffset(Math.max(0, next))}
      />

      {qr && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-5"
          role="dialog"
          aria-modal="true"
          aria-label="QR de la credencial"
          onClick={() => setQr(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-brand/40 bg-panel p-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              {qr.credential.tier}
            </p>
            <p className="mt-1 break-all font-mono text-sm font-bold">
              {qr.credential.serial_number}
            </p>
            <div className="mx-auto mt-4 w-fit rounded-2xl bg-paper p-3">
              <QRCodeSVG
                value={verifyURL(qr.data.token)}
                size={200}
                bgColor="#f5f3ee"
                fgColor="#0e0e12"
                level="M"
                title={`QR de ${qr.credential.serial_number}`}
              />
            </div>
            <p className="mt-3 text-sm text-mute">
              {qr.credential.user_name || 'Miembro'}
            </p>
            <button
              type="button"
              onClick={() => setQr(null)}
              className="mt-5 rounded-md bg-brand px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
