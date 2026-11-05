import { withAlpha } from '@/lib/platforms'
import type { Priority } from '@/lib/types'

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  1: { label: 'Low', color: '#00ff88' },
  2: { label: 'Medium', color: '#f5a623' },
  3: { label: 'High', color: '#ff4444' },
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const { label, color } = PRIORITIES[priority] ?? PRIORITIES[1]
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider"
      style={{ color, backgroundColor: withAlpha(color, 0.12), boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.4)}` }}
    >
      {label}
    </span>
  )
}
