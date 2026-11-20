import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from './Avatar'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `transition-colors hover:text-brand ${isActive ? 'text-brand' : ''}`

/** Cabecera, contenido y pie comunes a todas las rutas. */
export function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // Cierra el menú móvil y vuelve arriba al cambiar de ruta.
  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  const handleLogout = async () => {
    // Navegar antes de limpiar la sesión evita que ProtectedRoute redirija a /login.
    navigate('/', { replace: true })
    await logout()
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-paper">
      <header
        className="sticky z-50 border-b border-line bg-ink/90 backdrop-blur"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-3xl leading-none tracking-wide"
            aria-label="Hub3, inicio"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand text-ink">H</span>
            <span>
              HUB<span className="text-brand">3</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Principal">
            <NavLink to="/" end className={navLinkClass}>
              Inicio
            </NavLink>
            <NavLink to="/feed" className={navLinkClass}>
              Feed
            </NavLink>
            <NavLink to="/discografia" className={navLinkClass}>
              Discografía
            </NavLink>
            <NavLink to="/crear" className={navLinkClass}>
              Publicar
            </NavLink>
            {user ? (
              <>
                <NavLink to="/perfil" className={navLinkClass}>
                  Mi perfil
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    Admin
                  </NavLink>
                )}
                <div className="flex items-center gap-3 border-l border-line pl-6">
                  <Link to="/perfil" className="flex items-center gap-2 hover:text-brand">
                    <Avatar name={user.name} src={user.avatar_url} size="sm" />
                    <span className="max-w-[10rem] truncate">{user.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md border border-line px-3 py-2 font-bold transition-colors hover:border-brand hover:text-brand"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 border-l border-line pl-6">
                <NavLink to="/login" className={navLinkClass}>
                  Ingresar
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-md bg-brand px-4 py-2 font-bold text-ink transition-colors hover:bg-white"
                >
                  Unirme
                </NavLink>
              </div>
            )}
          </nav>

          <button
            id="burger"
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md border border-line md:hidden"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobileNav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <nav
            id="mobileNav"
            className="border-t border-line bg-ink px-5 pb-4 text-sm font-medium md:hidden"
            aria-label="Móvil"
          >
            <NavLink to="/" end className="block py-3">
              Inicio
            </NavLink>
            <NavLink to="/feed" className="block py-3">
              Feed
            </NavLink>
            <NavLink to="/discografia" className="block py-3">
              Discografía
            </NavLink>
            <NavLink to="/crear" className="block py-3">
              Publicar
            </NavLink>
            {user ? (
              <>
                <NavLink to="/perfil" className="block py-3">
                  Mi perfil
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className="block py-3">
                    Admin
                  </NavLink>
                )}
                <button type="button" onClick={handleLogout} className="block py-3 text-left hover:text-brand">
                  Salir
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="block py-3">
                  Ingresar
                </NavLink>
                <NavLink to="/register" className="block py-3 text-brand">
                  Unirme
                </NavLink>
              </>
            )}
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="font-display text-3xl">
            HUB<span className="text-brand">3</span>
          </Link>
          <div className="text-sm text-mute">
            <p>Comunidad tech de la ciudad</p>
            <p>hola@hub3.club</p>
          </div>
          <div className="flex gap-5 text-sm font-medium">
            <a className="hover:text-brand" href="#" aria-label="Instagram">
              Instagram
            </a>
            <a className="hover:text-brand" href="#" aria-label="LinkedIn">
              LinkedIn
            </a>
            <a className="hover:text-brand" href="#" aria-label="X">
              X
            </a>
          </div>
        </div>
        <p className="border-t border-line px-5 py-4 text-center text-xs text-mute">
          © 2026 Hub3. Construimos comunidad y relato, un logro a la vez.
        </p>
      </footer>
    </div>
  )
}
