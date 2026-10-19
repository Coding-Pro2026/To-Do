import { PRIORITIES, type Priority, type Task } from '../types'
import { isValidTime, parseKey } from './dates'

const KEY = 'momentum.tasks.v1'
const THEME_KEY = 'momentum.theme.v1'

export const LIMITS = { title: 120, description: 1000, tasks: 2000 } as const

const isPriority = (v: unknown): v is Priority => typeof v === 'string' && (PRIORITIES as string[]).includes(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate untrusted data (storage can be edited or corrupted) into a Task, or null. */
export function sanitizeTask(raw: unknown): Task | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || r.id.length === 0 || r.id.length > 64) return null
  if (typeof r.title !== 'string' || r.title.trim() === '') return null
  const dueDate = typeof r.dueDate === 'string' && parseKey(r.dueDate) ? r.dueDate : ''
  const dueTime = dueDate && typeof r.dueTime === 'string' && isValidTime(r.dueTime) ? r.dueTime : ''
  return {
    id: r.id,
    title: r.title.trim().slice(0, LIMITS.title),
    description: typeof r.description === 'string' ? r.description.slice(0, LIMITS.description) : '',
    dueDate,
    dueTime,
    priority: isPriority(r.priority) ? r.priority : 'medium',
    createdAt: isNum(r.createdAt) ? r.createdAt : Date.now(),
    completedAt: isNum(r.completedAt) ? r.completedAt : null,
  }
}

export function parseTasks(json: string | null): Task[] {
  if (!json) return []
  try {
    const data: unknown = JSON.parse(json)
    if (!Array.isArray(data)) return []
    const seen = new Set<string>()
    const out: Task[] = []
    for (const item of data.slice(0, LIMITS.tasks)) {
      const t = sanitizeTask(item)
      if (t && !seen.has(t.id)) {
        seen.add(t.id)
        out.push(t)
      }
    }
    return out
  } catch {
    return []
  }
}

export function loadTasks(): Task[] {
  try {
    return parseTasks(localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks))
  } catch {
    /* storage may be full or blocked; the app keeps working in memory */
  }
}

export type Theme = 'dark' | 'light'

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* ignore */ }
  return 'dark'
}

export function saveTheme(t: Theme): void {
  try { localStorage.setItem(THEME_KEY, t) } catch { /* ignore */ }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
