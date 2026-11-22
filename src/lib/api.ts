import { API_URL, TOKEN_STORAGE_KEY } from '../config'
import type {
  AdminUser,
  AuthResponse,
  Comment,
  CommentListResponse,
  CommentRepliesResponse,
  CreateCommentPayload,
  CreateCredentialPayload,
  CreatePostPayload,
  Credential,
  CredentialVerification,
  FeedSort,
  LikeResponse,
  PendingRegistrationResponse,
  Post,
  PostListResponse,
  PresignResponse,
  QRTokenResponse,
  RegisterPayload,
  SessionUser,
  UpdateCommentResponse,
  UpdatePostPayload,
  UpdateProfilePayload,
  UpdateProfileResponse,
  UserPublic,
  UserRole,
  UserUpdateResponse,
} from '../types'

/** Error HTTP con el mensaje devuelto por el backend. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export interface StoredTokens {
  access_token: string
  refresh_token: string
  expires_at: number
}

type SessionListener = (tokens: StoredTokens | null) => void

const listeners = new Set<SessionListener>()

// El estado de sesión vive en memoria y se refleja en localStorage.
let currentTokens: StoredTokens | null = readStoredTokens()
let refreshPromise: Promise<StoredTokens> | null = null

function readStoredTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTokens>
    if (!parsed.access_token || !parsed.refresh_token) return null
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      expires_at: typeof parsed.expires_at === 'number' ? parsed.expires_at : 0,
    }
  } catch {
    return null
  }
}

function persistTokens(tokens: StoredTokens | null): void {
  currentTokens = tokens
  try {
    if (tokens) localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // localStorage puede fallar en modo privado; la sesión sigue en memoria.
  }
  listeners.forEach((listener) => listener(tokens))
}

/** Devuelve la sesión actual o null. */
export function getTokens(): StoredTokens | null {
  return currentTokens
}

/** Borra la sesión local sin llamar al backend. */
export function clearTokens(): void {
  persistTokens(null)
}

/** Permite a AuthContext reaccionar a refresh/expiración. */
export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function storeAuthResponse(auth: AuthResponse): StoredTokens {
  const tokens: StoredTokens = {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    expires_at: Date.now() + auth.expires_in * 1000,
  }
  persistTokens(tokens)
  return tokens
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.error === 'string' && record.error) return record.error
    if (typeof record.message === 'string' && record.message) return record.message
  }
  if (typeof data === 'string' && data) return data
  return `Error ${status} al comunicarse con el servidor`
}

async function performRefresh(): Promise<StoredTokens> {
  const refreshToken = currentTokens?.refresh_token
  if (!refreshToken) {
    persistTokens(null)
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.')
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {
    throw new ApiError(
      0,
      'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    )
  })
  const data = await parseBody(response)
  if (!response.ok) {
    persistTokens(null)
    throw new ApiError(response.status, errorMessage(data, response.status))
  }
  return storeAuthResponse(data as AuthResponse)
}

function refreshTokens(): Promise<StoredTokens> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  retried?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth && currentTokens) {
    headers.Authorization = `Bearer ${currentTokens.access_token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new ApiError(
      0,
      'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    )
  })

  // Si el access token expiró, se renueva una sola vez y se reintenta.
  if (response.status === 401 && auth && !options.retried && currentTokens?.refresh_token) {
    await refreshTokens()
    return request<T>(path, { ...options, retried: true })
  }

  const data = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data, response.status))
  }
  return data as T
}

export const api = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const auth = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    })
    storeAuthResponse(auth)
    return auth
  },

  register(payload: RegisterPayload): Promise<PendingRegistrationResponse> {
    return request<PendingRegistrationResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    })
  },

  logout(refreshToken: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    })
  },

  me(): Promise<SessionUser> {
    return request<SessionUser>('/users/me', { auth: true })
  },

  listPosts(
    sort: FeedSort,
    limit: number,
    offset: number,
    authorId?: string,
  ): Promise<PostListResponse> {
    const params = new URLSearchParams({
      sort,
      limit: String(limit),
      offset: String(offset),
    })
    if (authorId) params.set('author_id', authorId)
    // auth: true envía el token si existe para recibir liked_by_me.
    // El endpoint es público, así que sin sesión sigue funcionando.
    return request<PostListResponse>(`/posts?${params.toString()}`, { auth: true })
  },

  getPost(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}`, { auth: true })
  },

  createPost(payload: CreatePostPayload): Promise<Post> {
    return request<Post>('/posts', { method: 'POST', body: payload, auth: true })
  },

  updatePost(id: number, payload: UpdatePostPayload): Promise<Post> {
    return request<Post>(`/posts/${id}`, { method: 'PUT', body: payload, auth: true })
  },

  deletePost(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/posts/${id}`, { method: 'DELETE', auth: true })
  },

  getPublicUserByUsername(username: string): Promise<UserPublic> {
    return request<UserPublic>(`/users/by-username/${encodeURIComponent(username)}`)
  },

  updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResponse> {
    return request<UpdateProfileResponse>('/users/me', {
      method: 'PUT',
      body: payload,
      auth: true,
    })
  },

  changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/users/me/password', {
      method: 'PATCH',
      body: { current_password: currentPassword, new_password: newPassword },
      auth: true,
    })
  },

  likePost(postID: number): Promise<LikeResponse> {
    return request<LikeResponse>(`/posts/${postID}/likes`, { method: 'POST', auth: true })
  },

  unlikePost(postID: number): Promise<LikeResponse> {
    return request<LikeResponse>(`/posts/${postID}/likes`, { method: 'DELETE', auth: true })
  },

  listPostLikers(postID: number): Promise<LikeResponse & { users: unknown[] }> {
    return request<LikeResponse & { users: unknown[] }>(`/posts/${postID}/likes`)
  },

  presignUpload(contentType: string, filename: string): Promise<PresignResponse> {
    return request<PresignResponse>('/uploads/presign', {
      method: 'POST',
      body: { content_type: contentType, filename },
      auth: true,
    })
  },

  myQR(): Promise<QRTokenResponse> {
    return request<QRTokenResponse>('/credentials/me/qr', { auth: true })
  },

  listCredentials(userID?: string): Promise<Credential[]> {
    const query = userID ? `?user_id=${encodeURIComponent(userID)}` : ''
    return request<Credential[]>(`/credentials${query}`, { auth: true })
  },

  createCredential(payload: CreateCredentialPayload): Promise<Credential> {
    return request<Credential>('/credentials', { method: 'POST', body: payload, auth: true })
  },

  setCredentialActive(id: string, isActive: boolean): Promise<Credential> {
    return request<Credential>(`/credentials/${id}`, {
      method: 'PATCH',
      body: { is_active: isActive },
      auth: true,
    })
  },

  credentialQR(id: string): Promise<QRTokenResponse> {
    return request<QRTokenResponse>(`/credentials/${id}/qr`, { auth: true })
  },

  rotateCredentialQR(id: string): Promise<QRTokenResponse> {
    return request<QRTokenResponse>(`/credentials/${id}/rotate-qr`, {
      method: 'POST',
      auth: true,
    })
  },

  verifyCredential(token: string): Promise<CredentialVerification> {
    return request<CredentialVerification>(`/credentials/verify/${encodeURIComponent(token)}`)
  },

  listUsers(): Promise<AdminUser[]> {
    return request<AdminUser[]>('/users', { auth: true })
  },

  setUserActive(id: string, active: boolean): Promise<UserUpdateResponse> {
    return request<UserUpdateResponse>(`/users/${id}`, {
      method: 'PATCH',
      body: { active },
      auth: true,
    })
  },

  setUserRole(id: string, role: UserRole): Promise<UserUpdateResponse> {
    return request<UserUpdateResponse>(`/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
      auth: true,
    })
  },

  listComments(
    postID: number,
    limit = 10,
    offset = 0,
    repliesLimit = 2,
  ): Promise<CommentListResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      replies_limit: String(repliesLimit),
    })
    return request<CommentListResponse>(`/posts/${postID}/comments?${params.toString()}`)
  },

  createComment(postID: number, payload: CreateCommentPayload): Promise<Comment> {
    return request<Comment>(`/posts/${postID}/comments`, {
      method: 'POST',
      body: payload,
      auth: true,
    })
  },

  listCommentReplies(
    postID: number,
    commentID: number,
    limit = 50,
    offset = 0,
  ): Promise<CommentRepliesResponse> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    return request<CommentRepliesResponse>(
      `/posts/${postID}/comments/${commentID}/replies?${params.toString()}`,
    )
  },

  updateComment(postID: number, commentID: number, body: string): Promise<UpdateCommentResponse> {
    return request<UpdateCommentResponse>(`/posts/${postID}/comments/${commentID}`, {
      method: 'PUT',
      body: { body },
      auth: true,
    })
  },

  deleteComment(postID: number, commentID: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/posts/${postID}/comments/${commentID}`, {
      method: 'DELETE',
      auth: true,
    })
  },
}

/** Sube el archivo directo al almacenamiento con la URL firmada. */
export async function uploadFileToStorage(presign: PresignResponse, file: File): Promise<void> {
  const response = await fetch(presign.upload_url, {
    method: 'PUT',
    headers: presign.headers,
    body: file,
  }).catch(() => {
    throw new ApiError(
      0,
      'No pudimos subir la imagen. Revisá tu conexión y la configuración de CORS del bucket.',
    )
  })
  if (!response.ok) {
    throw new ApiError(
      response.status,
      'No se pudo subir la imagen al almacenamiento. Revisa la configuración de CORS del bucket.',
    )
  }
}
