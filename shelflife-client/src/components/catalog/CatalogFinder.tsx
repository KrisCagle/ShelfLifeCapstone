import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Barcode, Loader2, Plus, ScanLine, Search, X } from 'lucide-react'
import { useBarcodeLookup, useCatalogSearch, useFormats } from '@/hooks/queries'
import { useDebounced } from '@/hooks/useDebounced'
import { cn } from '@/lib/cn'
import { platformColor, withAlpha } from '@/lib/platforms'
import type { Candidate, Format, MediaType } from '@/lib/types'
import { Skeleton } from '@/components/ui/Misc'
import { CandidateCard } from './CandidateCard'

// The scanner pulls in a ~1 MB decoder, so it only loads when someone opens it.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

const MEDIA_ORDER: MediaType[] = ['Games', 'Music', 'Movies']
const MEDIA_NOUN: Record<MediaType, string> = { Games: 'game', Music: 'album', Movies: 'movie' }

export interface FinderPick {
  candidate: Candidate
  barcode?: string
}

interface CatalogFinderProps {
  onPick: (pick: FinderPick) => void
  initialQuery?: string
  initialFormatId?: number | null
  /** Text for the manual-entry fallback, e.g. "Add it by hand". */
  manualLabel?: string
}

export const manualCandidate = (title: string, format: Format): Candidate => ({
  catalogEntryId: null,
  source: 'manual',
  externalId: null,
  title: title.trim(),
  formatId: format.id,
  formatName: format.name,
  releaseYear: null,
  creator: null,
  coverUrl: null,
  barcode: null,
  ownedCount: 0,
  firstOwnedItemId: null,
  wishlistId: null,
})

/** Step one of adding anything: pick a format, then search, scan, or type it in. */
export function CatalogFinder({ onPick, initialQuery = '', initialFormatId = null, manualLabel }: CatalogFinderProps) {
  const { data: formats } = useFormats()
  const [formatId, setFormatId] = useState<number | null>(initialFormatId)
  const [query, setQuery] = useState(initialQuery)
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState<string | null>(null)
  const debounced = useDebounced(query)
  const search = useCatalogSearch(debounced, formatId)
  const scan = useBarcodeLookup(barcode)

  const format = formats?.find((f) => f.id === formatId)
  const grouped = useMemo(
    () => MEDIA_ORDER.map((media) => ({ media, formats: (formats ?? []).filter((f) => f.mediaType === media) })),
    [formats],
  )

  const provider = search.data?.provider
  const results = barcode ? scan.data?.results ?? [] : search.data?.results ?? []
  const loading = barcode ? scan.isFetching : search.isFetching && debounced.trim().length >= 2
  const typing = query !== debounced

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">1 · Format</p>
        <div className="space-y-2">
          {grouped.map(({ media, formats: list }) => (
            <div key={media} className="flex flex-wrap items-center gap-1.5">
              <span className="w-14 font-mono text-[0.65rem] uppercase tracking-wider text-zinc-600">{media}</span>
              {list.map((f) => {
                const active = f.id === formatId
                const color = platformColor(f.name)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormatId(f.id)}
                    aria-pressed={active}
                    className={cn('rounded-md px-2.5 py-1 font-display text-base tracking-wider transition', !active && 'text-zinc-400 ring-1 ring-white/10 hover:text-white hover:ring-white/25')}
                    style={active ? { color: '#050510', backgroundColor: color, boxShadow: `0 0 16px ${withAlpha(color, 0.5)}` } : undefined}
                  >
                    {f.name}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">2 · Find it</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setBarcode(null)
              }}
              disabled={!formatId}
              autoFocus={!!formatId}
              placeholder={format ? `Search for a ${MEDIA_NOUN[format.mediaType]}${format.mediaType === 'Music' ? ' or artist' : ''}…` : 'Pick a format first'}
              aria-label="Search the catalog"
              className="h-12 w-full rounded-xl border border-white/10 bg-ink-800/80 pl-9 pr-10 text-lg text-zinc-100 placeholder:text-zinc-500 focus:border-neon-cyan/70 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
            />
            {(loading || typing) && query.trim().length >= 2 && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-neon-cyan" aria-label="Searching" />
            )}
          </div>
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-neon-cyan/50 px-4 font-display text-lg tracking-[0.12em] text-neon-cyan transition hover:bg-neon-cyan/10 hover:shadow-glow-cyan"
          >
            <ScanLine className="size-5" /> <span className="hidden sm:inline">Scan</span>
          </button>
        </div>
        {provider && !provider.configured && formatId && (
          <p className="mt-2 text-sm text-zinc-500">
            {provider.name} lookups aren’t connected yet, so this searches your own titles. You can still scan or add it by hand.
          </p>
        )}
        {provider?.configured && <p className="mt-2 font-mono text-xs text-zinc-600">Searching {provider.name}</p>}
      </div>

      {barcode && (
        <div className="flex items-center justify-between rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 px-3 py-2 font-mono text-sm text-neon-cyan">
          <span className="flex items-center gap-2">
            <Barcode className="size-4" /> Barcode {barcode}
          </span>
          <button type="button" onClick={() => setBarcode(null)} className="text-zinc-400 hover:text-white" aria-label="Clear barcode">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="space-y-2" aria-live="polite">
        {loading && results.length === 0 ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.5rem] rounded-xl" />)
        ) : (
          <AnimatePresence initial={false}>
            {results.map((c, i) => (
              <motion.div
                key={`${c.source}-${c.externalId ?? c.catalogEntryId}-${c.formatId}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <CandidateCard candidate={c} onPick={() => onPick({ candidate: c, barcode: barcode ?? undefined })} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {barcode && !scan.isFetching && results.length === 0 && (
          <p className="py-4 text-center text-zinc-400">No match for that barcode. Search by name or add it by hand.</p>
        )}
        {!barcode && !loading && !typing && debounced.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-center text-zinc-400">No matches for “{debounced.trim()}”.</p>
        )}
      </div>

      {format && (query.trim() || barcode) && (
        <button
          type="button"
          onClick={() => onPick({ candidate: manualCandidate(query || '', format), barcode: barcode ?? undefined })}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-white/15 p-3 text-left text-zinc-300 transition hover:border-neon-amber/60 hover:bg-neon-amber/5 hover:text-neon-amber"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-white/5">
            <Plus className="size-5" />
          </span>
          <span>
            {manualLabel ?? 'Not listed?'}{' '}
            <span className="font-semibold">{query.trim() ? `Add “${query.trim()}” by hand` : 'Add it by hand'}</span>
            <span className="block text-sm text-zinc-500">You can fill in the cover and details yourself.</span>
          </span>
        </button>
      )}

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner
            open={scanning}
            onClose={() => setScanning(false)}
            onDetected={(code) => {
              setScanning(false)
              setBarcode(code)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
