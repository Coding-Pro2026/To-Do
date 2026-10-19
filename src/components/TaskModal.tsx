import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { PRIORITIES, type Task } from '../types'
import type { TaskInput } from '../lib/useTasks'
import { isValidTime, parseKey, toKey } from '../lib/dates'
import { LIMITS } from '../lib/storage'
import { PRIORITY_LABEL } from './ui'

interface Props {
  task: Task | null
  onSave: (input: TaskInput) => void
  onClose: () => void
}

export default function TaskModal({ task, onSave, onClose }: Props) {
  const uid = useId()
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [dueDate, setDueDate] = useState(task ? task.dueDate : toKey(new Date()))
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [error, setError] = useState('')

  useEffect(() => {
    titleRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return setError('Give your task a name.')
    if (dueDate && !parseKey(dueDate)) return setError('That deadline is not a valid date.')
    if (dueTime && !dueDate) return setError('Pick a date to go with the time.')
    if (dueTime && !isValidTime(dueTime)) return setError('That time is not valid.')
    onSave({ title: t, description: description.trim(), dueDate, dueTime: dueDate ? dueTime : '', priority })
  }

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-h`}
        className="modal"
        onSubmit={submit}
        noValidate
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="modal-head">
          <h2 id={`${uid}-h`}>{task ? 'Edit task' : 'New task'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="field">
          <span>What needs to be done?</span>
          <input
            ref={titleRef}
            value={title}
            maxLength={LIMITS.title}
            onChange={(e) => { setTitle(e.target.value); setError('') }}
            placeholder="e.g. Submit quarterly report"
          />
        </label>

        <label className="field">
          <span>Description <small>— details of what to do</small></span>
          <textarea
            rows={3}
            value={description}
            maxLength={LIMITS.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Break it down: steps, links, who to ping…"
          />
        </label>

        <div className="row">
          <label className="field">
            <span>Deadline</span>
            <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setError('') }} />
          </label>
          <label className="field">
            <span>Time <small>(optional)</small></span>
            <input type="time" value={dueTime} disabled={!dueDate} onChange={(e) => setDueTime(e.target.value)} />
          </label>
        </div>

        <fieldset className="field">
          <legend>Priority</legend>
          <div className="seg">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p}
                className={`seg-btn p-${p} ${priority === p ? 'active' : ''}`}
                aria-pressed={priority === p}
                onClick={() => setPriority(p)}
              >
                {priority === p && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <b>{PRIORITY_LABEL[p]}</b>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="form-error" role="alert" aria-live="polite">{error}</div>

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <motion.button type="submit" className="btn primary" whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}>
            {task ? 'Save changes' : 'Add task'}
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  )
}
