import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { FEED_PAGE_SIZE } from '../config'
import { api } from '../lib/api'
import type { FeedSort, Pagination, Post } from '../types'
import { PostCard } from './PostCard'
import { Alert, Spinner } from './ui'

function FeedSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-line bg-panel p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-line" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-line" />
              <div className="h-3 w-20 rounded bg-line" />
            </div>
          </div>
          <div className="mt-5 h-8 w-2/3 rounded bg-line" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-line" />
            <div className="h-3 w-11/12 rounded bg-line" />
            <div className="h-3 w-3/4 rounded bg-line" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Listado de publicaciones con sus filtros.
 * Se reutiliza en el inicio (dentro de "Las novedades"), en /feed y en el
 * perfil público (filtrando por autor).
 */
export function PostFeed({
  heading,
  authorId,
}: {
  heading?: string
  authorId?: string
}) {
  const { user } = useAuth()
  const [sort, setSort] = useState<FeedSort>('recent')
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    api
      .listPosts(sort, FEED_PAGE_SIZE, 0, authorId)
      .then((response) => {
        if (!active) return
        setPosts(response.data ?? [])
        setPagination(response.pagination)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'No pudimos cargar el feed.')
        setPosts([])
        setPagination(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [sort, reloadKey, authorId])

  const loadMore = async () => {
    if (!pagination || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await api.listPosts(sort, FEED_PAGE_SIZE, posts.length, authorId)
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id))
        return [...current, ...(response.data ?? []).filter((post) => !seen.has(post.id))]
      })
      setPagination(response.pagination)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar más publicaciones.')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleDeleted = (id: number) => {
    setPosts((current) => current.filter((post) => post.id !== id))
    setPagination((current) =>
      current ? { ...current, total: Math.max(0, current.total - 1) } : current,
    )
  }

  const hasMore = pagination ? posts.length < pagination.total : false

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          {heading && (
            <h2 className="font-display text-5xl uppercase leading-none md:text-6xl">{heading}</h2>
          )}
          <p className={heading ? 'mt-3 text-mute' : 'text-sm text-mute'}>
            {pagination
              ? `${pagination.total} ${pagination.total === 1 ? 'publicación' : 'publicaciones'} de la comunidad`
              : 'Lo último de la comunidad'}
          </p>
        </div>

        <div role="group" aria-label="Ordenar publicaciones" className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setSort('recent')}
            aria-pressed={sort === 'recent'}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
              sort === 'recent' ? 'border-brand bg-brand text-ink' : 'border-line hover:border-brand'
            }`}
          >
            Recientes
          </button>
          <button
            type="button"
            onClick={() => setSort('likes')}
            aria-pressed={sort === 'likes'}
            className={`flex-1 rounded-md border px-4 py-2 text-sm font-bold transition-colors sm:flex-none ${
              sort === 'likes' ? 'border-brand bg-brand text-ink' : 'border-line hover:border-brand'
            }`}
          >
            Más gustadas
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {loading && <FeedSkeleton />}

        {!loading && error && (
          <div className="space-y-4">
            <Alert tone="error">{error}</Alert>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="rounded-md border border-line px-5 py-2.5 font-bold hover:border-brand"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
            <p className="font-display text-4xl uppercase">
              {authorId ? 'Sin publicaciones todavía' : 'Todavía no hay historias'}
            </p>
            <p className="mx-auto mt-3 max-w-md text-mute">
              {authorId
                ? 'Cuando este miembro publique, sus historias van a aparecer acá.'
                : user
                  ? 'Sé la primera persona en compartir un logro con la comunidad.'
                  : 'Cuando los miembros publiquen, sus historias aparecerán acá.'}
            </p>
            {!authorId &&
              (user ? (
                <Link
                  to="/crear"
                  className="mt-6 inline-block rounded-md bg-brand px-6 py-3 font-bold text-ink hover:bg-white"
                >
                  Crear la primera publicación
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="mt-6 inline-block rounded-md bg-brand px-6 py-3 font-bold text-ink hover:bg-white"
                >
                  Unirme a Hub3
                </Link>
              ))}
          </div>
        )}

        {!loading && !error &&
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={handleDeleted} />
          ))}

        {!loading && !error && hasMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-md border border-line px-6 py-3 font-bold transition-colors hover:border-brand disabled:opacity-60"
            >
              {loadingMore ? <Spinner label="Cargando…" /> : 'Ver más'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
