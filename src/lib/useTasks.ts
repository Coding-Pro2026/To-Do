import { useCallback, useEffect, useReducer } from 'react'
import type { Priority, Task } from '../types'
import { LIMITS, loadTasks, newId, saveTasks } from './storage'

export interface TaskInput {
  title: string
  description: string
  dueDate: string
  dueTime: string
  priority: Priority
}

type Action =
  | { type: 'add'; task: Task }
  | { type: 'update'; id: string; input: TaskInput }
  | { type: 'toggle'; id: string; at: number }
  | { type: 'remove'; id: string }
  | { type: 'restore'; task: Task }
  | { type: 'reschedule'; id: string; dueDate: string; dueTime: string }
  | { type: 'clearCompleted' }

function reducer(state: Task[], a: Action): Task[] {
  switch (a.type) {
    case 'add':
      return state.length >= LIMITS.tasks ? state : [a.task, ...state]
    case 'restore':
      return state.some((t) => t.id === a.task.id) ? state : [a.task, ...state]
    case 'update':
      return state.map((t) => (t.id === a.id ? { ...t, ...a.input } : t))
    case 'toggle':
      return state.map((t) => (t.id === a.id ? { ...t, completedAt: t.completedAt === null ? a.at : null } : t))
    case 'reschedule':
      return state.map((t) => (t.id === a.id ? { ...t, dueDate: a.dueDate, dueTime: a.dueTime } : t))
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
  const update = useCallback((id: string, input: TaskInput) => dispatch({ type: 'update', id, input }), [])
  const toggle = useCallback((id: string) => dispatch({ type: 'toggle', id, at: Date.now() }), [])
  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), [])
  const restore = useCallback((task: Task) => dispatch({ type: 'restore', task }), [])
  const reschedule = useCallback(
    (id: string, dueDate: string, dueTime: string) => dispatch({ type: 'reschedule', id, dueDate, dueTime }),
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
