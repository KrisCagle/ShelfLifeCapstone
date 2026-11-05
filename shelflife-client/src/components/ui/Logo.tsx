import { cn } from '@/lib/cn'

/**
 * The neon sign from public/logo.png. The source image has a lot of black padding,
 * so this crops to the artwork with percentage margins (which scale with width),
 * and `mix-blend-screen` drops the black background over glass and wood.
 */
export function Logo({ className, flicker }: { className?: string; flicker?: boolean }) {
  return (
    <span
      className={cn('relative block overflow-hidden mix-blend-screen', flicker && 'animate-flicker', className)}
      style={{ aspectRatio: '1305 / 302' }}
    >
      <img
        src="/logo.png"
        alt="ShelfLife"
        draggable={false}
        className="block max-w-none select-none"
        style={{ width: '131.88%', marginLeft: '-15.71%', marginTop: '-22.22%' }}
      />
    </span>
  )
}
