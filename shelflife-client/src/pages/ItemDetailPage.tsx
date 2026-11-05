import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, BadgeDollarSign, CalendarDays, ExternalLink, PackageSearch, Pencil, Store, Tag as TagIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { keys, useDeleteItem, useItem, usePriceCheck } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { platformColor, withAlpha } from '@/lib/platforms'
import type { Item, ItemInput } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, Panel, PlatformBadge, Skeleton, Tag } from '@/components/ui/Misc'
import { CaseCard } from '@/components/collection/CaseCard'

const toInput = (item: Item): ItemInput => ({
  title: item.title,
  formatId: item.formatId,
  conditionId: item.conditionId,
  purchasePrice: item.purchasePrice,
  dateAcquired: item.dateAcquired,
  storeFound: item.storeFound ?? '',
  notes: item.notes ?? '',
  imageUrl: item.imageUrl ?? '',
  genreIds: item.itemGenres?.map((g) => g.genreId) ?? [],
})

export default function ItemDetailPage() {
  const id = Number(useParams().id)
  const { data: item, isLoading, error } = useItem(id)
  const deleteItem = useDeleteItem()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  if (isLoading) return <DetailSkeleton />
  if (!item || error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Panel>
          <EmptyState
            icon={<PackageSearch className="size-8" />}
            title={error instanceof ApiError && error.status === 404 ? 'Not on your shelf' : 'Couldn’t load this title'}
            description="It may have been removed, or the link is wrong."
            action={<ButtonLink to="/collection">Back to collection</ButtonLink>}
          />
        </Panel>
      </div>
    )

  const color = platformColor(item.format?.name)
  const genres = item.itemGenres?.map((g) => g.genre?.name).filter((g): g is string => !!g) ?? []

  // Delete right away, offer Undo by re-creating the same title.
  const onDelete = () => {
    const snapshot = toInput(item)
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        navigate('/collection')
        toast(`Removed “${item.title}”`, {
          duration: 8000,
          action: {
            label: 'Undo',
            onClick: async () => {
              const restored = await api.post<Item>('/items', snapshot)
              await queryClient.invalidateQueries({ queryKey: keys.items })
              toast.success('Restored to your shelf', {
                action: { label: 'View', onClick: () => navigate(`/items/${restored.id}`) },
              })
            },
          },
        })
      },
      onError: () => toast.error('Couldn’t remove that title. Try again.'),
    })
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]" style={{ background: `radial-gradient(ellipse at 25% 0%, ${withAlpha(color, 0.18)}, transparent 60%)` }} />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link to="/collection" className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
          <ArrowLeft className="size-4" /> Collection
        </Link>

        <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr] lg:gap-12">
          <motion.div initial={{ opacity: 0, rotateY: -20 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ duration: 0.6 }} style={{ perspective: 1000 }} className="mx-auto w-full max-w-xs md:max-w-none">
            <CaseCard item={{ title: item.title, format: item.format?.name, imageUrl: item.imageUrl }} showInfo={false} />
          </motion.div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PlatformBadge name={item.format?.name} className="text-base" />
                {item.condition?.name && <Tag className="text-xs">{item.condition.name}</Tag>}
              </div>
              <h1 className="font-display text-5xl leading-none tracking-[0.05em] text-white sm:text-6xl">{item.title}</h1>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact icon={<BadgeDollarSign />} label="Paid" value={<span className="text-neon-amber text-glow-amber">{formatMoney(item.purchasePrice)}</span>} />
              <Fact icon={<CalendarDays />} label="Acquired" value={formatDate(item.dateAcquired)} />
              <Fact icon={<Store />} label="Found at" value={item.storeFound || '—'} className="col-span-2 sm:col-span-1" />
            </div>

            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <TagIcon className="size-4 text-zinc-500" aria-label="Genres" />
                {genres.map((g) => (
                  <Tag key={g}>{g}</Tag>
                ))}
              </div>
            )}

            {item.notes && (
              <Panel className="p-4">
                <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Notes</p>
                <p className="whitespace-pre-line text-zinc-200">{item.notes}</p>
              </Panel>
            )}

            <div className="flex flex-wrap gap-2">
              <ButtonLink to={`/items/${item.id}/edit`} icon={<Pencil className="size-4" />}>
                Edit
              </ButtonLink>
              <Button variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete} loading={deleteItem.isPending}>
                Remove
              </Button>
            </div>

            <ValuePanel item={item} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Fact({ icon, label, value, className }: { icon: ReactNode; label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-xl px-4 py-3 ${className ?? ''}`}>
      <p className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-zinc-500 [&>svg]:size-3.5">
        {icon} {label}
      </p>
      <p className="mt-1 truncate font-mono text-lg text-zinc-100">{value}</p>
    </div>
  )
}

function ValuePanel({ item }: { item: Item }) {
  const check = usePriceCheck()
  const format = item.format?.name ?? ''
  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${item.title} ${format}`)}`
  const result = check.data

  return (
    <Panel accent="#f5a623" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-[0.1em] text-white">What’s it worth?</h2>
          <p className="text-sm text-zinc-400">Live asking prices from eBay listings.</p>
        </div>
        <Button variant="amber" icon={<BadgeDollarSign className="size-4" />} loading={check.isPending} onClick={() => check.mutate({ title: item.title, format })}>
          {result ? 'Check again' : 'Check price'}
        </Button>
      </div>

      {check.isError && <p className="mt-4 text-sm text-neon-red">Price lookup is unavailable right now. Try again in a bit.</p>}

      {result && 'message' in result && <p className="mt-4 text-zinc-400">No current listings found for this title.</p>}

      {result && 'average' in result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Low', result.low, 'text-zinc-300'],
              ['Average', result.average, 'text-neon-green text-glow-green text-2xl'],
              ['High', result.high, 'text-zinc-300'],
            ].map(([label, value, cls]) => (
              <div key={label as string}>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                <p className={`font-mono text-lg ${cls}`}>{formatMoney(value as number)}</p>
              </div>
            ))}
          </div>
          <RangeBar low={result.low} high={result.high} average={result.average} paid={item.purchasePrice} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <GainLoss paid={item.purchasePrice} worth={result.average} />
            <a href={ebayUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-zinc-400 hover:text-neon-cyan">
              {result.count} listings <ExternalLink className="size-3.5" />
            </a>
          </div>
        </motion.div>
      )}
    </Panel>
  )
}

/** Low→high price range with markers for the average and what you paid. */
function RangeBar({ low, high, average, paid }: { low: number; high: number; average: number; paid: number }) {
  const min = Math.min(low, paid)
  const max = Math.max(high, paid)
  const pos = (v: number) => (max === min ? 50 : ((v - min) / (max - min)) * 100)
  // "You paid" labels above the bar and "avg" below, so close values never collide.
  return (
    <div className="relative py-5">
      <div className="relative h-2 rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-neon-amber/40 via-neon-green/60 to-neon-amber/40"
          style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
        />
        <Marker at={pos(paid)} color="#00bfff" label="you paid" above />
        <Marker at={pos(average)} color="#00ff88" label="avg" />
      </div>
    </div>
  )
}

function Marker({ at, color, label, above }: { at: number; color: string; label: string; above?: boolean }) {
  return (
    <motion.div
      className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      initial={{ left: '0%' }}
      animate={{ left: `${at}%` }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className={`absolute whitespace-nowrap font-mono text-[0.65rem] uppercase ${above ? 'bottom-full mb-0.5' : 'top-full mt-0.5'}`} style={{ color }}>
        {label}
      </p>
      <div className="h-5 w-1 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
    </motion.div>
  )
}

function GainLoss({ paid, worth }: { paid: number; worth: number }) {
  const diff = worth - paid
  const pct = paid > 0 ? Math.round((diff / paid) * 100) : null
  if (Math.abs(diff) < 1 || pct === 0) return <p className="font-mono text-zinc-400">About even with what you paid</p>
  return (
    <p className="font-mono">
      <span className={diff >= 0 ? 'text-neon-green' : 'text-neon-red'}>
        {diff >= 0 ? '▲' : '▼'} {formatMoney(Math.abs(diff))}
        {pct !== null && ` (${diff >= 0 ? '+' : '−'}${Math.abs(pct)}%)`}
      </span>{' '}
      <span className="text-zinc-500">vs. what you paid</span>
    </p>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[20rem_1fr]">
      <Skeleton className="aspect-[5/7] w-full" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-14 w-3/4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </div>
  )
}
