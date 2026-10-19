import type { Task } from '../types'
import { addDays, daysInMonth, diffDays, dueInstant, parseKey, startOfDay, toKey } from './dates'

export interface MonthStats {
  /** Tasks with a deadline falling in the month. */
  due: number
  /** Tasks completed within the month (by completion date). */
  completed: number
  /** Of the tasks due in the month and completed, how many were on time. */
  onTime: number
  /** Tasks due in the month that are finished late or still open past deadline. */
  missed: number
  /** Share (0-100) of resolved deadline tasks done on time; null when no data. */
  onTimeRate: number | null
  /** Tasks created in the month. */
  created: number
  /** Completions per day-of-month (index 0 = day 1). */
  completionsByDay: number[]
}

export function isCompletedLate(t: Task): boolean {
  if (t.completedAt === null) return false
  const due = dueInstant(t.dueDate, t.dueTime)
  return due !== null && t.completedAt > due
}

function inMonth(ms: number, year: number, month: number): boolean {
  const d = new Date(ms)
  return d.getFullYear() === year && d.getMonth() === month
}

export function monthStats(tasks: Task[], month: Date, now: number): MonthStats {
  const y = month.getFullYear()
  const m = month.getMonth()
  const completionsByDay = new Array<number>(daysInMonth(month)).fill(0)
  let due = 0, completed = 0, onTime = 0, missed = 0, created = 0

  for (const t of tasks) {
    if (inMonth(t.createdAt, y, m)) created++
    if (t.completedAt !== null && inMonth(t.completedAt, y, m)) {
      completed++
      completionsByDay[new Date(t.completedAt).getDate() - 1]++
    }
    const d = parseKey(t.dueDate)
    if (d && d.getFullYear() === y && d.getMonth() === m) {
      due++
      if (t.completedAt !== null) {
        if (isCompletedLate(t)) missed++
        else onTime++
      } else if (dueInstant(t.dueDate, t.dueTime)! < now) {
        missed++
      }
    }
  }

  const resolved = onTime + missed
  return {
    due, completed, onTime, missed, created, completionsByDay,
    onTimeRate: resolved === 0 ? null : Math.round((onTime / resolved) * 100),
  }
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one completion. */
export function completionStreak(tasks: Task[], today: Date): number {
  const days = new Set<string>()
  for (const t of tasks) if (t.completedAt !== null) days.add(toKey(new Date(t.completedAt)))
  let cursor = startOfDay(today)
  if (!days.has(toKey(cursor))) cursor = addDays(cursor, -1)
  let streak = 0
  while (days.has(toKey(cursor))) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export interface DayInfo {
  key: string
  deadlines: Task[]
  completedCount: number
  missedCount: number
}

/** Index tasks by calendar day for the month grid. */
export function indexByDay(tasks: Task[], now: number): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>()
  const get = (key: string) => {
    let e = map.get(key)
    if (!e) {
      e = { key, deadlines: [], completedCount: 0, missedCount: 0 }
      map.set(key, e)
    }
    return e
  }
  for (const t of tasks) {
    if (parseKey(t.dueDate)) {
      const e = get(t.dueDate)
      e.deadlines.push(t)
      const due = dueInstant(t.dueDate, t.dueTime)!
      if (t.completedAt !== null ? t.completedAt > due : now > due) e.missedCount++
    }
    if (t.completedAt !== null) get(toKey(new Date(t.completedAt))).completedCount++
  }
  return map
}

/** Open tasks due within the next `days` days (today included), soonest first. */
export function upcoming(tasks: Task[], today: Date, days: number, now: number): Task[] {
  return tasks
    .filter((t) => {
      if (t.completedAt !== null) return false
      const d = parseKey(t.dueDate)
      if (!d) return false
      const n = diffDays(startOfDay(today), d)
      const due = dueInstant(t.dueDate, t.dueTime)!
      return n >= 0 && n < days && due >= now
    })
    .sort((a, b) => dueInstant(a.dueDate, a.dueTime)! - dueInstant(b.dueDate, b.dueTime)!)
}
