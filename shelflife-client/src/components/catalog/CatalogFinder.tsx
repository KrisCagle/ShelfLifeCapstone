import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Barcode, Loader2, Plus, ScanLine, Search, X } from 'lucide-react'
import { useBarcodeLookup, useCatalogSearch, useFormats, useItems } from '@/hooks/queries'
import { useDebounced } from '@/hooks/useDebounced'
import { cn } from '@/lib/cn'
import { platformColor, withAlpha } from '@/lib/platforms'
import type { Candidate, Format, MediaType } from '@/lib/types'
import { Select } from '@/components/ui/Form'
import { Skeleton } from '@/components/ui/Misc'
import { CandidateCard } from './CandidateCard'
import { FormatOptions } from './FormatOptions'

// The scanner pulls in a ~1 MB decoder, so it only loads when someone opens it.
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

const MEDIA_NOUN: Record<MediaType, string> = { Games: 'game', Music: 'album', Movies: 'movie', Books: 'book', Comics: 'comic' }

const LAST_FORMAT_KEY = 'shelflife:last-format'

/** Ready to search straight away when adding to a collection of one kind. */
const DEFAULT_FORMAT: Partial<Record<MediaType, string>> = { Books: 'Paperback', Comics: 'Single Issue' }

const formatKey = (media?: MediaType) => (media ? `${LAST_FORMAT_KEY}:${media}` : LAST_FORMAT_KEY)

const storedFormat = (media?: MediaType) => {
  try {
    return Number(localStorage.getItem(formatKey(media))) || null
  } catch {
    return null
  }
}

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
  /** Limits the formats on offer, when adding to one collection. */
  media?: MediaType
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
export function CatalogFinder({ onPick, initialQuery = '', initialFormatId = null, manualLabel, media }: CatalogFinderProps) {
  const { data: formats } = useFormats()
  const { data: items } = useItems()
  const [pickedFormatId, setFormatId] = useState<number | null>(() => initialFormatId ?? storedFormat(media))
  const allowed = useMemo(() => (media ? formats?.filter((f) => f.mediaType === media) : formats), [formats, media])
  const picked = allowed?.find((f) => f.id === pickedFormatId)
  const formatId = media ? (picked ?? allowed?.find((f) => f.name === DEFAULT_FORMAT[media]) ?? allowed?.[0])?.id ?? null : pickedFormatId
  const [query, setQuery] = useState(initialQuery)
  const [scanning, setScanning] = useState(false)
  const [barcode, setBarcode] = useState<string | null>(null)
  const debounced = useDebounced(query)
  const search = useCatalogSearch(debounced, formatId)
  const scan = useBarcodeLookup(barcode)
  const searchRef = useRef<HTMLInputElement>(null)

  const format = formats?.find((f) => f.id === formatId)

  // The formats this person actually collects, so the usual ones stay one tap away.
  const topFormats = useMemo(() => {
    const counts = new Map<number, number>()
    items?.forEach((i) => counts.set(i.formatId, (counts.get(i.formatId) ?? 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id]) => formats?.find((f) => f.id === id))
      .filter((f): f is Format => !!f)
  }, [items, formats])

  // A collection of one kind has few enough formats to just show them all.
  const chips = media ? (allowed ?? []) : topFormats

  const pickFormat = (id: number) => {
    setFormatId(id)
    try {
      localStorage.setItem(formatKey(media), String(id))
    } catch {
      // Storage blocked; it just won't be remembered next time.
    }
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const provider = search.data?.provider
  const results = barcode ? scan.data?.results ?? [] : search.data?.results ?? []
  const loading = barcode ? scan.isFetching : search.isFetching && debounced.trim().length >= 2
  const typing = query !== debounced

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">1 · Format</p>
        <div className={cn('relative', media && 'hidden')}>
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-3 -translate-y-1/2 rounded-full transition-colors"
            style={format ? { backgroundColor: platformColor(format.name), boxShadow: `0 0 10px ${platformColor(format.name)}` } : { backgroundColor: '#3d3d56' }}
            aria-hidden
          />
          <Select aria-label="Format" value={format?.id ?? ''} onChange={(e) => pickFormat(Number(e.target.value))} className="h-12 py-0 pl-9 text-lg font-semibold">
            <option value="" disabled>
              Choose a format…
            </option>
            <FormatOptions formats={formats} />
          </Select>
        </div>
        {chips.length > 0 && (
          <div className={cn('flex flex-wrap items-center gap-1.5', !media && 'mt-2')} aria-label={media ? 'Format' : 'Your most used formats'}>
            {chips.map((f) => {
              const active = f.id === formatId
              const color = platformColor(f.name)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => pickFormat(f.id)}
                  aria-pressed={active}
                  className={cn('rounded-md px-2.5 py-1 font-display text-base tracking-wider transition', !active && 'text-zinc-400 ring-1 ring-white/10 hover:text-white hover:ring-white/25')}
                  style={active ? { color: '#050510', backgroundColor: color, boxShadow: `0 0 16px ${withAlpha(color, 0.5)}` } : undefined}
                >
                  {f.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">2 · Find it</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setBarcode(null)
              }}
              disabled={!formatId}
              autoFocus={!!formatId}
              placeholder={!format ? 'Pick a format first' : format.mediaType === 'Comics' ? 'Series and issue, like Saga 12' : `Search for a ${MEDIA_NOUN[format.mediaType]}${format.mediaType === 'Music' ? ' or artist' : ''}…`}
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
            {provider.name} isn’t available right now, so this searches your own titles. You can still scan or add it by hand.
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
        {barcode && scan.isError && !scan.isFetching && (
          <p className="py-4 text-center text-neon-amber">Couldn’t reach ShelfLife to look that up. Check your connection and scan again.</p>
        )}
        {barcode && !scan.isError && !scan.isFetching && results.length === 0 && (
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
