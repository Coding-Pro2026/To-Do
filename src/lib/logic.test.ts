import { describe, expect, it } from 'vitest'
import type { Task } from '../types'
import { addDays, diffDays, dueInstant, parseKey, relativeDay, toKey } from './dates'
import { compareScored, overdueTasks, rankOpenTasks, scoreTask, tierFor } from './priority'
import { completionStreak, isCompletedLate, monthStats, upcoming } from './stats'
import { parseTasks, sanitizeTask } from './storage'
import { indexByDay } from './stats'
import { reducer } from './useTasks'

const NOW = new Date(2025, 5, 15, 12, 0, 0).getTime() // Jun 15 2025, noon

const mk = (over: Partial<Task> = {}): Task => ({
  id: Math.random().toString(36).slice(2),
  title: 'T',
  description: '',
  dueDate: '',
  dueTime: '',
  priority: 'medium',
  createdAt: NOW - 1000,
  completedAt: null,
  ...over,
})

describe('dates', () => {
  it('round-trips keys and rejects impossible dates', () => {
    expect(toKey(parseKey('2025-02-28')!)).toBe('2025-02-28')
    expect(parseKey('2025-02-31')).toBeNull()
    expect(parseKey('garbage')).toBeNull()
    expect(parseKey('')).toBeNull()
  })
  it('treats a missing time as end of day', () => {
    const d = new Date(dueInstant('2025-06-15', '')!)
    expect(d.getHours()).toBe(23)
    expect(new Date(dueInstant('2025-06-15', '09:30')!).getHours()).toBe(9)
    expect(dueInstant('', '')).toBeNull()
  })
  it('diffDays counts calendar days', () => {
    expect(diffDays(new Date(2025, 2, 29), new Date(2025, 2, 31))).toBe(2)
    expect(diffDays(addDays(new Date(2025, 0, 31), 1), new Date(2025, 1, 1))).toBe(0)
  })
  it('relativeDay labels', () => {
    const now = new Date(NOW)
    expect(relativeDay('2025-06-15', now)).toBe('Today')
    expect(relativeDay('2025-06-16', now)).toBe('Tomorrow')
    expect(relativeDay('2025-06-12', now)).toBe('3 days ago')
  })
})

describe('priority engine', () => {
  it('ranks higher base priority first when nothing is due', () => {
    const r = rankOpenTasks([mk({ priority: 'low' }), mk({ priority: 'urgent' }), mk({ priority: 'high' })], NOW)
    expect(r.map((s) => s.task.priority)).toEqual(['urgent', 'high', 'low'])
  })
  it('escalates overdue tasks above same-priority on-time tasks', () => {
    const late = scoreTask(mk({ priority: 'medium', dueDate: '2025-06-10' }), NOW)
    const ok = scoreTask(mk({ priority: 'medium', dueDate: '2025-06-20' }), NOW)
    expect(late.overdue).toBe(true)
    expect(late.score).toBeGreaterThan(ok.score)
  })
  it('a low-priority overdue task can outrank an on-time high-priority task', () => {
    const r = rankOpenTasks([mk({ priority: 'high', dueDate: '2025-06-30' }), mk({ priority: 'low', dueDate: '2025-06-01' })], NOW)
    expect(r[0].overdue).toBe(true)
  })
  it('grows with days overdue but is capped', () => {
    const a = scoreTask(mk({ dueDate: '2025-06-14' }), NOW).score
    const b = scoreTask(mk({ dueDate: '2025-06-01' }), NOW).score
    const c = scoreTask(mk({ dueDate: '2020-01-01' }), NOW).score
    const d = scoreTask(mk({ dueDate: '2000-01-01' }), NOW).score
    expect(b).toBeGreaterThan(a)
    expect(c).toBe(d)
  })
  it('is not overdue until the deadline instant passes', () => {
    expect(scoreTask(mk({ dueDate: '2025-06-15' }), NOW).overdue).toBe(false)
    expect(scoreTask(mk({ dueDate: '2025-06-15', dueTime: '11:00' }), NOW).overdue).toBe(true)
  })
  it('ignores completed tasks and splits overdue list', () => {
    const tasks = [mk({ dueDate: '2025-06-01', completedAt: NOW }), mk({ dueDate: '2025-06-01' }), mk()]
    expect(rankOpenTasks(tasks, NOW)).toHaveLength(2)
    expect(overdueTasks(tasks, NOW)).toHaveLength(1)
  })
  it('breaks ties by earlier deadline then age', () => {
    const a = scoreTask(mk({ id: 'a', createdAt: 5 }), NOW)
    const b = scoreTask(mk({ id: 'b', createdAt: 1 }), NOW)
    expect([a, b].sort(compareScored)[0].task.id).toBe('b')
  })
  it('maps scores to tiers', () => {
    expect(tierFor(10)).toBe('low')
    expect(tierFor(60)).toBe('medium')
    expect(tierFor(100)).toBe('high')
    expect(tierFor(150)).toBe('critical')
  })
})

describe('stats', () => {
  const june = new Date(2025, 5, 1)
  it('computes month stats', () => {
    const tasks = [
      mk({ dueDate: '2025-06-10', completedAt: new Date(2025, 5, 9, 10).getTime() }), // on time
      mk({ dueDate: '2025-06-10', completedAt: new Date(2025, 5, 12, 10).getTime() }), // late
      mk({ dueDate: '2025-06-05' }), // open + past => missed
      mk({ dueDate: '2025-06-25' }), // future
    ]
    const s = monthStats(tasks, june, NOW)
    expect(s.due).toBe(4)
    expect(s.completed).toBe(2)
    expect(s.onTime).toBe(1)
    expect(s.missed).toBe(2)
    expect(s.onTimeRate).toBe(33)
    expect(s.completionsByDay[8]).toBe(1)
    expect(s.completionsByDay).toHaveLength(30)
  })
  it('on-time rate is null with no resolved tasks', () => {
    expect(monthStats([], june, NOW).onTimeRate).toBeNull()
  })
  it('detects late completion', () => {
    expect(isCompletedLate(mk({ dueDate: '2025-06-10', completedAt: NOW }))).toBe(true)
    expect(isCompletedLate(mk({ completedAt: NOW }))).toBe(false)
  })
  it('streak counts consecutive days', () => {
    const day = (n: number) => mk({ completedAt: addDays(new Date(NOW), -n).getTime() })
    expect(completionStreak([day(0), day(1), day(2), day(4)], new Date(NOW))).toBe(3)
    expect(completionStreak([day(1), day(2)], new Date(NOW))).toBe(2)
    expect(completionStreak([day(3)], new Date(NOW))).toBe(0)
  })
  it('upcoming lists open future tasks inside the window', () => {
    const tasks = [
      mk({ dueDate: '2025-06-15' }),
      mk({ dueDate: '2025-06-20' }),
      mk({ dueDate: '2025-06-30' }),
      mk({ dueDate: '2025-06-14' }),
      mk({ dueDate: '2025-06-16', completedAt: NOW }),
    ]
    expect(upcoming(tasks, new Date(NOW), 7, NOW).map((t) => t.dueDate)).toEqual(['2025-06-15', '2025-06-20'])
  })
})

describe('storage sanitising', () => {
  it('rejects junk and repairs fields', () => {
    expect(sanitizeTask(null)).toBeNull()
    expect(sanitizeTask({ id: 'x', title: '   ' })).toBeNull()
    const t = sanitizeTask({ id: 'x', title: ' Hi ', dueDate: '2025-13-40', dueTime: '99:99', priority: 'nope', createdAt: 'x' })!
    expect(t.title).toBe('Hi')
    expect(t.dueDate).toBe('')
    expect(t.dueTime).toBe('')
    expect(t.priority).toBe('medium')
    expect(t.completedAt).toBeNull()
  })
  it('survives invalid JSON, wrong shapes and duplicate ids', () => {
    expect(parseTasks('{oops')).toEqual([])
    expect(parseTasks('{"a":1}')).toEqual([])
    expect(parseTasks(null)).toEqual([])
    expect(parseTasks(JSON.stringify([{ id: 'a', title: 'x' }, { id: 'a', title: 'y' }]))).toHaveLength(1)
  })
  it('truncates oversized text', () => {
    expect(sanitizeTask({ id: 'a', title: 'x'.repeat(500) })!.title).toHaveLength(120)
  })
})

describe('missed deadlines survive rescheduling', () => {
  const june = new Date(2025, 5, 1)
  it('counts the miss in the month it happened', () => {
    const t = mk({ dueDate: '2025-06-25', missedFrom: '2025-06-05' })
    const s = monthStats([t], june, NOW)
    expect(s.missed).toBe(1)
    expect(s.due).toBe(1)
    expect(s.onTimeRate).toBe(0)
  })
  it('does not double count when completed late after a reschedule', () => {
    const t = mk({ dueDate: '2025-06-10', missedFrom: '2025-06-05', completedAt: new Date(2025, 5, 12).getTime() })
    expect(monthStats([t], june, NOW).missed).toBe(1)
  })
  it('attributes the miss to the original month only', () => {
    const t = mk({ dueDate: '2025-07-02', missedFrom: '2025-06-28' })
    expect(monthStats([t], june, NOW).missed).toBe(1)
    expect(monthStats([t], new Date(2025, 6, 1), NOW).missed).toBe(0)
  })
  it('marks the original day on the calendar index', () => {
    const t = mk({ dueDate: '2025-06-25', missedFrom: '2025-06-05' })
    const day = indexByDay([t], NOW).get('2025-06-05')!
    expect(day.missedCount).toBe(1)
    expect(day.rescheduled).toHaveLength(1)
    expect(day.deadlines).toHaveLength(0)
  })
  it('sanitises missedFrom from storage', () => {
    expect(sanitizeTask({ id: 'a', title: 'x', missedFrom: '2025-02-31' })!.missedFrom).toBeUndefined()
    expect(sanitizeTask({ id: 'a', title: 'x', missedFrom: '2025-06-05' })!.missedFrom).toBe('2025-06-05')
  })
})

describe('timestamp hardening', () => {
  it('rejects timestamps Date cannot represent', () => {
    const t = sanitizeTask({ id: 'a', title: 'x', createdAt: 1e20, completedAt: 1e20 })!
    expect(t.completedAt).toBeNull()
    expect(Number.isFinite(new Date(t.createdAt).getTime())).toBe(true)
  })
})

describe('reducer', () => {
  it('records the missed deadline when an overdue task is rescheduled', () => {
    const t = mk({ id: 'z', dueDate: '2025-06-05' })
    const [r] = reducer([t], { type: 'reschedule', id: 'z', dueDate: '2025-06-20', dueTime: '', at: NOW })
    expect(r.missedFrom).toBe('2025-06-05')
    expect(r.dueDate).toBe('2025-06-20')
  })
  it('does not record a miss for an on-time task or keep overwriting the first miss', () => {
    const ok = mk({ id: 'a', dueDate: '2025-06-20' })
    expect(reducer([ok], { type: 'reschedule', id: 'a', dueDate: '2025-06-25', dueTime: '', at: NOW })[0].missedFrom).toBeUndefined()
    const late = mk({ id: 'b', dueDate: '2025-06-05', missedFrom: '2025-06-01' })
    expect(reducer([late], { type: 'reschedule', id: 'b', dueDate: '2025-06-10', dueTime: '', at: NOW })[0].missedFrom).toBe('2025-06-01')
  })
  it('caps oversized input centrally', () => {
    const t = mk({ id: 'c' })
    const [r] = reducer([t], { type: 'update', id: 'c', at: NOW, input: { title: 'x'.repeat(999), description: 'y'.repeat(9999), dueDate: '', dueTime: '', priority: 'low' } })
    expect(r.title).toHaveLength(120)
    expect(r.description).toHaveLength(1000)
  })
})
