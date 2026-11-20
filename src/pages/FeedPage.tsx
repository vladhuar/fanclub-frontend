import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PostFeed } from '../components/PostFeed'

/** Página de publicaciones: solo el listado y sus filtros. */
export function FeedPage() {
  const { user } = useAuth()

  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">Comunidad</p>
            <h1 className="mt-2 font-display text-[clamp(2.8rem,7vw,5rem)] uppercase leading-none">
              El feed
            </h1>
            <p className="mt-3 max-w-xl text-mute">
              Todo lo que publican los miembros del club. Ordená por lo más reciente o por lo más
              gustado.
            </p>
          </div>
          <Link
            to={user ? '/crear' : '/register'}
            className="self-start rounded-md bg-brand px-5 py-2.5 font-bold text-ink transition-colors hover:bg-white md:self-auto"
          >
            {user ? 'Publicar' : 'Unirme'}
          </Link>
        </div>

        <div className="mt-10">
          <PostFeed />
        </div>
      </div>
    </section>
  )
}
