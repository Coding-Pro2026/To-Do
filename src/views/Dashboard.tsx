import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CalendarCheck, Flame, ListChecks, PartyPopper, Plus, Sparkles } from 'lucide-react'
import TaskCard from '../components/TaskCard'
import { AnimatedNumber, EmptyState, PageHeader, PRIORITY_LABEL, ProgressRing, rise, stagger } from '../components/ui'
import { formatDate, formatTime, relativeDay, toKey } from '../lib/dates'
import { rankOpenTasks, scoreTask } from '../lib/priority'
import { completionStreak, monthStats, upcoming } from '../lib/stats'
import type { ViewProps } from './shared'

function greeting(h: number) {
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ tasks, now, onToggle, onEdit, onDelete, onAdd }: ViewProps) {
  const today = new Date(now)
  const ranked = rankOpenTasks(tasks, now)
  const overdue = ranked.filter((r) => r.overdue)
  const dueToday = ranked.filter((r) => r.task.dueDate === toKey(today) && !r.overdue)
  const streak = completionStreak(tasks, today)
  const month = monthStats(tasks, new Date(today.getFullYear(), today.getMonth(), 1), now)
  const monthTotal = month.completed + ranked.length
  const percent = monthTotal === 0 ? 0 : Math.round((month.completed / monthTotal) * 100)
  const next = ranked[0]
  const queue = ranked.slice(1, 6)
  const soon = upcoming(tasks, today, 7, now).slice(0, 5)

  const stats = [
    { label: 'Open tasks', value: ranked.length, icon: <ListChecks size={18} />, tone: 'violet' },
    { label: 'Due today', value: dueToday.length, icon: <CalendarCheck size={18} />, tone: 'cyan' },
    { label: 'Overdue', value: overdue.length, icon: <AlertTriangle size={18} />, tone: 'red' },
    { label: 'Day streak', value: streak, icon: <Flame size={18} />, tone: 'amber' },
  ]

  return (
    <div className="page">
      <PageHeader
        title={`${greeting(today.getHours())} 👋`}
        subtitle={next ? 'Here is what deserves your attention, in priority order.' : 'Nothing on your plate — add a task to get going.'}
        action={
          <motion.button className="btn primary" onClick={onAdd} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
            <Plus size={18} /> New task
          </motion.button>
        }
      />

      <motion.div className="stats" variants={stagger} initial="hidden" animate="show">
        {stats.map((s) => (
          <motion.div key={s.label} className={`stat tone-${s.tone}`} variants={rise} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div className="stat-icon">{s.icon}</div>
            <strong><AnimatedNumber value={s.value} /></strong>
            <span>{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid-2">
        <section className="stack">
          <h2 className="section-title"><Sparkles size={18} /> Do this next</h2>
          {next ? (
            <motion.div className={`hero tier-${next.tier}`} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
              <motion.div className="hero-glow" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.12, 1] }} transition={{ duration: 5, repeat: Infinity }} />
              <div className="hero-tags">
                <span className={`badge p-${next.task.priority}`}><i />{PRIORITY_LABEL[next.task.priority]} priority</span>
                {next.overdue && <span className="badge p-urgent"><i />Missed deadline</span>}
              </div>
              <h3>{next.task.title}</h3>
              <p className="hero-desc">{next.task.description || 'No description added yet — open the task to add the steps.'}</p>
              <div className="hero-foot">
                <span>
                  {next.task.dueDate
                    ? `${formatDate(next.task.dueDate)}${next.task.dueTime ? ` · ${formatTime(next.task.dueTime)}` : ''} · ${relativeDay(next.task.dueDate, today)}`
                    : 'No deadline'}
                </span>
                <div className="hero-actions">
                  <button className="btn ghost" onClick={() => onEdit(next.task)}>Edit</button>
                  <motion.button className="btn primary" onClick={() => onToggle(next.task.id)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}>
                    Mark done
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <EmptyState icon={<PartyPopper size={34} />} title="You're all caught up" text="No open tasks. Enjoy it — or plan what's next." />
          )}

          {queue.length > 0 && (
            <>
              <h2 className="section-title">Then, in order</h2>
              <div className="list">
                <AnimatePresence mode="popLayout">
                  {queue.map((s, i) => (
                    <TaskCard key={s.task.id} item={s} now={now} rank={i + 2} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </section>

        <aside className="stack">
          <motion.div className="panel center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <h2 className="section-title">This month</h2>
            <ProgressRing percent={percent}>
              <strong><AnimatedNumber value={percent} suffix="%" /></strong>
              <span>complete</span>
            </ProgressRing>
            <p className="muted">{month.completed} finished · {ranked.length} still open</p>
          </motion.div>

          <motion.div className="panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="section-title">Next 7 days</h2>
            {soon.length === 0 ? (
              <p className="muted">No upcoming deadlines this week.</p>
            ) : (
              <ul className="mini-list">
                {soon.map((t) => (
                  <li key={t.id}>
                    <span className={`dot p-${scoreTask(t, now).tier}`} />
                    <div>
                      <b>{t.title}</b>
                      <small>{relativeDay(t.dueDate, today)}{t.dueTime ? ` · ${formatTime(t.dueTime)}` : ''}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </aside>
      </div>
    </div>
  )
}
