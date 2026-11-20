import { initials } from '../lib/format'

/** Avatar con imagen o iniciales sobre el verde de la marca. */
export function Avatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
  }[size]

  if (src) {
    return (
      <img
        src={src}
        alt={`Avatar de ${name}`}
        className={`${sizeClasses} shrink-0 rounded-full border border-line object-cover`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClasses} grid shrink-0 place-items-center rounded-full bg-paper font-bold text-ink`}
    >
      {initials(name) || '?'}
    </span>
  )
}
