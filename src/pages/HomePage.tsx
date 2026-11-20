import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Hero } from '../components/Hero'
import { PostFeed } from '../components/PostFeed'

const MARQUEE_ITEMS = ['Conectamos comunidad', 'Celebramos cada logro']

/** Inicio: hero, lema, últimas publicaciones y llamada a sumarse. */
export function HomePage() {
  const { user } = useAuth()

  return (
    <>
      <Hero />

      {/* MARQUEE */}
      <section className="overflow-hidden bg-brand py-5 text-ink" aria-label="Lema">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-4xl uppercase">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map(
            (item, index) => (
              <span key={`${item}-${index}`} className="flex items-center gap-10">
                {item}
                <span aria-hidden="true">★</span>
              </span>
            ),
          )}
        </div>
      </section>

      {/* FEED */}
      <section id="feed" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <PostFeed heading="Las novedades" />
        </div>
      </section>

      {/* MEMBRESÍA */}
      <section className="grunge">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-5xl uppercase md:text-6xl">
            Donde la innovación
            <br />
            se une a la comunidad
          </h2>
          <p className="mt-4 max-w-xl text-lg text-mute">
            Ser miembro abre la puerta a una red activa, historias compartidas y recursos para tu
            próximo paso.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-line bg-panel p-7">
              <h3 className="font-display text-3xl uppercase">Colabora</h3>
              <p className="mt-3 text-mute">Encuentra socios, mentores y equipos para tus ideas.</p>
            </article>
            <article className="rounded-2xl bg-brand p-7 text-ink">
              <h3 className="font-display text-3xl uppercase">Crea</h3>
              <p className="mt-3">Publica tus proyectos y muestra en qué estás trabajando.</p>
            </article>
            <article className="rounded-2xl border border-line bg-panel p-7">
              <h3 className="font-display text-3xl uppercase">Lidera</h3>
              <p className="mt-3 text-mute">Haz visible tu trabajo ante toda la red del club.</p>
            </article>
          </div>
          <Link
            to={user ? '/crear' : '/register'}
            className="mt-10 inline-block rounded-md bg-paper px-8 py-4 font-display text-2xl uppercase tracking-wide text-ink transition-colors hover:bg-brand"
          >
            {user ? 'Publicar ahora' : 'Súmate hoy'}
          </Link>
        </div>
      </section>
    </>
  )
}
