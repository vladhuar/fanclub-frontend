import { useEffect } from 'react'

interface LightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

/**
 * Visor de imágenes a pantalla completa. Se cierra con Escape, con el botón
 * de cierre o al hacer clic fuera de la imagen.
 */
export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)

    // Evita que el fondo se desplace mientras el visor está abierto.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-4 backdrop-blur"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar imagen"
        className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-line bg-panel text-2xl text-paper transition-colors hover:border-brand hover:text-brand"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-xl border border-line object-contain shadow-2xl"
      />
    </div>
  )
}
