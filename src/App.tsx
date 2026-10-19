import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, LayoutDashboard, ListTodo, Moon, Plus, Siren, Sun, Undo2 } from 'lucide-react'
import type { Task } from './types'
import { loadTheme, saveTheme, type Theme } from './lib/storage'
import { useNow, useTasks, type TaskInput } from './lib/useTasks'
import { overdueTasks } from './lib/priority'
import TaskModal from './components/TaskModal'
import Dashboard from './views/Dashboard'
import TasksView from './views/TasksView'
import Overdue from './views/Overdue'
import Activity from './views/Activity'

type View = 'dashboard' | 'tasks' | 'overdue' | 'activity'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'overdue', label: 'Missed', icon: Siren },
  { id: 'activity', label: 'Activity', icon: CalendarDays },
]

interface Toast { id: number; text: string; undo?: () => void }

export default function App() {
  const { tasks, add, update, toggle, remove, restore, reschedule, clearCompleted } = useTasks()
  const now = useNow()
  const [view, setView] = useState<View>('dashboard')
  const [modal, setModal] = useState<{ task: Task | null } | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const toastId = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current)
    setToast({ id: ++toastId.current, text, undo })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }, [])

  const openNew = useCallback(() => setModal({ task: null }), [])
  const openEdit = useCallback((task: Task) => setModal({ task }), [])
  const closeModal = useCallback(() => setModal(null), [])

  const onToggle = useCallback((id: string) => {
    const t = tasks.find((x) => x.id === id)
    toggle(id)
    if (t && t.completedAt === null) showToast(`Completed “${t.title}” 🎉`, () => toggle(id))
  }, [tasks, toggle, showToast])

  const onDelete = useCallback((task: Task) => {
    remove(task.id)
    showToast(`Deleted “${task.title}”`, () => restore(task))
  }, [remove, restore, showToast])

  const onSave = useCallback((input: TaskInput) => {
    if (modal?.task) update(modal.task.id, input)
    else add(input)
    setModal(null)
    showToast(modal?.task ? 'Task updated' : 'Task added')
  }, [modal, update, add, showToast])

  const overdueCount = overdueTasks(tasks, now).length
  const shared = { tasks, now, onToggle, onEdit: openEdit, onDelete, onAdd: openNew }

  return (
    <div className="app">
      <div className="aurora" aria-hidden>
        <motion.span className="blob b1" animate={{ x: [0, 80, -40, 0], y: [0, 50, 90, 0] }} transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.span className="blob b2" animate={{ x: [0, -90, 30, 0], y: [0, 70, -30, 0] }} transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.span className="blob b3" animate={{ x: [0, 60, -60, 0], y: [0, -60, 40, 0] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <motion.div className="logo" whileHover={{ rotate: 12, scale: 1.08 }} transition={{ type: 'spring', stiffness: 300 }}>
            <CheckCircle2 size={22} />
          </motion.div>
          <span>Momentum</span>
        </div>

        <LayoutGroup id="nav">
          <ul>
            {NAV.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button className={`nav-btn ${view === id ? 'active' : ''}`} onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined}>
                  {view === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                  <Icon size={19} />
                  <span className="nav-label">{label}</span>
                  {id === 'overdue' && overdueCount > 0 && (
                    <motion.b key={overdueCount} className="count" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}>
                      {overdueCount}
                    </motion.b>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </LayoutGroup>

        <div className="side-foot">
          <motion.button className="btn primary block" onClick={openNew} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
            <Plus size={18} /> <span className="nav-label">New task</span>
          </motion.button>
          <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {view === 'dashboard' && <Dashboard {...shared} />}
            {view === 'tasks' && <TasksView {...shared} onClearCompleted={clearCompleted} />}
            {view === 'overdue' && <Overdue {...shared} onReschedule={(id, d) => { reschedule(id, d, ''); showToast('Rescheduled') }} />}
            {view === 'activity' && <Activity {...shared} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {modal && <TaskModal key={modal.task?.id ?? 'new'} task={modal.task} onSave={onSave} onClose={closeModal} />}
      </AnimatePresence>

      <div className="toast-zone" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className="toast"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <span>{toast.text}</span>
              {toast.undo && (
                <button onClick={() => { toast.undo?.(); setToast(null) }}>
                  <Undo2 size={14} /> Undo
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
