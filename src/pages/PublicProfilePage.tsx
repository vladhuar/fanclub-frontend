import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { PostFeed } from '../components/PostFeed'
import { Alert, Spinner } from '../components/ui'
import { ApiError, api } from '../lib/api'
import { formatLongDate } from '../lib/format'
import type { UserPublic } from '../types'

/** Perfil público por @username: datos básicos y solo sus publicaciones. */
export function PublicProfilePage() {
  const { username = '' } = useParams<{ username: string }>()
  const { user: sessionUser } = useAuth()

  const [profile, setProfile] = useState<UserPublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    api
      .getPublicUserByUsername(username)
      .then((data) => {
        if (active) setProfile(data)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(
          cause instanceof ApiError && cause.status === 404
            ? 'No encontramos ese perfil. Puede que la cuenta no exista o esté inactiva.'
            : cause instanceof Error
              ? cause.message
              : 'No pudimos cargar el perfil.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [username])

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <Spinner label="Cargando perfil…" />
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-16">
        <Alert tone="error">{error ?? 'No pudimos cargar el perfil.'}</Alert>
        <Link to="/feed" className="mt-6 inline-block font-bold text-brand hover:text-white">
          ← Volver al feed
        </Link>
      </section>
    )
  }

  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const isSelf = sessionUser?.id === profile.id

  return (
    <section className="grunge">
      <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
        <header className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={profile.name} src={profile.avatar_url} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
                Perfil público
              </p>
              <h1 className="mt-1 truncate font-display text-4xl uppercase leading-none">
                {profile.name}
              </h1>
              <p className="mt-1 truncate text-mute">@{profile.username}</p>
            </div>
            {isSelf ? (
              <Link
                to="/perfil"
                className="rounded-md bg-brand px-4 py-2.5 text-center font-bold text-ink transition-colors hover:bg-white"
              >
                Editar mi perfil
              </Link>
            ) : (
              <Link
                to="/feed"
                className="rounded-md border border-line px-4 py-2.5 text-center font-bold transition-colors hover:border-brand hover:text-brand"
              >
                Ver el feed
              </Link>
            )}
          </div>

          <dl className="mt-8 grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Ubicación</dt>
              <dd className="mt-1">{place || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-mute">Miembro desde</dt>
              <dd className="mt-1">{formatLongDate(profile.created_at)}</dd>
            </div>
          </dl>
        </header>

        <div className="mt-10">
          <PostFeed heading="Publicaciones" authorId={profile.id} />
        </div>
      </div>
    </section>
  )
}
