import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Avatar'
import { Alert, FieldLabel, Spinner, inputClass } from '../components/ui'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_MEDIA_ITEMS,
  MAX_VIDEOS,
} from '../config'
import { api, uploadFileToStorage } from '../lib/api'
import type { MediaInput } from '../types'

interface SelectedImage {
  id: string
  file: File
  previewUrl: string
}

/** Crea un post subiendo imágenes con URL firmada y aceptando video por URL. */
export function CreatePostPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<SelectedImage[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef<string[]>([])

  // Libera las previews al desmontar para no filtrar memoria.
  useEffect(() => {
    const urls = objectUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const videoCount = videoUrl.trim() ? 1 : 0
  const mediaCount = images.length + videoCount
  const canAddMore = mediaCount < MAX_MEDIA_ITEMS

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (selected.length === 0) return

    setError(null)
    const available = MAX_MEDIA_ITEMS - mediaCount
    const accepted: SelectedImage[] = []

    for (const file of selected) {
      if (accepted.length >= available) break
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('Solo se aceptan imágenes JPG, PNG o WebP.')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError('Cada imagen debe pesar como máximo 10 MB.')
        continue
      }
      const previewUrl = URL.createObjectURL(file)
      objectUrls.current.push(previewUrl)
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        previewUrl,
      })
    }

    if (accepted.length > 0) {
      setImages((current) => [...current, ...accepted])
    }
    if (selected.length > accepted.length && available > 0) {
      setError(`Podés adjuntar hasta ${MAX_MEDIA_ITEMS} elementos por publicación.`)
    }
  }

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((image) => image.id !== id)
    })
    setError(null)
  }

  const handleVideoChange = (value: string) => {
    setVideoUrl(value)
    if (value.trim() && images.length > MAX_MEDIA_ITEMS - MAX_VIDEOS) {
      setError('Con un video podés subir hasta 5 imágenes.')
    } else {
      setError(null)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    const cleanVideo = videoUrl.trim()

    if (!cleanTitle) {
      setError('El título es obligatorio.')
      return
    }
    if (!cleanContent) {
      setError('El contenido es obligatorio.')
      return
    }
    if (mediaCount > MAX_MEDIA_ITEMS) {
      setError(`Una publicación admite hasta ${MAX_MEDIA_ITEMS} elementos de media.`)
      return
    }

    if (cleanVideo) {
      try {
        const parsed = new URL(cleanVideo)
        if (parsed.protocol !== 'https:') throw new Error('protocolo')
      } catch {
        setError('El video debe ser una URL https válida (YouTube, Vimeo o archivo directo).')
        return
      }
    }

    setError(null)
    setSubmitting(true)

    try {
      const media: MediaInput[] = []

      for (let index = 0; index < images.length; index += 1) {
        setProgress(`Subiendo imagen ${index + 1} de ${images.length}…`)
        const image = images[index]
        const presign = await api.presignUpload(image.file.type, image.file.name)
        await uploadFileToStorage(presign, image.file)
        media.push({ kind: 'image', url: presign.public_url })
      }

      if (cleanVideo) {
        setProgress('Publicando…')
        media.push({ kind: 'video', url: cleanVideo })
      } else {
        setProgress('Publicando…')
      }

      await api.createPost({ title: cleanTitle, content: cleanContent, media })
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos crear la publicación.')
    } finally {
      setProgress(null)
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mute">Nueva historia</p>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none md:text-6xl">
            Crear publicación
          </h1>
        </div>
        <Link to="/" className="text-sm font-bold text-mute hover:text-brand">
          ← Volver al feed
        </Link>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-panel p-6 sm:p-8"
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
                placeholder="Lanzamos nuestra primera versión"
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
                rows={7}
                maxLength={20000}
                className={`${inputClass} resize-y`}
                placeholder="Contá qué pasó, quién participó y por qué es importante para la comunidad…"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <p className="mt-1 text-right text-xs text-mute">{content.length}/20000</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold">Imágenes</span>
                <span className="text-xs text-mute">
                  {mediaCount}/{MAX_MEDIA_ITEMS} elementos
                </span>
              </div>

              {images.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-ink"
                    >
                      <img
                        src={image.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label="Quitar imagen"
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/85 text-paper transition-colors hover:bg-brand hover:text-ink"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(',')}
                multiple
                className="sr-only"
                onChange={handleFiles}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAddMore || submitting}
                className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-line bg-ink px-4 py-6 text-sm transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="font-bold text-paper">Elegir imágenes</span>
                <span className="text-xs text-mute">
                  JPG, PNG o WebP · hasta 10 MB · máximo {MAX_MEDIA_ITEMS} elementos
                </span>
              </button>
            </div>

            <div>
              <FieldLabel htmlFor="video" optional>
                Video por URL
              </FieldLabel>
              <input
                id="video"
                type="url"
                className={inputClass}
                placeholder="https://www.youtube.com/watch?v=…"
                value={videoUrl}
                onChange={(event) => handleVideoChange(event.target.value)}
              />
              <p className="mt-2 text-xs leading-relaxed text-mute">
                YouTube, Vimeo o un archivo MP4/WebM directo. Los videos se agregan por URL; no se
                suben archivos de video. Máximo {MAX_VIDEOS} video por publicación.
              </p>
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            {progress && <Spinner label={progress} />}

            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-end">
              <Link
                to="/"
                className="rounded-md border border-line px-5 py-3 text-center font-bold hover:border-brand"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
              >
                {submitting ? 'Publicando…' : 'Publicar'}
              </button>
            </div>
          </div>
        </form>

        {/* VISTA PREVIA */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-mute">
            Vista previa
          </p>
          <article className="rounded-2xl border border-line bg-panel p-5">
            <header className="flex items-center gap-3">
              <Avatar name={user?.name ?? 'Invitado'} src={user?.avatar_url} />
              <div className="min-w-0">
                <p className="truncate font-bold leading-tight">{user?.name ?? 'Tu nombre'}</p>
                <p className="truncate text-sm text-mute">@{user?.username ?? 'usuario'}</p>
              </div>
            </header>

            <h2 className="mt-5 break-words font-display text-3xl uppercase leading-tight">
              {title.trim() || 'Tu título acá'}
            </h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-paper/90">
              {content.trim() || 'El contenido de tu publicación aparecerá en este espacio.'}
            </p>

            {images.length > 0 && (
              <div
                className={`mt-5 grid gap-1.5 ${
                  images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`overflow-hidden rounded-lg border border-line bg-ink ${
                      images.length === 1 ? 'aspect-[16/10]' : 'aspect-square'
                    }`}
                  >
                    <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {videoUrl.trim() && (
              <div className="mt-3 rounded-lg border border-line bg-ink p-4 text-sm">
                <p className="font-bold text-brand">Video adjunto</p>
                <p className="mt-1 break-all text-mute">{videoUrl.trim()}</p>
              </div>
            )}
          </article>
          <p className="mt-4 text-xs leading-relaxed text-mute">
            Las imágenes se suben directo al almacenamiento con una URL firmada. El video se valida
            contra la lista de proveedores permitidos del backend.
          </p>
        </aside>
      </div>
    </section>
  )
}
