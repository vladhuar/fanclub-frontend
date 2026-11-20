import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, FieldLabel, inputClass } from '../components/ui'
import { COUNTRIES } from '../lib/countries'

interface FormState {
  username: string
  name: string
  email: string
  phone: string
  country: string
  city: string
  password: string
  confirm: string
}

const emptyForm: FormState = {
  username: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  city: '',
  password: '',
  confirm: '',
}

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form: FormState): string | null {
  if (!USERNAME_REGEX.test(form.username.trim())) {
    return 'El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo.'
  }
  if (!form.name.trim()) return 'Escribe tu nombre.'
  if (!EMAIL_REGEX.test(form.email.trim())) return 'Escribe un correo electrónico válido.'
  if (form.phone.trim().length > 30) return 'El teléfono no puede superar los 30 caracteres.'
  if (form.city.trim().length > 100) return 'La ciudad no puede superar los 100 caracteres.'
  if (
    form.password.length < 8 ||
    !/[A-Z]/.test(form.password) ||
    !/[0-9]/.test(form.password) ||
    !/[!@#$%^&*(),.?":{}|<>]/.test(form.password)
  ) {
    return 'La contraseña necesita al menos 8 caracteres, una mayúscula, un número y un símbolo.'
  }
  if (form.password !== form.confirm) return 'Las contraseñas no coinciden.'
  return null
}

/** Registro con aprobación de un administrador (202 Accepted). */
export function RegisterPage() {
  const { user, register } = useAuth()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Un miembro con sesión no necesita ver el formulario de solicitud.
  if (user) return <Navigate to="/" replace />

  const update = (field: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      const response = await register({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        country: form.country,
        city: form.city.trim(),
        password_hash: form.password,
      })
      setPendingMessage(response.message)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos completar el registro.')
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingMessage) {
    return (
      <section className="grunge">
        <div className="mx-auto max-w-2xl px-5 py-20">
          <div className="rounded-2xl border border-line bg-panel p-8 text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-3xl text-ink"
            >
              ✓
            </span>
            <h1 className="mt-6 font-display text-5xl uppercase leading-none">Solicitud enviada</h1>
            <p className="mx-auto mt-4 max-w-md text-mute">{pendingMessage}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-mute">
              Cuando un administrador apruebe tu cuenta vas a poder iniciar sesión con tu email o
              usuario.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-block rounded-md bg-brand px-6 py-3 font-bold text-ink hover:bg-white"
            >
              Ir a ingresar
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="grunge">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:py-24 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-mute">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
            Membresía Hub3
          </p>
          <h1 className="font-display text-[clamp(3rem,8vw,5.5rem)] uppercase leading-[.92]">
            Sumate
            <br />
            al <span className="text-brand">club</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-mute">
            Contanos quién sos. Un administrador revisa cada solicitud antes de activar la cuenta.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-mute">
            <li className="flex gap-3">
              <span className="text-brand" aria-hidden="true">
                ★
              </span>
              Publica proyectos, fotos y videos.
            </li>
            <li className="flex gap-3">
              <span className="text-brand" aria-hidden="true">
                ★
              </span>
              Seguí las historias de la comunidad.
            </li>
            <li className="flex gap-3">
              <span className="text-brand" aria-hidden="true">
                ★
              </span>
              Accedé a la credencial digital del club.
            </li>
          </ul>
          <p className="mt-8 text-sm text-mute">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-bold text-brand hover:text-white">
              Ingresar
            </Link>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-panel p-6 sm:p-8"
          noValidate
        >
          <h2 className="font-display text-4xl uppercase">Solicitar acceso</h2>
          <p className="mt-2 text-sm text-mute">
            Los campos con <span aria-hidden="true">*</span> son obligatorios.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="username">Usuario *</FieldLabel>
              <input
                id="username"
                type="text"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                className={inputClass}
                placeholder="ana.dev"
                value={form.username}
                onChange={(event) => update('username')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="name">Nombre *</FieldLabel>
              <input
                id="name"
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                className={inputClass}
                placeholder="Ana Torres"
                value={form.name}
                onChange={(event) => update('name')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="email">Email *</FieldLabel>
              <input
                id="email"
                type="email"
                required
                maxLength={100}
                autoComplete="email"
                className={inputClass}
                placeholder="ana@correo.com"
                value={form.email}
                onChange={(event) => update('email')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="phone" optional>
                Teléfono
              </FieldLabel>
              <input
                id="phone"
                type="tel"
                maxLength={30}
                autoComplete="tel"
                className={inputClass}
                placeholder="+54 11 5555 5555"
                value={form.phone}
                onChange={(event) => update('phone')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="country" optional>
                País
              </FieldLabel>
              <select
                id="country"
                className={inputClass}
                value={form.country}
                onChange={(event) => update('country')(event.target.value)}
              >
                <option value="">Selecciona un país</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel htmlFor="city" optional>
                Ciudad
              </FieldLabel>
              <input
                id="city"
                type="text"
                maxLength={100}
                autoComplete="address-level2"
                className={inputClass}
                placeholder="Buenos Aires"
                value={form.city}
                onChange={(event) => update('city')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="password">Contraseña *</FieldLabel>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Mín. 8 con mayúscula, número y símbolo"
                value={form.password}
                onChange={(event) => update('password')(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="confirm">Repetir contraseña *</FieldLabel>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Repetí la contraseña"
                value={form.confirm}
                onChange={(event) => update('confirm')(event.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="mt-5">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-bold text-ink transition-colors hover:bg-white disabled:opacity-60"
          >
            {submitting ? 'Enviando solicitud…' : 'Solicitar acceso'}
          </button>

          <p className="mt-4 text-xs leading-relaxed text-mute">
            Tu cuenta quedará pendiente hasta que un administrador la apruebe. No se emiten tokens
            durante el registro.
          </p>
        </form>
      </div>
    </section>
  )
}
