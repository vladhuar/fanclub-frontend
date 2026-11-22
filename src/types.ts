// Tipos que reflejan los DTOs JSON del backend Go.

export interface AuthorSummary {
  id: string
  username: string
  name: string
  avatar_url?: string | null
}

export interface UserPublic {
  id: string
  username: string
  name: string
  avatar_url?: string | null
  country?: string | null
  city?: string | null
  role: string
  created_at: string
}

/** GET /users/me devuelve el usuario completo (incluye email y estado). */
export interface SessionUser extends UserPublic {
  email?: string
  phone?: string
  active?: boolean
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: SessionUser
}

export interface PendingRegistrationResponse {
  message: string
  status: 'pending'
  user: UserPublic
}

export interface RegisterPayload {
  username: string
  name: string
  email: string
  phone: string
  country: string
  city: string
  password_hash: string
}

export type MediaKind = 'image' | 'video'

export interface PostMedia {
  kind: MediaKind
  provider: string
  url: string
  embed_url?: string
  thumbnail_url?: string
  width?: number
  height?: number
}

export interface Post {
  id: number
  title: string
  content: string
  image_url?: string | null
  likes_count: number
  comments_count: number
  liked_by_me: boolean
  created_at: string
  author: AuthorSummary
  media?: PostMedia[] | null
}

export interface Pagination {
  limit: number
  offset: number
  total: number
}

export interface PostListResponse {
  data: Post[] | null
  pagination: Pagination
}

export interface MediaInput {
  kind: MediaKind
  url: string
}

export interface CreatePostPayload {
  title: string
  content: string
  media?: MediaInput[]
}

/** PUT /posts/{id}. Si se omite `media`, el backend conserva la actual. */
export interface UpdatePostPayload {
  title: string
  content: string
  media?: MediaInput[]
  image_url?: string | null
}

/** PUT /users/me acepta los campos editables del perfil propio. */
export interface UpdateProfilePayload {
  username: string
  name: string
  phone: string
  country: string
  city: string
  avatar_url?: string | null
}

export interface UpdateProfileResponse {
  message: string
  user: SessionUser
}

export interface LikeResponse {
  post_id: number
  likes_count: number
  liked: boolean
}

export interface PresignResponse {
  upload_url: string
  public_url: string
  key: string
  expires_at: string
  headers: Record<string, string>
}

export type FeedSort = 'recent' | 'likes'

/** Roles reconocidos por el backend. */
export type UserRole = 'member' | 'staff' | 'admin' | 'superadmin'

/** GET /users devuelve el usuario completo, incluido estado y contacto. */
export interface AdminUser extends UserPublic {
  email: string
  phone?: string
  active: boolean
  role: UserRole
  approved_at?: string | null
  approved_by?: string | null
}

/** Totales del panel admin, independientes de la página solicitada. */
export interface UserCounts {
  pending: number
  active: number
  total: number
}

/** Filtros aceptados por GET /users. */
export interface UserListParams {
  q?: string
  status?: 'all' | 'active' | 'pending'
  /** Solo cuentas activas que todavía no tienen credencial. */
  credential?: 'none'
  limit?: number
  offset?: number
}

export interface UserListResponse {
  data: AdminUser[] | null
  pagination: Pagination
  counts: UserCounts
}

export interface UserUpdateResponse {
  message: string
  user: AdminUser
}

/** Respuesta de /credentials/me/qr y /credentials/{id}/qr. */
export interface QRTokenResponse {
  serial_number: string
  token: string
  qr_url: string
}

/** Credencial tal como la devuelve GET /credentials. */
export interface Credential {
  id: string
  user_id: string
  serial_number: string
  tier: string
  avatar_url?: string | null
  is_active: boolean
  issued_at: string
  /** Datos del dueño incluidos por el backend en el listado admin. */
  user_name?: string
  user_username?: string
  user_avatar_url?: string | null
}

/** Filtros aceptados por GET /credentials. */
export interface CredentialListParams {
  q?: string
  status?: 'all' | 'active' | 'inactive'
  user_id?: string
  limit?: number
  offset?: number
}

export interface CredentialListResponse {
  data: Credential[] | null
  pagination: Pagination
}

export interface CreateCredentialPayload {
  user_id: string
  tier: 'Standard' | 'VIP' | 'Founder'
}

/** Respuesta de GET /credentials/verify/{token}. */
export interface CredentialVerification {
  valid: boolean
  verified_at?: string
  profile?: {
    serial_number: string
    username: string
    name: string
    tier: string
    avatar_url?: string | null
    issued_at: string
    joined_at: string
  }
}

export interface Comment {
  id: number
  post_id: number
  parent_id?: number | null
  body: string
  created_at: string
  author: AuthorSummary
  replies?: Comment[] | null
  replies_total: number
  replies_has_more: boolean
}

export interface CommentListResponse {
  post_id: number
  total: number
  pagination: Pagination
  comments: Comment[] | null
}

export interface CommentRepliesResponse {
  post_id: number
  parent_id: number
  total: number
  pagination: Pagination
  replies: Comment[] | null
}

export interface CreateCommentPayload {
  body: string
  parent_id?: number | null
}

export interface UpdateCommentResponse {
  message: string
  comment: Comment
}
