import { useCallback, useEffect, useReducer } from 'react'
import type { Priority, Task } from '../types'
import { clampText, LIMITS, loadTasks, newId, saveTasks } from './storage'
import { isOverdue } from './priority'

export interface TaskInput {
  title: string
  description: string
  dueDate: string
  dueTime: string
  priority: Priority
}

type Action =
  | { type: 'add'; task: Task }
  | { type: 'update'; id: string; input: TaskInput; at: number }
  | { type: 'toggle'; id: string; at: number }
  | { type: 'remove'; id: string }
  | { type: 'restore'; task: Task }
  | { type: 'reschedule'; id: string; dueDate: string; dueTime: string; at: number }
  | { type: 'clearCompleted' }

const cleanInput = (i: TaskInput): TaskInput => ({
  ...i,
  title: clampText(i.title.trim(), LIMITS.title),
  description: clampText(i.description, LIMITS.description),
})

/** When an overdue task gets a new deadline, remember the one it missed so stats keep the miss. */
function withMissRecorded(t: Task, next: Pick<Task, 'dueDate' | 'dueTime'>, at: number): Partial<Task> {
  const moved = next.dueDate !== t.dueDate || next.dueTime !== t.dueTime
  return moved && !t.missedFrom && isOverdue(t, at) ? { missedFrom: t.dueDate } : {}
}

export function reducer(state: Task[], a: Action): Task[] {
  switch (a.type) {
    case 'add':
      return state.length >= LIMITS.tasks ? state : [{ ...a.task, ...cleanInput(a.task) }, ...state]
    case 'restore':
      return state.some((t) => t.id === a.task.id) ? state : [a.task, ...state]
    case 'update':
      return state.map((t) => {
        if (t.id !== a.id) return t
        const input = cleanInput(a.input)
        return { ...t, ...input, ...withMissRecorded(t, input, a.at) }
      })
    case 'toggle':
      return state.map((t) => (t.id === a.id ? { ...t, completedAt: t.completedAt === null ? a.at : null } : t))
    case 'reschedule':
      return state.map((t) =>
        t.id === a.id ? { ...t, dueDate: a.dueDate, dueTime: a.dueTime, ...withMissRecorded(t, a, a.at) } : t,
      )
    case 'remove':
      return state.filter((t) => t.id !== a.id)
    case 'clearCompleted':
      return state.filter((t) => t.completedAt === null)
  }
}

export function useTasks() {
  const [tasks, dispatch] = useReducer(reducer, undefined, loadTasks)

  useEffect(() => saveTasks(tasks), [tasks])

  const add = useCallback((input: TaskInput) => {
    dispatch({ type: 'add', task: { ...input, id: newId(), createdAt: Date.now(), completedAt: null } })
  }, [])
  const update = useCallback((id: string, input: TaskInput) => dispatch({ type: 'update', id, input, at: Date.now() }), [])
  const toggle = useCallback((id: string) => dispatch({ type: 'toggle', id, at: Date.now() }), [])
  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), [])
  const restore = useCallback((task: Task) => dispatch({ type: 'restore', task }), [])
  const reschedule = useCallback(
    (id: string, dueDate: string, dueTime: string) => dispatch({ type: 'reschedule', id, dueDate, dueTime, at: Date.now() }),
    [],
  )
  const clearCompleted = useCallback(() => dispatch({ type: 'clearCompleted' }), [])

  return { tasks, add, update, toggle, remove, restore, reschedule, clearCompleted }
}

/** Re-renders on an interval so overdue status stays live without a refresh. */
export function useNow(intervalMs = 30_000): number {
  const [now, tick] = useReducer(() => Date.now(), Date.now())
  useEffect(() => {
    const id = setInterval(tick, intervalMs)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [intervalMs])
  return now
}
