import { motion } from 'framer-motion'
import { AlarmClock, CalendarClock, ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import type { Task } from '../types'
import type { Scored } from '../lib/priority'
import { formatDate, formatTime, relativeDay } from '../lib/dates'
import { isCompletedLate } from '../lib/stats'
import { CheckCircle, PriorityBadge, TIER_LABEL } from './ui'

interface Props {
  item: Scored
  now: number
  rank?: number
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  showReason?: boolean
}

export default function TaskCard({ item, now, rank, onToggle, onEdit, onDelete, showReason = true }: Props) {
  const { task, tier, overdue, daysOverdue, reason } = item
  const done = task.completedAt !== null
  const hasDue = task.dueDate !== ''
  const time = formatTime(task.dueTime)

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95, transition: { duration: 0.22 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      whileHover={{ y: -2 }}
      className={`task tier-${tier} ${overdue ? 'is-overdue' : ''} ${done ? 'is-done' : ''}`}
    >
      {rank !== undefined && <span className="rank">{rank}</span>}
      <CheckCircle checked={done} onChange={() => onToggle(task.id)} label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`} />
      <div className="task-body">
        <div className="task-top">
          <h3 className="task-title">{task.title}</h3>
        </div>
        {task.description && <p className="task-desc">{task.description}</p>}
        <div className="task-meta">
          <PriorityBadge priority={task.priority} />
          {hasDue && (
            <span className={`chip ${overdue ? 'chip-danger' : ''}`}>
              {overdue ? <AlarmClock size={13} /> : <CalendarClock size={13} />}
              {formatDate(task.dueDate)}
              {time && ` · ${time}`}
              <em>{done ? (isCompletedLate(task) ? 'finished late' : 'on time') : overdue ? `${daysOverdue}d overdue` : relativeDay(task.dueDate, new Date(now))}</em>
            </span>
          )}
          {!done && showReason && (
            <span className={`chip chip-tier tier-text-${tier}`} title={reason}>
              <ArrowUpRight size={13} />
              {TIER_LABEL[tier]} · {reason}
            </span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button className="icon-btn" onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`}>
          <Pencil size={16} />
        </button>
        <button className="icon-btn danger" onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>
          <Trash2 size={16} />
        </button>
      </div>
    </motion.article>
  )
}
