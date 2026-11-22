import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, FieldLabel, Spinner, inputClass } from '../components/ui'
import { MAX_MEDIA_ITEMS, MAX_VIDEOS } from '../config'
import { ApiError, api } from '../lib/api'
import type { MediaInput, Post } from '../types'

/** Edita una publicación propia. Los admins solo pueden eliminarla, no editarla. */
export function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const postID = Number(id)

  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<MediaInput[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    if (!Number.isInteger(postID) || postID <= 0) {
      setError('El identificador de la publicación no es válido.')
      setLoading(false)
      return
    }

    api
      .getPost(postID)
      .then((loaded) => {
        if (!active) return
        setPost(loaded)
        setTitle(loaded.title)
        setContent(loaded.content)
        setMedia(
          loaded.media && loaded.media.length > 0
            ? loaded.media.map((item) => ({ kind: item.kind, url: item.url }))
            : loaded.image_url
              ? [{ kind: 'image', url: loaded.image_url }]
              : [],
        )
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(
          cause instanceof ApiError && cause.status === 404
            ? 'La publicación no existe o fue eliminada.'
            : cause instanceof Error
              ? cause.message
              : 'No pudimos cargar la publicación.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [postID])

  const isAuthor = Boolean(user && post && user.id === post.author.id)

  const addMedia = (kind: MediaInput['kind'], raw: string) => {
    const url = raw.trim()
    if (!url) return

    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('protocolo')
    } catch {
      setError('La URL debe empezar con http:// o https://.')
      return
    }

    if (media.length >= MAX_MEDIA_ITEMS) {
      setError(`Una publicación admite hasta ${MAX_MEDIA_ITEMS} elementos de media.`)
      return
    }
    if (kind === 'video' && media.some((item) => item.kind === 'video')) {
      setError(`Solo se permite ${MAX_VIDEOS} video por publicación.`)
      return
    }

    setMedia((current) => [...current, { kind, url }])
    if (kind === 'image') setImageUrl('')
    else setVideoUrl('')
    setError(null)
  }

  const removeMedia = (index: number) => {
    setMedia((current) => current.filter((_, position) => position !== index))
    setError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || !post) return

    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    if (!cleanTitle) {
      setError('El título es obligatorio.')
      return
    }
    if (!cleanContent) {
      setError('El contenido es obligatorio.')
      return
    }

    setError(null)
    setSaving(true)
    try {
      await api.updatePost(post.id, {
        title: cleanTitle,
        content: cleanContent,
        // Enviar la lista (incluso vacía) reemplaza la media actual.
        media,
      })
      navigate(`/u/${post.author.username}`, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Spinner label="Cargando publicación…" />
      </section>
    )
  }

  if (!post) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Alert tone="error">{error ?? 'No pudimos cargar la publicación.'}</Alert>
        <Link to="/feed" className="mt-6 inline-block font-bold text-brand hover:text-white">
          ← Volver al feed
        </Link>
      </section>
    )
  }

  if (!isAuthor) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16">
        <Alert tone="error">Solo el autor puede editar esta publicación.</Alert>
        <Link
          to={`/u/${post.author.username}`}
          className="mt-6 inline-block font-bold text-brand hover:text-white"
        >
          ← Ver el perfil de {post.author.name}
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mute">Editar historia</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none">Editar publicación</h1>
        </div>
        <Link
          to={`/u/${post.author.username}`}
          className="text-sm font-bold text-mute hover:text-brand"
        >
          ← Volver al perfil
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-line bg-panel p-6 sm:p-8"
        noValidate
      >
        <div className="space-y-5">
          <div>
            <FieldLabel htmlFor="title">Título *</FieldLabel>
            <input
              id="title"
              type="text"
              required
              maxLength={200}
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <p className="mt-1 text-right text-xs text-mute">{title.length}/200</p>
          </div>

          <div>
            <FieldLabel htmlFor="content">Contenido *</FieldLabel>
            <textarea
              id="content"
              required
              rows={8}
              maxLength={20000}
              className={`${inputClass} resize-y`}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <p className="mt-1 text-right text-xs text-mute">{content.length}/20000</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold">Media actual</span>
              <span className="text-xs text-mute">
                {media.length}/{MAX_MEDIA_ITEMS} elementos
              </span>
            </div>

            {media.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-4 text-sm text-mute">
                Esta publicación no tiene imágenes ni videos.
              </p>
            ) : (
              <ul className="space-y-2">
                {media.map((item, index) => (
                  <li
                    key={`${item.url}-${index}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-ink px-3 py-2"
                  >
                    <span className="rounded bg-panel px-2 py-1 text-xs font-bold uppercase tracking-wide text-brand">
                      {item.kind === 'video' ? 'Video' : 'Imagen'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-mute">{item.url}</span>
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="shrink-0 text-sm font-bold text-red-300 hover:text-red-200"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="image-url" optional>
                  Agregar imagen por URL
                </FieldLabel>
                <div className="flex gap-2">
                  <input
                    id="image-url"
                    type="url"
                    className={inputClass}
                    placeholder="https://…"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => addMedia('image', imageUrl)}
                    className="shrink-0 rounded-md border border-line px-3 font-bold hover:border-brand hover:text-brand"
                  >
                    Agregar
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="video-url" optional>
                  Agregar video por URL
                </FieldLabel>
                <div className="flex gap-2">
                  <input
                    id="video-url"
                    type="url"
                    className={inputClass}
                    placeholder="https://youtube.com/…"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => addMedia('video', videoUrl)}
                    className="shrink-0 rounded-md border border-line px-3 font-bold hover:border-brand hover:text-brand"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              Al guardar, la lista mostrada reemplaza la media anterior. Dejarla vacía elimina todas
              las imágenes y videos.
            </p>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={`/u/${post.author.username}`}
              className="rounded-md border border-line px-5 py-3 text-center font-bold hover:border-brand"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
