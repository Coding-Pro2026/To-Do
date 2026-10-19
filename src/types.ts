export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']

export interface Task {
  id: string
  title: string
  description: string
  /** Local calendar date, `YYYY-MM-DD`. Empty string means no deadline. */
  dueDate: string
  /** Optional local time, `HH:mm`. Empty string means end of day. */
  dueTime: string
  priority: Priority
  /** Epoch ms when created. */
  createdAt: number
  /** Epoch ms when completed, or null while open. */
  completedAt: number | null
  /** Original deadline (`YYYY-MM-DD`) if this task was overdue when it was rescheduled; keeps the miss on record. */
  missedFrom?: string
}

export type Tier = 'low' | 'medium' | 'high' | 'critical'
