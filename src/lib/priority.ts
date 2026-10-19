import type { Priority, Task, Tier } from '../types'
import { dueInstant } from './dates'

const HOUR = 3_600_000
const DAY = 24 * HOUR

export const BASE_WEIGHT: Record<Priority, number> = {
  low: 10,
  medium: 30,
  high: 60,
  urgent: 90,
}

/** Window (in days) before a deadline during which urgency ramps up. */
const RAMP_DAYS = 14
const MAX_RAMP = 40
/** Flat bonus any overdue task receives so it always outranks on-time work of equal base priority. */
const OVERDUE_BONUS = 50
const MAX_OVERDUE_GROWTH = 40

export interface Scored {
  task: Task
  score: number
  tier: Tier
  overdue: boolean
  /** Whole days past the deadline (0 when not overdue). */
  daysOverdue: number
  /** Short explanation of how the score was derived. */
  reason: string
}

export function isOverdue(task: Task, now: number): boolean {
  if (task.completedAt !== null) return false
  const due = dueInstant(task.dueDate, task.dueTime)
  return due !== null && now > due
}

export function tierFor(score: number): Tier {
  if (score >= 140) return 'critical'
  if (score >= 90) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

/**
 * Priority engine. Score = base priority weight
 *   + urgency ramp as the deadline approaches (0..40 over the final 14 days)
 *   + overdue escalation (flat 50, growing 5/day up to +40 more).
 * Tasks with no deadline are scored on base priority alone.
 */
export function scoreTask(task: Task, now: number): Scored {
  const base = BASE_WEIGHT[task.priority]
  const due = dueInstant(task.dueDate, task.dueTime)

  if (due === null) {
    return { task, score: base, tier: tierFor(base), overdue: false, daysOverdue: 0, reason: 'No deadline — ranked by priority alone' }
  }

  if (now > due) {
    const daysOverdue = Math.max(1, Math.floor((now - due) / DAY))
    const growth = Math.min(daysOverdue * 5, MAX_OVERDUE_GROWTH)
    const score = base + OVERDUE_BONUS + growth
    return {
      task,
      score,
      tier: tierFor(score),
      overdue: true,
      daysOverdue,
      reason: `Missed deadline — escalated (+${OVERDUE_BONUS + growth})`,
    }
  }

  const remaining = due - now
  const ramp = Math.max(0, MAX_RAMP * (1 - remaining / (RAMP_DAYS * DAY)))
  const score = Math.round((base + ramp) * 10) / 10
  const reason = ramp >= 1 ? `Deadline approaching (+${Math.round(ramp)})` : 'Plenty of time'
  return { task, score, tier: tierFor(score), overdue: false, daysOverdue: 0, reason }
}

/** Sort comparator: highest score first; earlier deadline, then older task break ties. */
export function compareScored(a: Scored, b: Scored): number {
  if (b.score !== a.score) return b.score - a.score
  const da = dueInstant(a.task.dueDate, a.task.dueTime) ?? Infinity
  const db = dueInstant(b.task.dueDate, b.task.dueTime) ?? Infinity
  if (da !== db) return da < db ? -1 : 1
  return a.task.createdAt - b.task.createdAt
}

/** Open tasks ranked by what should be done next. */
export function rankOpenTasks(tasks: Task[], now: number): Scored[] {
  return tasks
    .filter((t) => t.completedAt === null)
    .map((t) => scoreTask(t, now))
    .sort(compareScored)
}

export function overdueTasks(tasks: Task[], now: number): Scored[] {
  return rankOpenTasks(tasks, now).filter((s) => s.overdue)
}
