import { useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ClipboardList, Plus, Search } from 'lucide-react'
import TaskCard from '../components/TaskCard'
import { EmptyState, PageHeader } from '../components/ui'
import { scoreTask, rankOpenTasks } from '../lib/priority'
import type { ViewProps } from './shared'

type Filter = 'open' | 'done' | 'all'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Completed' },
  { id: 'all', label: 'All' },
]

export default function TasksView({ tasks, now, onToggle, onEdit, onDelete, onAdd, onClearCompleted }: ViewProps & { onClearCompleted: () => void }) {
  const [filter, setFilter] = useState<Filter>('open')
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (t: { title: string; description: string }) =>
      !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    const open = rankOpenTasks(tasks, now).filter((s) => match(s.task))
    const done = tasks
      .filter((t) => t.completedAt !== null && match(t))
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .map((t) => scoreTask(t, now))
    return filter === 'open' ? open : filter === 'done' ? done : [...open, ...done]
  }, [tasks, now, filter, query])

  const doneCount = tasks.filter((t) => t.completedAt !== null).length

  return (
    <div className="page">
      <PageHeader
        title="All tasks"
        subtitle="Ranked by priority, deadline pressure and escalation."
        action={
          <motion.button className="btn primary" onClick={onAdd} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
            <Plus size={18} /> New task
          </motion.button>
        }
      />

      <div className="toolbar">
        <LayoutGroup id="filters">
          <div className="tabs" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                {filter === f.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <label className="search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" maxLength={80} />
        </label>
        {doneCount > 0 && filter !== 'open' && (
          <button className="btn ghost small" onClick={onClearCompleted}>Clear completed</button>
        )}
      </div>

      <div className="list">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((s, i) => (
            <TaskCard key={s.task.id} item={s} now={now} rank={filter === 'open' ? i + 1 : undefined} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={34} />}
          title={query ? 'No matches' : filter === 'done' ? 'Nothing completed yet' : 'No tasks here'}
          text={query ? 'Try a different search.' : 'Add a task and it will show up ranked by priority.'}
        />
      )}
    </div>
  )
}
