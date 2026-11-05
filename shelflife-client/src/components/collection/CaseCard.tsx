import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { platformColor, platformMedia, platformShort, withAlpha } from '@/lib/platforms'
import { PlatformBadge, Tag } from '@/components/ui/Misc'

/** Records and CDs are square sleeves; games and tapes are tall boxes. */
export const caseAspect = (format?: string | null) => (format && platformMedia(format) === 'Music' ? 'aspect-square' : 'aspect-[5/7]')

export interface CaseCardData {
  id?: number
  title: string
  format?: string | null
  condition?: string | null
  price?: number | null
  imageUrl?: string | null
  genres?: string[]
  /** Short collector badges like "CIB" or "VG+". */
  badges?: string[]
}

/** Generated "box art" for titles without a cover: platform-tinted case with a labeled spine. */
export function CaseArt({ title, format, compact }: { title: string; format?: string | null; compact?: boolean }) {
  const color = platformColor(format)
  return (
    <div
      className="absolute inset-0 flex overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${withAlpha(color, 0.32)} 0%, #0b0b18 45%, #06060f 100%)`,
      }}
    >
      <div
        className="flex w-[14%] shrink-0 items-center justify-center border-r border-black/40"
        style={{ backgroundColor: withAlpha(color, 0.85) }}
      >
        <span
          className="whitespace-nowrap font-display tracking-[0.2em] text-black/80"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: compact ? '0.6rem' : '0.75rem' }}
        >
          {platformShort(format)}
        </span>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center p-3 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: `repeating-linear-gradient(135deg, ${withAlpha(color, 0.12)} 0 2px, transparent 2px 12px)` }}
        />
        <span
          className={cn('relative font-display tracking-[0.15em]', compact ? 'text-sm' : 'text-lg')}
          style={{ color, textShadow: `0 0 14px ${withAlpha(color, 0.7)}` }}
        >
          {format}
        </span>
        <span className={cn('relative mt-2 line-clamp-4 font-display leading-tight tracking-wider text-white/90', compact ? 'text-base' : 'text-2xl')}>
          {title}
        </span>
      </div>
    </div>
  )
}

// Generated case art shows immediately; a real cover fades in over it once loaded
// (cover hosts like the Cover Art Archive can take a few seconds).
function Cover({ title, format, imageUrl, compact }: Pick<CaseCardData, 'title' | 'format' | 'imageUrl'> & { compact?: boolean }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  return (
    <>
      {state !== 'loaded' && <CaseArt title={title} format={format} compact={compact} />}
      {imageUrl && state !== 'failed' && (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', state === 'loaded' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </>
  )
}

interface CaseCardProps {
  item: CaseCardData
  to?: string
  compact?: boolean
  showInfo?: boolean
  className?: string
}

/** A collection item as a game case: tilts toward the cursor with a light sheen. */
export function CaseCard({ item, to, compact, showInfo = true, className }: CaseCardProps) {
  const color = platformColor(item.format)
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(my, [0, 1], [9, -9]), { stiffness: 220, damping: 18 })
  const rotateY = useSpring(useTransform(mx, [0, 1], [-11, 11]), { stiffness: 220, damping: 18 })
  const sheenX = useTransform(mx, (v) => `${v * 100}%`)
  const sheenY = useTransform(my, (v) => `${v * 100}%`)
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX} ${sheenY}, rgba(255,255,255,0.22), transparent 55%)`
  const [hovered, setHovered] = useState(false)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }
  const onLeave = () => {
    mx.set(0.5)
    my.set(0.5)
    setHovered(false)
  }

  const card = (
    <motion.div
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
        boxShadow: hovered
          ? `0 22px 40px -12px rgba(0,0,0,0.9), 0 0 28px ${withAlpha(color, 0.45)}`
          : '0 14px 24px -12px rgba(0,0,0,0.85)',
      }}
      animate={{ y: hovered ? -8 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn('group relative overflow-hidden rounded-md border bg-ink-800 transition-[border-color] duration-300', className)}
    >
      <div className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
      <div className={cn('relative w-full overflow-hidden', caseAspect(item.format))}>
        <Cover title={item.title} format={item.format} imageUrl={item.imageUrl} compact={compact} />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: sheen }} />
        {compact && item.badges?.[0] && (
          <span className="absolute right-1.5 top-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-neon-amber ring-1 ring-neon-amber/50 backdrop-blur">
            {item.badges[0]}
          </span>
        )}
      </div>
      {showInfo && (
        <div className={cn('space-y-2 border-t border-white/5 bg-ink-900/95', compact ? 'p-2' : 'p-3')}>
          <p className={cn('line-clamp-2 font-semibold uppercase leading-tight tracking-wide text-zinc-100', compact ? 'min-h-[2.2em] text-sm' : 'min-h-[2.5em] text-base')}>
            {item.title}
          </p>
          <div className="flex items-center justify-between gap-1">
            <div className="flex min-w-0 items-center gap-1">
              <PlatformBadge name={item.format} />
              {item.condition && !compact && <Tag className="truncate">{item.condition}</Tag>}
            </div>
            {item.price != null && (
              <span className={cn('font-mono text-neon-amber text-glow-amber', compact ? 'text-sm' : 'text-base')}>
                {formatMoney(item.price)}
              </span>
            )}
          </div>
          {!compact && ((item.badges?.length ?? 0) > 0 || (item.genres?.length ?? 0) > 0) && (
            <div className="flex gap-1 overflow-hidden">
              {item.badges?.map((b) => (
                <Tag key={b} className="shrink-0 border-neon-amber/40 text-neon-amber">
                  {b}
                </Tag>
              ))}
              {item.genres?.slice(0, 2 - Math.min(item.badges?.length ?? 0, 1)).map((g) => (
                <Tag key={g}>{g}</Tag>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )

  return to ? (
    <Link to={to} className="block rounded-md focus-visible:ring-offset-0" aria-label={`${item.title}, ${item.format ?? ''}`}>
      {card}
    </Link>
  ) : (
    card
  )
}

/** Wooden plank the cases stand on. */
export function ShelfPlank({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-5 rounded-b-md shadow-shelf', className)}>
      <div className="absolute inset-0 rounded-b-md bg-gradient-to-b from-wood via-[#3d2810] to-wood-dark" />
      <div className="absolute inset-x-0 top-0 h-[2px] bg-wood-light/80" />
      <div
        className="absolute inset-0 rounded-b-md opacity-40 mix-blend-overlay"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.25) 0 1px, transparent 1px 37px)' }}
      />
    </div>
  )
}
