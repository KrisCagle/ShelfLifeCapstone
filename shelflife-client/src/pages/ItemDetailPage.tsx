import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, BadgeDollarSign, Barcode, CalendarDays, Camera, PackageSearch, Pencil, Store, Tag as TagIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { keys, useDeleteItem, useItem } from '@/hooks/queries'
import { useAttributesFor } from '@/components/catalog/AttributeFields'
import { gcdIssueUrl, SOURCE_LABELS } from '@/components/catalog/CandidateCard'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatMoney } from '@/lib/format'
import { collectionPath, platformColor, separateCollection, withAlpha } from '@/lib/platforms'
import type { Item, ItemSave } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState, Panel, PlatformBadge, Skeleton, Tag } from '@/components/ui/Misc'
import { CaseCard } from '@/components/collection/CaseCard'
import { MarketPanel } from '@/components/market/Market'

// Everything needed to put the same copy back, pointing at the same catalog entry.
const toSave = (item: Item): ItemSave => ({
  catalog: { id: item.catalogEntry.id, source: item.catalogEntry.source, title: item.title, formatId: item.formatId },
  conditionId: item.conditionId,
  purchasePrice: item.purchasePrice,
  dateAcquired: item.dateAcquired.slice(0, 10),
  storeFound: item.storeFound ?? '',
  notes: item.notes ?? '',
  photoUrl: item.photoUrl,
  barcode: item.barcode,
  genreIds: item.itemGenres?.map((g) => g.genreId) ?? [],
  attributes: item.attributes ?? {},
})

export default function ItemDetailPage() {
  const id = Number(useParams().id)
  const { data: item, isLoading, error } = useItem(id)
  const deleteItem = useDeleteItem()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const attributeDefs = useAttributesFor(item?.format)

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
    const snapshot = toSave(item)
    deleteItem.mutate(item.id, {
      onSuccess: () => {
        navigate(collectionPath(item.format?.mediaType))
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
        <Link to={collectionPath(item.format?.mediaType)} className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
          <ArrowLeft className="size-4" /> {separateCollection(item.format?.mediaType)?.media ?? 'Collection'}
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
              {(item.catalogEntry.creator || item.catalogEntry.releaseYear) && (
                <p className="mt-2 text-lg text-zinc-300">{[item.catalogEntry.creator, item.catalogEntry.releaseYear].filter(Boolean).join(' · ')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact icon={<BadgeDollarSign />} label="Paid" value={<span className="text-neon-amber text-glow-amber">{formatMoney(item.purchasePrice)}</span>} />
              <Fact icon={<CalendarDays />} label="Acquired" value={formatDate(item.dateAcquired)} />
              <Fact icon={<Store />} label="Found at" value={item.storeFound || '—'} className="col-span-2 sm:col-span-1" />
            </div>

            {item.catalogEntry.description && <Description text={item.catalogEntry.description} />}

            {attributeDefs.some((d) => item.attributes?.[d.key]) && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:grid-cols-3">
                {attributeDefs
                  .filter((d) => item.attributes?.[d.key])
                  .map((d) => (
                    <div key={d.key}>
                      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">{d.label}</dt>
                      <dd className="mt-0.5 text-zinc-100">{d.kind === 'Toggle' ? 'Yes' : item.attributes[d.key]}</dd>
                    </div>
                  ))}
              </dl>
            )}

            {genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <TagIcon className="size-4 text-zinc-500" aria-label="Genres" />
                {genres.map((g) => (
                  <Tag key={g}>{g}</Tag>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-zinc-500">
              {item.barcode && (
                <span className="inline-flex items-center gap-1.5">
                  <Barcode className="size-3.5" /> {item.barcode}
                </span>
              )}
              {item.photoUrl && (
                <span className="inline-flex items-center gap-1.5">
                  <Camera className="size-3.5" /> Your photo
                </span>
              )}
              {item.catalogEntry.source === 'gcd' ? (
                <span>
                  Data courtesy of the{' '}
                  <a href={gcdIssueUrl(item.catalogEntry.externalId) ?? 'https://www.comics.org'} target="_blank" rel="noopener noreferrer" className="underline hover:text-neon-cyan">
                    Grand Comics Database™
                  </a>{' '}
                  under a{' '}
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-neon-cyan">
                    CC BY-SA license
                  </a>
                </span>
              ) : (
                item.catalogEntry.source !== 'manual' && <span>Title data via {SOURCE_LABELS[item.catalogEntry.source]}</span>
              )}
            </div>

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

            <MarketPanel item={item} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Long blurbs push the facts off a phone screen, so they start collapsed. */
function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 280
  return (
    <div>
      <p className={cn('whitespace-pre-line leading-relaxed text-zinc-300', long && !open && 'line-clamp-4')}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 font-mono text-sm text-neon-cyan hover:underline">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
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
