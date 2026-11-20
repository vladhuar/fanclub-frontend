import type { ReactNode } from 'react'

type AlertTone = 'error' | 'success' | 'info'

const toneClasses: Record<AlertTone, string> = {
  error: 'border-red-400/40 bg-red-500/10 text-red-200',
  success: 'border-brand/40 bg-brand/10 text-brand',
  info: 'border-line bg-ink text-mute',
}

/** Mensaje de estado accesible para formularios y acciones. */
export function Alert({ tone = 'info', children }: { tone?: AlertTone; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-4 py-3 text-sm leading-relaxed ${toneClasses[tone]}`}
    >
      {children}
    </p>
  )
}

/** Spinner simple con el verde de la marca. */
export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-3 text-sm text-mute" role="status">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand"
      />
      {label}
    </span>
  )
}

/** Etiqueta de formulario consistente en todas las pantallas. */
export function FieldLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string
  children: ReactNode
  optional?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-bold text-paper">
      {children}
      {optional && <span className="ml-2 font-normal text-mute">(opcional)</span>}
    </label>
  )
}

/** Clases compartidas por inputs y selects. */
export const inputClass =
  'w-full rounded-md border border-line bg-ink px-4 py-3 text-paper placeholder:text-mute/70 focus:border-brand focus:outline-none'
