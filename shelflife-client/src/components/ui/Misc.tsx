import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { platformColor, platformShort, withAlpha } from '@/lib/platforms'

/** Frosted-glass content card. `accent` adds a colored top edge. */
export function Panel({ className, accent, children, ...props }: HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  return (
    <div
      className={cn('glass relative overflow-hidden rounded-2xl', className)}
      {...props}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
        />
      )}
      {children}
    </div>
  )
}

export function PlatformBadge({ name, className }: { name?: string | null; className?: string }) {
  const color = platformColor(name)
  return (
    <span
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 font-display text-[0.8rem] leading-none tracking-wider', className)}
      style={{ color, backgroundColor: withAlpha(color, 0.14), boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.45)}` }}
    >
      {platformShort(name)}
    </span>
  )
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-zinc-400', className)}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-white/[0.05]', className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}

interface PageHeaderProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div>
        {eyebrow && <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-neon-amber">{eyebrow}</p>}
        <h1 className="font-display text-4xl tracking-[0.08em] text-white sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan shadow-glow-cyan">
        {icon}
      </div>
      <h2 className="font-display text-3xl tracking-[0.1em] text-white">{title}</h2>
      {description && <p className="mt-2 max-w-md text-zinc-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Shared "dimmed glow behind the number" stat tile. */
export function Stat({ label, value, color = '#00bfff', hint }: { label: string; value: ReactNode; color?: string; hint?: ReactNode }) {
  return (
    <div className="glass relative min-w-0 overflow-hidden rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full blur-2xl" style={{ backgroundColor: withAlpha(color, 0.25) }} />
      <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500 sm:text-[0.7rem]">{label}</p>
      <p className="mt-0.5 truncate font-mono text-lg sm:text-2xl" style={{ color, textShadow: `0 0 14px ${withAlpha(color, 0.45)}` }}>
        {value}
      </p>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}
