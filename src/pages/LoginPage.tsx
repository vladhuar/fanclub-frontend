import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, FieldLabel, inputClass } from '../components/ui'

/** Formulario de acceso con email o nombre de usuario. */
export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const state = location.state as { from?: unknown } | null
  const from =
    state && typeof state.from === 'string' && state.from.startsWith('/') ? state.from : '/'

  if (user) return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    setError(null)
    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      navigate(from, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="grunge">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-mute">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
            Área de miembros
          </p>
          <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] uppercase leading-[.92]">
            Bienvenido
            <br />
            de <span className="text-brand">vuelta</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-mute">
            Entra para publicar novedades, seguir las historias del club y celebrar los logros de la
            comunidad.
          </p>
          <p className="mt-8 text-sm text-mute">
            ¿Todavía no tenés cuenta?{' '}
            <Link to="/register" className="font-bold text-brand hover:text-white">
              Pedí tu acceso
            </Link>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-panel p-6 sm:p-8"
          noValidate
        >
          <h2 className="font-display text-4xl uppercase">Ingresar</h2>
          <p className="mt-2 text-sm text-mute">Usa tu email o nombre de usuario.</p>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel htmlFor="identifier">Email o usuario</FieldLabel>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className={inputClass}
                placeholder="tu@correo.com"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {submitting ? 'Ingresando…' : 'Entrar al club'}
            </button>

            <p className="text-xs leading-relaxed text-mute">
              Si tu cuenta fue creada hace poco, puede estar pendiente de aprobación por un
              administrador.
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
