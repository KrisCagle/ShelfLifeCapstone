import { useState } from 'react'
import { Check, Heart, PenLine } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Candidate, CatalogSource } from '@/lib/types'
import { PlatformBadge } from '@/components/ui/Misc'
import { CaseArt, caseAspect } from '@/components/collection/CaseCard'

export const SOURCE_LABELS: Record<CatalogSource, string> = {
  igdb: 'IGDB',
  musicbrainz: 'MusicBrainz',
  tmdb: 'TMDB',
  openlibrary: 'Open Library',
  upc: 'Product lookup',
  manual: 'Your entry',
}

/** Cover thumbnail: generated case art right away, the real cover fading in once it loads. */
export function CoverThumb({ src, title, format, className }: { src: string | null; title: string; format?: string | null; className?: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  return (
    <div className={cn('relative shrink-0 self-center overflow-hidden rounded-md bg-ink-800 shadow-lg', caseAspect(format), className)}>
      {state !== 'loaded' && <CaseArt title={title} format={format} compact />}
      {src && state !== 'failed' && (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', state === 'loaded' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  )
}

export function OwnershipBadges({ candidate }: { candidate: Candidate }) {
  return (
    <>
      {candidate.ownedCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-neon-green/15 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-neon-green ring-1 ring-neon-green/40">
          <Check className="size-3" /> Owned{candidate.ownedCount > 1 ? ` ×${candidate.ownedCount}` : ''}
        </span>
      )}
      {candidate.wishlistId && (
        <span className="inline-flex items-center gap-1 rounded-full bg-neon-red/15 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-neon-red ring-1 ring-neon-red/40">
          <Heart className="size-3" /> On wishlist
        </span>
      )}
    </>
  )
}

interface CandidateCardProps {
  candidate: Candidate
  onPick: () => void
  selected?: boolean
}

export function CandidateCard({ candidate, onPick, selected }: CandidateCardProps) {
  const meta = [candidate.creator, candidate.releaseYear].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition',
        selected ? 'border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan' : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]',
      )}
    >
      <CoverThumb src={candidate.coverUrl} title={candidate.title} format={candidate.formatName} className="w-12 transition-transform group-hover:scale-105" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 font-semibold leading-tight text-zinc-100">{candidate.title}</p>
        {meta && <p className="truncate text-sm text-zinc-400">{meta}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {candidate.formatName && <PlatformBadge name={candidate.formatName} />}
          <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-zinc-500">
            {candidate.source === 'manual' && <PenLine className="size-3" />}
            {SOURCE_LABELS[candidate.source]}
          </span>
          <OwnershipBadges candidate={candidate} />
        </div>
      </div>
    </button>
  )
}
