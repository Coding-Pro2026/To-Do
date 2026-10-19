import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarCheck2, CheckCheck, ChevronLeft, ChevronRight, Clock4, Target, TriangleAlert } from 'lucide-react'
import { AnimatedNumber, PageHeader, PriorityBadge, ProgressRing, rise, stagger } from '../components/ui'
import { addMonths, daysInMonth, formatDate, formatMonth, formatTime, relativeDay, startOfMonth, toKey, WEEKDAYS, parseKey } from '../lib/dates'
import { dueInstant } from '../lib/dates'
import { indexByDay, monthStats, upcoming } from '../lib/stats'
import type { ViewProps } from './shared'

export default function Activity({ tasks, now }: ViewProps) {
  const today = new Date(now)
  const todayKey = toKey(today)
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState<string>(todayKey)
  const [dir, setDir] = useState(1)

  const stats = useMemo(() => monthStats(tasks, month, now), [tasks, month, now])
  const byDay = useMemo(() => indexByDay(tasks, now), [tasks, now])
  const soon = useMemo(
    () => upcoming(tasks, today, 30, now).filter((t) => {
      const d = parseKey(t.dueDate)
      return d !== null && d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, month, now],
  )

  const lead = month.getDay()
  const total = daysInMonth(month)
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  const keyFor = (day: number) => toKey(new Date(month.getFullYear(), month.getMonth(), day))
  const maxBar = Math.max(1, ...stats.completionsByDay)
  const sel = byDay.get(selected)
  const selDate = parseKey(selected)

  const go = (n: number) => { setDir(n); setMonth((m) => addMonths(m, n)) }

  const cards = [
    { label: 'Completed', value: stats.completed, icon: <CheckCheck size={18} />, tone: 'green' },
    { label: 'Due this month', value: stats.due, icon: <CalendarCheck2 size={18} />, tone: 'cyan' },
    { label: 'Missed', value: stats.missed, icon: <TriangleAlert size={18} />, tone: 'red' },
    { label: 'Created', value: stats.created, icon: <Target size={18} />, tone: 'violet' },
  ]

  return (
    <div className="page">
      <PageHeader title="Monthly activity" subtitle="Track deadlines, completions and how well you hit them." />

      <div className="month-bar">
        <button className="icon-btn big" onClick={() => go(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button>
        <div className="month-label">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2 key={formatMonth(month)} initial={{ opacity: 0, y: 14 * dir }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 * dir }} transition={{ duration: 0.2 }}>
              {formatMonth(month)}
            </motion.h2>
          </AnimatePresence>
        </div>
        <button className="icon-btn big" onClick={() => go(1)} aria-label="Next month"><ChevronRight size={20} /></button>
        <button className="btn ghost small" onClick={() => { setMonth(startOfMonth(today)); setSelected(todayKey) }}>Today</button>
      </div>

      <motion.div className="stats" variants={stagger} initial="hidden" animate="show" key={`stats-${formatMonth(month)}`}>
        {cards.map((c) => (
          <motion.div key={c.label} className={`stat tone-${c.tone}`} variants={rise}>
            <div className="stat-icon">{c.icon}</div>
            <strong><AnimatedNumber value={c.value} /></strong>
            <span>{c.label}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid-2 wide-left">
        <section className="panel">
          <div className="weekdays">{WEEKDAYS.map((w) => <span key={w}>{w}</span>)}</div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={formatMonth(month)}
              className="cal"
              initial={{ opacity: 0, x: 30 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 * dir }}
              transition={{ duration: 0.22 }}
            >
              {cells.map((day, i) => {
                if (day === null) return <span key={`b${i}`} className="cal-blank" />
                const key = keyFor(day)
                const info = byDay.get(key)
                const count = info?.deadlines.length ?? 0
                const hasMissed = (info?.missedCount ?? 0) > 0
                const done = info?.completedCount ?? 0
                return (
                  <motion.button
                    key={key}
                    className={`cal-day ${key === todayKey ? 'today' : ''} ${key === selected ? 'selected' : ''}`}
                    onClick={() => setSelected(key)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    aria-label={`${formatDate(key)}: ${count} deadline${count === 1 ? '' : 's'}, ${done} completed`}
                    aria-pressed={key === selected}
                  >
                    <span className="num">{day}</span>
                    <span className="dots">
                      {(count > 0 || hasMissed) && <i className={hasMissed ? 'miss' : 'due'} />}
                      {done > 0 && <i className="ok" />}
                    </span>
                    {count > 1 && <em>{count}</em>}
                  </motion.button>
                )
              })}
            </motion.div>
          </AnimatePresence>
          <div className="legend">
            <span><i className="due" /> Deadline</span>
            <span><i className="miss" /> Missed</span>
            <span><i className="ok" /> Completed</span>
          </div>
        </section>

        <aside className="stack">
          <div className="panel center">
            <h2 className="section-title"><Clock4 size={18} /> On-time rate</h2>
            <ProgressRing percent={stats.onTimeRate ?? 0} size={120}>
              <strong>{stats.onTimeRate === null ? '—' : <AnimatedNumber value={stats.onTimeRate} suffix="%" />}</strong>
            </ProgressRing>
            <p className="muted">{stats.onTime} on time · {stats.missed} missed</p>
          </div>

          <div className="panel">
            <h2 className="section-title">{selDate ? formatDate(selected) : 'Selected day'}</h2>
            {!sel || (sel.deadlines.length === 0 && sel.rescheduled.length === 0 && sel.completedCount === 0) ? (
              <p className="muted">Nothing scheduled or completed this day.</p>
            ) : (
              <ul className="mini-list">
                {sel.deadlines.map((t) => {
                  const due = dueInstant(t.dueDate, t.dueTime)!
                  const state = t.completedAt !== null ? (t.completedAt > due ? 'Finished late' : 'Done') : now > due ? 'Missed' : 'Upcoming'
                  return (
                    <li key={t.id}>
                      <span className={`dot ${state === 'Missed' || state === 'Finished late' ? 'bad' : state === 'Done' ? 'good' : 'p-medium'}`} />
                      <div>
                        <b>{t.title}</b>
                        <small>{state}{t.dueTime ? ` · ${formatTime(t.dueTime)}` : ''}</small>
                      </div>
                      <PriorityBadge priority={t.priority} />
                    </li>
                  )
                })}
                {sel.rescheduled.map((t) => (
                  <li key={`r-${t.id}`}>
                    <span className="dot bad" />
                    <div>
                      <b>{t.title}</b>
                      <small>Missed · moved to {formatDate(t.dueDate)}</small>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </li>
                ))}
                {sel.completedCount > 0 && <li className="note">✅ {sel.completedCount} task{sel.completedCount === 1 ? '' : 's'} completed this day</li>}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <div className="grid-2 wide-left">
        <section className="panel">
          <h2 className="section-title">Completions per day</h2>
          <div className="bars" role="img" aria-label={`Daily completions in ${formatMonth(month)}`}>
            {stats.completionsByDay.map((n, i) => (
              <div key={i} className="bar-col" title={`${n} completed on day ${i + 1}`}>
                <motion.div
                  className={`bar ${n === 0 ? 'zero' : ''}`}
                  initial={{ height: 0 }}
                  animate={{ height: n === 0 ? 4 : `${(n / maxBar) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 16, delay: i * 0.012 }}
                />
                {(i + 1) % 5 === 0 || i === 0 ? <small>{i + 1}</small> : <small />}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Upcoming this month</h2>
          {soon.length === 0 ? (
            <p className="muted">No remaining deadlines in {formatMonth(month)}.</p>
          ) : (
            <ul className="mini-list">
              {soon.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <span className="dot p-medium" />
                  <div>
                    <b>{t.title}</b>
                    <small>{formatDate(t.dueDate)} · {relativeDay(t.dueDate, today)}</small>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
