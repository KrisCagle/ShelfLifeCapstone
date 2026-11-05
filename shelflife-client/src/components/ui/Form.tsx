import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-lg border bg-ink-800/80 px-3.5 py-2.5 text-[0.95rem] text-zinc-100 placeholder:text-zinc-500 ' +
  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neon-cyan/40 disabled:opacity-60'

const controlBorder = (invalid?: boolean) =>
  invalid ? 'border-neon-red/70 focus:border-neon-red' : 'border-white/10 hover:border-white/20 focus:border-neon-cyan/70'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode
  className?: string
}

/** Label + control + hint/error, with the aria wiring done once. */
export function Field({ label, error, hint, optional, children, className }: FieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">
        {label}
        {optional && <span className="normal-case tracking-normal text-zinc-600">optional</span>}
      </label>
      {children({ id, invalid: !!error, describedBy: error || hint ? messageId : undefined })}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-neon-red">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface ControlProps {
  invalid?: boolean
}

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input aria-invalid={invalid || undefined} className={cn(control, controlBorder(invalid), className)} {...props} />
}

export function Textarea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(control, controlBorder(invalid), 'min-h-24 resize-y', className)}
      {...props}
    />
  )
}

export function Select({ invalid, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(control, controlBorder(invalid), 'cursor-pointer appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
    </div>
  )
}

interface SegmentedOption<T> {
  value: T
  label: string
  color?: string
}

interface SegmentedProps<T> {
  options: SegmentedOption<T>[]
  value: T | null
  onChange: (value: T) => void
  invalid?: boolean
  name: string
}

/** Pill-style single choice (radio group), e.g. condition or priority. */
export function Segmented<T extends string | number>({ options, value, onChange, invalid, name }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-invalid={invalid || undefined}
      className={cn('flex flex-wrap gap-2 rounded-xl', invalid && 'ring-1 ring-neon-red/60 ring-offset-4 ring-offset-ink-900')}
    >
      {options.map((option) => {
        const selected = option.value === value
        const color = option.color ?? '#00bfff'
        return (
          <label
            key={String(option.value)}
            className={cn(
              'cursor-pointer rounded-lg border px-3.5 py-2 font-mono text-sm uppercase tracking-wider transition-all',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neon-cyan/60',
              selected ? 'text-ink-900' : 'border-white/10 bg-ink-800/60 text-zinc-400 hover:border-white/25 hover:text-zinc-200',
            )}
            style={selected ? { backgroundColor: color, borderColor: color, boxShadow: `0 0 18px ${color}55` } : undefined}
          >
            <input
              type="radio"
              name={name}
              aria-label={option.label}
              className="sr-only"
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        )
      })}
    </div>
  )
}
