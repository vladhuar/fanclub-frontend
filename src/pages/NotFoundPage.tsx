import { Link } from 'react-router-dom'

/** Pantalla para rutas inexistentes. */
export function NotFoundPage() {
  return (
    <section className="grunge">
      <div className="mx-auto grid min-h-[60vh] max-w-3xl place-content-center px-5 py-20 text-center">
        <p className="font-display text-[clamp(5rem,20vw,10rem)] leading-none text-brand">404</p>
        <h1 className="mt-2 font-display text-4xl uppercase">Esta página no existe</h1>
        <p className="mt-3 text-mute">Puede que el enlace haya cambiado o ya no esté disponible.</p>
        <Link
          to="/"
          className="mx-auto mt-8 rounded-md bg-brand px-6 py-3 font-bold text-ink hover:bg-white"
        >
          Volver al feed
        </Link>
      </div>
    </section>
  )
}
