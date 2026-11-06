import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { BadgeDollarSign, Grid3x3, Layers, LayoutList, Library, Plus, Rows3, Search, SearchX, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAttributeDefinitions, useCollectionValue, useItems } from '@/hooks/queries'
import { cardBadges } from '@/components/catalog/AttributeFields'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import type { AttributeDefinition, Item, MediaType } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Panel, PlatformBadge, Skeleton, Stat, Tag } from '@/components/ui/Misc'
import { CaseArt, CaseCard, caseAspect, ShelfPlank, type CaseCardData } from '@/components/collection/CaseCard'

type View = 'shelf' | 'grid' | 'list'
type Sort = 'recent' | 'title' | 'price-desc' | 'price-asc' | 'acquired'

const SORTS: Record<Sort, { label: string; compare: (a: Item, b: Item) => number }> = {
  recent: { label: 'Recently added', compare: (a, b) => b.id - a.id },
  title: { label: 'Title A–Z', compare: (a, b) => a.title.localeCompare(b.title) },
  'price-desc': { label: 'Price: high to low', compare: (a, b) => b.purchasePrice - a.purchasePrice },
  'price-asc': { label: 'Price: low to high', compare: (a, b) => a.purchasePrice - b.purchasePrice },
  acquired: { label: 'Date acquired', compare: (a, b) => b.dateAcquired.localeCompare(a.dateAcquired) },
}

const VIEW_KEY = 'shelflife:collection-view'
const storedView = (): View => {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'grid' || v === 'list' ? v : 'shelf'
  } catch {
    return 'shelf'
  }
}

type Definitions = Record<MediaType, AttributeDefinition[]> | undefined

const toCard = (item: Item, definitions: Definitions): CaseCardData => ({
  id: item.id,
  title: item.title,
  format: item.format?.name,
  condition: item.condition?.name,
  price: item.purchasePrice,
  imageUrl: item.imageUrl,
  genres: item.itemGenres?.map((g) => g.genre?.name).filter((g): g is string => !!g),
  badges: cardBadges(definitions, item.format, item.attributes),
})

export default function CollectionPage() {
  const { data: items, isLoading, isError, refetch } = useItems()
  const { data: definitions } = useAttributeDefinitions()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const format = params.get('format') ?? ''
  const genre = params.get('genre') ?? ''
  const sort = (params.get('sort') as Sort) in SORTS ? (params.get('sort') as Sort) : 'recent'
  const view = (params.get('view') as View | null) ?? storedView()
  const searchRef = useRef<HTMLInputElement>(null)

  const update = (changes: Record<string, string>) => {
    const nextParams = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? nextParams.set(k, v) : nextParams.delete(k)))
    setParams(nextParams, { replace: true })
  }

  const setView = (v: View) => {
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Storage blocked; the URL still carries the view.
    }
    update({ view: v === 'shelf' ? '' : v })
  }

  // "/" jumps to search, Escape clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const formats = useMemo(() => [...new Set(items?.map((i) => i.format?.name).filter(Boolean) as string[])].sort(), [items])
  const genres = useMemo(
    () => [...new Set(items?.flatMap((i) => i.itemGenres?.map((g) => g.genre?.name) ?? []).filter(Boolean) as string[])].sort(),
    [items],
  )

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items ?? [])
      .filter(
        (i) =>
          (!needle ||
            [i.title, i.catalogEntry?.creator, i.storeFound, i.notes, i.barcode].some((v) => v?.toLowerCase().includes(needle))) &&
          (!format || i.format?.name === format) &&
          (!genre || i.itemGenres?.some((g) => g.genre?.name === genre)),
      )
      .sort(SORTS[sort].compare)
  }, [items, q, format, genre, sort])

  const filtersActive = !!(q || format || genre)
  const invested = items?.reduce((sum, i) => sum + (i.purchasePrice || 0), 0) ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Your vault"
        title="My collection"
        actions={
          <>
            <ButtonLink to="/haul" variant="secondary" icon={<Layers className="size-4" />}>
              Scan a haul
            </ButtonLink>
            <ButtonLink to="/items/new" icon={<Plus className="size-4" />}>
              Add title
            </ButtonLink>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Titles" value={isLoading ? '…' : (items?.length ?? 0)} />
        <Stat label="Invested" color="#f5a623" value={isLoading ? '…' : formatMoney(invested)} />
        <ValueStat items={items ?? []} invested={invested} />
      </div>

      {/* Toolbar */}
      {/* Sticky on desktop only; on phones it would cover most of the shelf. */}
      <div className="glass z-30 mt-6 flex flex-col gap-3 rounded-2xl p-3 lg:sticky lg:top-[4.5rem] lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && update({ q: '' })}
            placeholder="Search titles, artists, stores…"
            aria-label="Search collection"
            className="h-10 w-full rounded-lg border border-white/10 bg-ink-800/80 pl-9 pr-16 text-zinc-100 placeholder:text-zinc-500 focus:border-neon-cyan/70 focus:outline-none focus:ring-2 focus:ring-neon-cyan/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <button onClick={() => update({ q: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-white" aria-label="Clear search">
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 font-mono text-xs text-zinc-500 sm:block">/</kbd>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Select aria-label="Filter by format" value={format} onChange={(e) => update({ format: e.target.value })} className="h-10 py-0 sm:w-40">
            <option value="">All formats</option>
            {formats.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
          <Select aria-label="Filter by genre" value={genre} onChange={(e) => update({ genre: e.target.value })} className="h-10 py-0 sm:w-36">
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
          <div className="col-span-2 sm:col-span-1">
            <Select aria-label="Sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'recent' ? '' : e.target.value })} className="h-10 py-0 sm:w-48">
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-4 mt-5 flex items-center justify-between font-mono text-sm text-zinc-500">
        <span aria-live="polite">
          {!isLoading && items && (filtersActive ? `${visible.length} of ${items.length} titles` : `${items.length} titles`)}
        </span>
        {filtersActive && (
          <button onClick={() => update({ q: '', format: '', genre: '' })} className="text-neon-amber hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <ShelfSkeleton />
      ) : isError ? (
        <Panel className="p-10 text-center">
          <p className="text-zinc-300">We couldn’t load your collection.</p>
          <Button variant="subtle" size="sm" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </Panel>
      ) : items?.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Library className="size-8" />}
            title="Your vault is empty"
            description="Add the first title from your shelf: a game, a record, a tape. It takes about ten seconds."
            action={
              <ButtonLink to="/items/new" size="lg" icon={<Plus className="size-5" />}>
                Add your first title
              </ButtonLink>
            }
          />
        </Panel>
      ) : visible.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<SearchX className="size-8" />}
            title="No matches"
            description="Nothing on your shelf matches those filters."
            action={
              <Button variant="secondary" onClick={() => update({ q: '', format: '', genre: '' })}>
                Clear filters
              </Button>
            }
          />
        </Panel>
      ) : view === 'list' ? (
        <ListView items={visible} />
      ) : (
        <ShelfView items={visible} dense={view === 'grid'} definitions={definitions} />
      )}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string; icon: typeof Rows3 }[] = [
    { value: 'shelf', label: 'Shelf view', icon: Rows3 },
    { value: 'grid', label: 'Grid view', icon: Grid3x3 },
    { value: 'list', label: 'List view', icon: LayoutList },
  ]
  return (
    <div role="radiogroup" aria-label="View" className="col-span-2 flex h-10 rounded-lg border border-white/10 bg-ink-800/80 p-1 sm:col-span-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={view === value}
          aria-label={label}
          title={label}
          onClick={() => onChange(value)}
          className={cn('relative flex flex-1 items-center justify-center rounded-md px-2.5 transition-colors sm:flex-none', view === value ? 'text-ink-900' : 'text-zinc-400 hover:text-white')}
        >
          {view === value && <motion.span layoutId="view-toggle" className="absolute inset-0 rounded-md bg-neon-cyan" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
          <Icon className="relative size-4" />
        </button>
      ))}
    </div>
  )
}

/** Cases on wooden shelves; the number per shelf follows the available width. */
function ShelfView({ items, dense, definitions }: { items: Item[]; dense: boolean; definitions: Definitions }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const minCard = dense ? 120 : width < 640 ? 140 : 180
  const gap = dense ? 12 : 18
  const perShelf = Math.max(2, Math.min(dense ? 9 : 6, Math.floor((width + gap) / (minCard + gap)) || 2))
  const shelves = useMemo(() => {
    const rows: Item[][] = []
    for (let i = 0; i < items.length; i += perShelf) rows.push(items.slice(i, i + perShelf))
    return rows
  }, [items, perShelf])

  return (
    <div ref={ref} className="space-y-8">
      {width > 0 &&
        shelves.map((row, r) => (
          <div key={r}>
            <div className="grid items-end px-3" style={{ gridTemplateColumns: `repeat(${perShelf}, minmax(0, 1fr))`, gap }}>
              {row.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(r * 0.05 + i * 0.04, 0.6), duration: 0.35 }}
                >
                  <CaseCard item={toCard(item, definitions)} to={`/items/${item.id}`} compact={dense || width < 640} showInfo={!dense} />
                </motion.div>
              ))}
            </div>
            {!dense && <ShelfPlank />}
          </div>
        ))}
    </div>
  )
}

function ListView({ items }: { items: Item[] }) {
  return (
    <Panel className="divide-y divide-white/5">
      {items.map((item, i) => (
        <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
          <Link to={`/items/${item.id}`} className="group flex items-center gap-4 px-4 py-3 transition hover:bg-white/[0.03]">
            <div className={cn('relative w-11 shrink-0 overflow-hidden rounded', caseAspect(item.format?.name))}>
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <CaseArt title="" format={item.format?.name} compact />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-zinc-100 group-hover:text-neon-cyan">{item.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <PlatformBadge name={item.format?.name} />
                {item.condition?.name && <Tag>{item.condition.name}</Tag>}
                <span className="hidden font-mono text-xs text-zinc-500 sm:inline">
                  {[item.storeFound, formatDate(item.dateAcquired)].filter(Boolean).join(' · ')}
                </span>
              </div>
            </div>
            <span className="font-mono text-neon-amber">{formatMoney(item.purchasePrice)}</span>
          </Link>
        </motion.div>
      ))}
    </Panel>
  )
}

function ShelfSkeleton() {
  return (
    <div className="space-y-8" aria-label="Loading collection">
      {[0, 1].map((r) => (
        <div key={r}>
          <div className="grid grid-cols-2 gap-4 px-3 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={cn('space-y-2', i >= 2 && 'hidden sm:block', i === 4 && 'sm:hidden lg:block')}>
                <Skeleton className="aspect-[5/7] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
          <ShelfPlank />
        </div>
      ))}
    </div>
  )
}

/** "Est. value" tile: runs the eBay estimate on demand with a progress bar. */
function ValueStat({ items, invested }: { items: Item[]; invested: number }) {
  const estimate = useCollectionValue()
  const [progress, setProgress] = useState(0)

  const run = () => {
    setProgress(0)
    // The API prices items one by one (~0.4s each); animate an approximate bar meanwhile.
    const timer = window.setInterval(() => setProgress((p) => Math.min(p + 1, items.length - 1)), 400)
    estimate.mutate(
      items.map((i) => ({ title: i.title, format: i.format?.name ?? '' })),
      {
        onSettled: () => window.clearInterval(timer),
        onError: () => toast.error('Price lookup is unavailable right now.'),
      },
    )
  }

  if (estimate.data) {
    const diff = estimate.data.totalAverage - invested
    return (
      <Stat
        label="Est. market value"
        color="#00ff88"
        value={formatMoney(estimate.data.totalAverage)}
        hint={
          <>
            <span className={diff >= 0 ? 'text-neon-green' : 'text-neon-red'}>
              {diff >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(diff))}
            </span>{' '}
            vs. paid · {estimate.data.itemsFound}/{items.length} priced
          </>
        }
      />
    )
  }

  return (
    <div className="glass flex min-w-0 flex-col justify-center gap-2 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="truncate font-mono text-[0.6rem] uppercase tracking-[0.2em] text-zinc-500 sm:text-[0.7rem]">Est. value</p>
      {estimate.isPending ? (
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-neon-green shadow-[0_0_10px_rgba(0,255,136,0.6)] transition-[width] duration-300" style={{ width: `${items.length ? (progress / items.length) * 100 : 0}%` }} />
          </div>
          <p className="font-mono text-xs text-zinc-400">
            Checking {progress}/{items.length}…
          </p>
        </div>
      ) : (
        <Button variant="subtle" size="sm" className="self-start px-2 sm:px-3" icon={<BadgeDollarSign className="size-4" />} disabled={!items.length} onClick={run}>
          <span className="sm:hidden">Check</span>
          <span className="hidden sm:inline">Check value</span>
        </Button>
      )}
    </div>
  )
}
