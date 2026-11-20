import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, api } from '../lib/api'
import { formatPostDate, pluralize } from '../lib/format'
import type { Post, PostMedia } from '../types'
import { Avatar } from './Avatar'
import { CommentSection } from './CommentSection'

function MediaItem({ item }: { item: PostMedia }) {
  if (item.kind === 'video') {
    // YouTube y Vimeo se muestran con el embed canónico que construye el backend.
    if (item.embed_url) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-ink">
          <iframe
            src={item.embed_url}
            title="Video de la publicación"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
    return (
      <video
        controls
        preload="metadata"
        src={item.url}
        className="w-full rounded-xl border border-line bg-ink"
      >
        Tu navegador no puede reproducir este video.
      </video>
    )
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block h-full w-full overflow-hidden rounded-xl border border-line bg-ink"
    >
      <img
        src={item.thumbnail_url ?? item.url}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </a>
  )
}

/** Galería del post; usa image_url como portada si no hay lista de media. */
function PostMediaView({ media, cover }: { media?: PostMedia[] | null; cover?: string | null }) {
  const items: PostMedia[] =
    media && media.length > 0
      ? media
      : cover
        ? [{ kind: 'image', provider: 'legacy', url: cover }]
        : []

  if (items.length === 0) return null

  if (items.length === 1) {
    const only = items[0]
    if (only.kind === 'video') {
      return (
        <div className="mt-5">
          <MediaItem item={only} />
        </div>
      )
    }
    return (
      <div className="mt-5 aspect-[16/10] w-full overflow-hidden rounded-xl border border-line bg-ink">
        <MediaItem item={only} />
      </div>
    )
  }

  return (
    <div className={`mt-5 grid gap-1.5 ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} className="aspect-square overflow-hidden">
          <MediaItem item={item} />
        </div>
      ))}
    </div>
  )
}

/** Tarjeta de publicación del feed con like optimista. */
export function PostCard({ post }: { post: Post }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [liked, setLiked] = useState(post.liked_by_me)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0)
  const [busy, setBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const handleLike = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (busy) return

    const previousLiked = liked
    const previousCount = likesCount
    const nextLiked = !liked

    setBusy(true)
    setLiked(nextLiked)
    setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)))

    try {
      const result = nextLiked ? await api.likePost(post.id) : await api.unlikePost(post.id)
      setLiked(result.liked)
      setLikesCount(result.likes_count)
    } catch (error) {
      // 409 = el like ya existía; 404 = ya no existía. Sincronizamos el contador.
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        setLiked(error.status === 409)
        try {
          const list = await api.listPostLikers(post.id)
          setLikesCount(list.likes_count)
        } catch {
          setLikesCount(previousCount)
        }
      } else {
        setLiked(previousLiked)
        setLikesCount(previousCount)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <header className="flex items-center gap-3">
        <Avatar name={post.author.name} src={post.author.avatar_url} />
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{post.author.name}</p>
          <p className="truncate text-sm text-mute">@{post.author.username}</p>
        </div>
        <time
          dateTime={post.created_at}
          className="ml-auto shrink-0 text-xs text-mute sm:text-sm"
        >
          {formatPostDate(post.created_at)}
        </time>
      </header>

      <h3 className="mt-5 font-display text-3xl uppercase leading-tight">{post.title}</h3>
      <p className="mt-3 whitespace-pre-line leading-relaxed text-paper/90">{post.content}</p>

      <PostMediaView media={post.media} cover={post.image_url} />

      <footer className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={handleLike}
          disabled={busy}
          aria-pressed={liked}
          aria-label={liked ? 'Quitar like' : 'Dar like'}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
            liked ? 'border-brand text-brand' : 'border-line hover:border-brand hover:text-brand'
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          {likesCount} {pluralize(likesCount, 'like', 'likes')}
        </button>

        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${post.id}`}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold transition-colors ${
            commentsOpen
              ? 'border-brand text-brand'
              : 'border-line hover:border-brand hover:text-brand'
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.6 8.6 0 0 1-3.9-.9L3 21l1.9-5.6a8.4 8.4 0 0 1-.9-3.9A8.5 8.5 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z" />
          </svg>
          Comentarios{commentsCount > 0 ? ` · ${commentsCount}` : ''}
        </button>

        <Link
          to="/crear"
          className="ml-auto text-sm font-medium text-mute transition-colors hover:text-brand"
        >
          Compartir algo tuyo →
        </Link>
      </footer>

      {commentsOpen && (
        <div id={`comments-${post.id}`} className="mt-5 border-t border-line pt-5">
          <CommentSection
            postId={post.id}
            onCountChange={(delta) =>
              setCommentsCount((current) => Math.max(0, current + delta))
            }
          />
        </div>
      )}
    </article>
  )
}
