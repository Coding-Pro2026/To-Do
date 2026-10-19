import type { Task } from '../types'

export interface ViewProps {
  tasks: Task[]
  now: number
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onAdd: () => void
}
