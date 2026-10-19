import { AnimatePresence, motion } from 'framer-motion'
import { CalendarPlus, ShieldCheck, Siren } from 'lucide-react'
import TaskCard from '../components/TaskCard'
import { EmptyState, PageHeader } from '../components/ui'
import { addDays, startOfDay, toKey } from '../lib/dates'
import { overdueTasks } from '../lib/priority'
import type { ViewProps } from './shared'

interface Props extends ViewProps {
  onReschedule: (id: string, dueDate: string) => void
}

export default function Overdue({ tasks, now, onToggle, onEdit, onDelete, onReschedule }: Props) {
  const items = overdueTasks(tasks, now)
  const today = startOfDay(new Date(now))
  const options = [
    { label: 'Today', date: toKey(today) },
    { label: 'Tomorrow', date: toKey(addDays(today, 1)) },
    { label: 'In 3 days', date: toKey(addDays(today, 3)) },
    { label: 'Next week', date: toKey(addDays(today, 7)) },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Missed deadlines"
        subtitle="Tasks that slipped past their deadline are escalated automatically and jump the queue."
      />

      {items.length > 0 && (
        <motion.div className="banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.span animate={{ rotate: [0, -12, 12, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}>
            <Siren size={22} />
          </motion.span>
          <p>
            <b>{items.length} task{items.length === 1 ? '' : 's'}</b> need recovery. They are sorted by escalated priority — start at the top.
          </p>
        </motion.div>
      )}

      <div className="list">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((s, i) => (
            <motion.div key={s.task.id} layout="position" exit={{ opacity: 0, x: -40 }} className="recover">
              <TaskCard item={s} now={now} rank={i + 1} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              <div className="reschedule">
                <span><CalendarPlus size={14} /> Reschedule</span>
                {options.map((o) => (
                  <motion.button key={o.label} className="pill-btn" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => onReschedule(s.task.id, o.date)}>
                    {o.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <EmptyState icon={<ShieldCheck size={34} />} title="No missed deadlines" text="Every task is on track. Keep it up!" />
      )}
    </div>
  )
}
