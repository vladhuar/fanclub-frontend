import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { formatPostDate } from '../lib/format'
import type { Comment, Pagination } from '../types'
import { Alert, Spinner, inputClass } from './ui'
import { Avatar } from './Avatar'

const PAGE_SIZE = 10
const MAX_BODY = 2000

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos completar la acción.'
}

/** Aplica un cambio a un comentario del árbol (raíz o respuesta). */
function mapTree(
  list: Comment[],
  id: number,
  updater: (comment: Comment) => Comment,
): Comment[] {
  return list.map((comment) => {
    if (comment.id === id) return updater(comment)
    if (!comment.replies || comment.replies.length === 0) return comment
    return { ...comment, replies: mapTree(comment.replies, id, updater) }
  })
}

/** Quita un comentario del árbol conservando el resto. */
function removeFromTree(list: Comment[], id: number): Comment[] {
  return list
    .filter((comment) => comment.id !== id)
    .map((comment) =>
      comment.replies && comment.replies.length > 0
        ? { ...comment, replies: removeFromTree(comment.replies, id) }
        : comment,
    )
}

/** Busca el comentario padre de una respuesta. */
function findParent(list: Comment[], id: number): Comment | null {
  for (const comment of list) {
    if ((comment.replies ?? []).some((reply) => reply.id === id)) return comment
    const nested = findParent(comment.replies ?? [], id)
    if (nested) return nested
  }
  return null
}

/** Hilo de comentarios de una publicación. */
export function CommentSection({
  postId,
  onCountChange,
}: {
  postId: number
  /** Avisa al post cuántos comentarios sumar o restar (delta). */
  onCountChange?: (delta: number) => void
}) {
  const { user } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [composer, setComposer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set())
  const [loadingRepliesId, setLoadingRepliesId] = useState<number | null>(null)

  const canModerate = user?.role === 'admin' || user?.role === 'superadmin'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.listComments(postId, PAGE_SIZE, 0, 2)
      setComments(response.comments ?? [])
      setTotal(response.total)
      setPagination(response.pagination)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    void load()
  }, [load])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const response = await api.listComments(postId, PAGE_SIZE, comments.length, 2)
      setComments((current) => {
        const seen = new Set(current.map((comment) => comment.id))
        return [...current, ...(response.comments ?? []).filter((comment) => !seen.has(comment.id))]
      })
      setPagination(response.pagination)
      setTotal(response.total)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoadingMore(false)
    }
  }

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const body = composer.trim()
    if (!body || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const created = await api.createComment(postId, { body })
      setComments((current) => [created, ...current])
      setTotal((current) => current + 1)
      setPagination((current) =>
        current ? { ...current, total: current.total + 1 } : current,
      )
      setComposer('')
      onCountChange?.(1)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (event: FormEvent<HTMLFormElement>, parentId: number) => {
    event.preventDefault()
    const body = replyBody.trim()
    if (!body || replySubmitting) return

    setReplySubmitting(true)
    setError(null)
    try {
      const created = await api.createComment(postId, { body, parent_id: parentId })
      setComments((current) =>
        mapTree(current, parentId, (comment) => ({
          ...comment,
          replies: [...(comment.replies ?? []), created],
          replies_total: comment.replies_total + 1,
        })),
      )
      setReplyBody('')
      setReplyTo(null)
      onCountChange?.(1)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setReplySubmitting(false)
    }
  }

  const loadReplies = async (comment: Comment) => {
    if (loadingRepliesId === comment.id) return
    const offset = expandedReplies.has(comment.id) ? (comment.replies?.length ?? 0) : 0
    setLoadingRepliesId(comment.id)
    setError(null)
    try {
      const response = await api.listCommentReplies(postId, comment.id, 50, offset)
      const received = response.replies ?? []
      setComments((current) =>
        mapTree(current, comment.id, (target) => {
          const merged = offset === 0 ? received : [...(target.replies ?? []), ...received]
          return {
            ...target,
            replies: merged,
            replies_total: response.total,
            replies_has_more: merged.length < response.total,
          }
        }),
      )
      setExpandedReplies((current) => new Set(current).add(comment.id))
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setLoadingRepliesId(null)
    }
  }

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditBody(comment.body)
    setConfirmDeleteId(null)
  }

  const saveEdit = async (event: FormEvent<HTMLFormElement>, comment: Comment) => {
    event.preventDefault()
    const body = editBody.trim()
    if (!body || savingEdit) return

    setSavingEdit(true)
    setError(null)
    try {
      const response = await api.updateComment(postId, comment.id, body)
      setComments((current) =>
        mapTree(current, comment.id, (target) => ({ ...target, body: response.comment.body })),
      )
      setEditingId(null)
      setEditBody('')
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setSavingEdit(false)
    }
  }

  const removeComment = async (comment: Comment) => {
    if (deletingId === comment.id) return
    setDeletingId(comment.id)
    setError(null)
    try {
      await api.deleteComment(postId, comment.id)
      const parent = findParent(comments, comment.id)
      setComments((current) => {
        let next = removeFromTree(current, comment.id)
        if (parent) {
          next = mapTree(next, parent.id, (target) => ({
            ...target,
            replies_total: Math.max(0, target.replies_total - 1),
          }))
        }
        return next
      })
      if (!parent) {
        setTotal((current) => Math.max(0, current - 1))
        setPagination((current) =>
          current ? { ...current, total: Math.max(0, current.total - 1) } : current,
        )
      }
      // Al borrar una raíz, la cascada del backend elimina sus respuestas.
      const removed = parent ? 1 : 1 + (comment.replies_total ?? 0)
      onCountChange?.(-removed)
      setConfirmDeleteId(null)
      if (editingId === comment.id) setEditingId(null)
      if (replyTo === comment.id) setReplyTo(null)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setDeletingId(null)
    }
  }

  const renderComment = (comment: Comment, isReply = false) => {
    const own = user?.id === comment.author.id
    const canEdit = own
    const canDelete = own || canModerate
    const editing = editingId === comment.id
    const confirming = confirmDeleteId === comment.id
    const deleting = deletingId === comment.id

    return (
      <div>
        <div className="flex items-start gap-3">
          <Avatar name={comment.author.name} src={comment.author.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-bold leading-tight">{comment.author.name}</p>
              <p className="text-xs text-mute">@{comment.author.username}</p>
              <time dateTime={comment.created_at} className="text-xs text-mute">
                {formatPostDate(comment.created_at)}
              </time>
            </div>

            {editing ? (
              <form onSubmit={(event) => saveEdit(event, comment)} className="mt-2">
                <label htmlFor={`edit-${comment.id}`} className="sr-only">
                  Editar comentario
                </label>
                <textarea
                  id={`edit-${comment.id}`}
                  rows={3}
                  maxLength={MAX_BODY}
                  className={`${inputClass} min-h-[84px] resize-y text-sm`}
                  value={editBody}
                  onChange={(event) => setEditBody(event.target.value)}
                  required
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingEdit || !editBody.trim()}
                    className="rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
                  >
                    {savingEdit ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-bold hover:border-brand"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-paper/90">
                {comment.body}
              </p>
            )}

            {!editing && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold">
                {!isReply && user && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(replyTo === comment.id ? null : comment.id)
                      setReplyBody('')
                      setConfirmDeleteId(null)
                    }}
                    className="text-mute transition-colors hover:text-brand"
                  >
                    Responder
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => startEdit(comment)}
                    className="text-mute transition-colors hover:text-brand"
                  >
                    Editar
                  </button>
                )}
                {canDelete &&
                  (confirming ? (
                    <span className="flex items-center gap-3">
                      <span className="text-mute">¿Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => void removeComment(comment)}
                        disabled={deleting}
                        className="text-red-300 transition-colors hover:text-red-200 disabled:opacity-60"
                      >
                        {deleting ? 'Eliminando…' : 'Sí'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-mute transition-colors hover:text-paper"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(comment.id)
                        setEditingId(null)
                      }}
                      className="text-mute transition-colors hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {replyTo === comment.id && (
          <form
            onSubmit={(event) => submitReply(event, comment.id)}
            className="mt-3 border-l-2 border-brand/40 pl-3"
          >
            <label htmlFor={`reply-${comment.id}`} className="sr-only">
              Responder a {comment.author.name}
            </label>
            <textarea
              id={`reply-${comment.id}`}
              rows={2}
              maxLength={MAX_BODY}
              className={`${inputClass} min-h-[70px] resize-y text-sm`}
              placeholder={`Responder a ${comment.author.name}…`}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              required
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={replySubmitting || !replyBody.trim()}
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
              >
                {replySubmitting ? 'Enviando…' : 'Responder'}
              </button>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="rounded-md border border-line px-3 py-1.5 text-sm font-bold hover:border-brand"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-2xl uppercase">Comentarios</h4>
        {!loading && <span className="text-sm text-mute">{total}</span>}
      </div>

      {user ? (
        <form onSubmit={submitComment}>
          <label htmlFor={`comment-${postId}`} className="sr-only">
            Escribí un comentario
          </label>
          <textarea
            id={`comment-${postId}`}
            rows={3}
            maxLength={MAX_BODY}
            className={`${inputClass} min-h-[90px] resize-y text-sm`}
            placeholder="Sumá tu comentario…"
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-mute">
              {composer.length}/{MAX_BODY}
            </span>
            <button
              type="submit"
              disabled={submitting || !composer.trim()}
              className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {submitting ? 'Publicando…' : 'Comentar'}
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-md border border-line bg-ink px-4 py-3 text-sm text-mute">
          <Link to="/login" className="font-bold text-brand hover:text-white">
            Iniciá sesión
          </Link>{' '}
          para dejar un comentario.
        </p>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Cargando comentarios…" />
      ) : comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-mute">
          Todavía no hay comentarios. Sé la primera persona en participar.
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="space-y-3">
              {renderComment(comment)}

              {(comment.replies?.length ?? 0) > 0 && (
                <ul className="ml-4 space-y-4 border-l border-line pl-4">
                  {comment.replies!.map((reply) => (
                    <li key={reply.id}>{renderComment(reply, true)}</li>
                  ))}
                </ul>
              )}

              {comment.replies_has_more && (
                <button
                  type="button"
                  onClick={() => void loadReplies(comment)}
                  disabled={loadingRepliesId === comment.id}
                  className="ml-4 text-xs font-bold text-brand transition-colors hover:text-white disabled:opacity-60"
                >
                  {loadingRepliesId === comment.id
                    ? 'Cargando respuestas…'
                    : expandedReplies.has(comment.id)
                      ? 'Ver más respuestas'
                      : `Ver ${comment.replies_total} ${
                          comment.replies_total === 1 ? 'respuesta' : 'respuestas'
                        }`}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && pagination && comments.length < pagination.total && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-md border border-line px-4 py-2 text-sm font-bold transition-colors hover:border-brand disabled:opacity-60"
          >
            {loadingMore ? 'Cargando…' : 'Ver más comentarios'}
          </button>
        </div>
      )}
    </div>
  )
}
