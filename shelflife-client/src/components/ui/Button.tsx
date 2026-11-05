import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'amber' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-neon-cyan text-ink-900 hover:bg-[#33ccff] hover:shadow-glow-cyan active:bg-[#00a8e0]',
  secondary:
    'border border-neon-cyan/70 text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan hover:shadow-glow-cyan',
  amber:
    'bg-neon-amber text-ink-900 hover:bg-[#ffb83d] hover:shadow-glow-amber active:bg-[#e09520]',
  ghost: 'text-zinc-300 hover:text-white hover:bg-white/5',
  danger: 'border border-neon-red/60 text-neon-red hover:bg-neon-red/10 hover:border-neon-red hover:shadow-glow-red',
  subtle: 'border border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20 hover:bg-white/[0.07]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
}

export const buttonClasses = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-display tracking-[0.12em]',
    'transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
    variants[variant],
    sizes[size],
    className,
  )

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function ButtonLink({ variant, size, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  )
}
