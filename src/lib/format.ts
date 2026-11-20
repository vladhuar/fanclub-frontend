// Utilidades de formato para fechas y textos.

const shortDate = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const longDate = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Fecha relativa para el feed y absoluta para fechas antiguas. */
export function formatPostDate(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''

  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  if (hours < 24) return `hace ${hours} h`
  if (days < 7) return `hace ${days} d`
  return shortDate.format(date)
}

export function formatLongDate(raw: string): string {
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return ''
  return longDate.format(date)
}

/** Iniciales para avatares sin imagen. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}
