const pad = (n: number) => String(n).padStart(2, '0')

/** Format a Date as a local `YYYY-MM-DD` key. */
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse `YYYY-MM-DD` as a local date; returns null when malformed or impossible (e.g. 2025-02-31). */
export function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
}

/**
 * The instant a task is due, in epoch ms.
 * No time means the very end of that day. Returns null for no/invalid deadline.
 */
export function dueInstant(dueDate: string, dueTime: string): number | null {
  const day = parseKey(dueDate)
  if (!day) return null
  if (isValidTime(dueTime)) {
    const [h, m] = dueTime.split(':').map(Number)
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0).getTime()
  }
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).getTime()
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

export function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/** Whole calendar days from `a` to `b` (DST-safe). Positive when b is after a. */
export function diffDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000)
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatMonth(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(t: string): string {
  if (!isValidTime(t)) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`
}

/** Human friendly relative label such as "Today", "Tomorrow", "in 3 days", "2 days overdue". */
export function relativeDay(dueDate: string, now: Date): string {
  const due = parseKey(dueDate)
  if (!due) return 'No deadline'
  const n = diffDays(startOfDay(now), due)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1) return `In ${n} days`
  return `${-n} days ago`
}

export function formatDate(dueDate: string): string {
  const d = parseKey(dueDate)
  if (!d) return 'No deadline'
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`
}
