const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatMoney = (value: number | null | undefined) => currency.format(value ?? 0)

/** Dates from the API are date-only values; parse them as local dates, not UTC midnight. */
export const parseDateOnly = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatDate = (value: string | null | undefined) =>
  value
    ? parseDateOnly(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

/** Server timestamps are UTC but serialized without a zone; mark them so browsers don't read them as local. */
export const asUtc = (value: string) => (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function timeAgo(value: string | null | undefined) {
  if (!value) return ''
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

export const todayIso = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export const initials = (first?: string, last?: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?'
