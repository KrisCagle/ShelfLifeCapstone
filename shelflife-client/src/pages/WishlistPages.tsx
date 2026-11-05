import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, BadgeDollarSign, Heart, PackageCheck, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { keys, useDeleteWishlistItem, useFormats, usePriceCheck, useSaveWishlistItem, useWishlist, useWishlistItem } from '@/hooks/queries'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { withAlpha } from '@/lib/platforms'
import type { Priority, WishlistItem } from '@/lib/types'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { EmptyState, PageHeader, Panel, PlatformBadge, Skeleton } from '@/components/ui/Misc'
import { PRIORITIES, PriorityPill } from '@/components/collection/PriorityPill'

type Filter = 'all' | Priority

export function WishlistPage() {
  const { data: items, isLoading } = useWishlist()
  const [filter, setFilter] = useState<Filter>('all')
  const sorted = [...(items ?? [])].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
  const visible = filter === 'all' ? sorted : sorted.filter((i) => i.priority === filter)

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="The hunt list"
        title="Wishlist"
        description="The grails you’re still hunting. Check prices before you buy, and mark them found when you score."
        actions={
          <ButtonLink to="/wishlist/new" icon={<Plus className="size-4" />}>
            Add a hunt
          </ButtonLink>
        }
      />

      {items && items.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by priority">
          {(['all', 3, 2, 1] as Filter[]).map((f) => {
            const active = filter === f
            const color = f === 'all' ? '#00bfff' : PRIORITIES[f].color
            const count = f === 'all' ? items.length : items.filter((i) => i.priority === f).length
            return (
              <button
                key={f}
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(f)}
                className={cn('rounded-full border px-3.5 py-1 font-mono text-sm uppercase tracking-wider transition', !active && 'border-white/10 text-zinc-400 hover:text-white')}
                style={active ? { color, borderColor: color, backgroundColor: withAlpha(color, 0.12), boxShadow: `0 0 16px ${withAlpha(color, 0.3)}` } : undefined}
              >
                {f === 'all' ? 'All' : PRIORITIES[f].label} <span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : !items?.length ? (
          <Panel>
            <EmptyState
              icon={<Heart className="size-8" />}
              title="No hunts yet"
              description="Add the titles you’re looking for. You’ll have them handy the next time you’re digging through a bin."
              action={
                <ButtonLink to="/wishlist/new" size="lg" icon={<Plus className="size-5" />}>
                  Add your first hunt
                </ButtonLink>
              }
            />
          </Panel>
        ) : (
          <motion.div layout className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {visible.map((item) => (
                <WishCard key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function WishCard({ item }: { item: WishlistItem }) {
  const { color } = PRIORITIES[item.priority] ?? PRIORITIES[1]
  const remove = useDeleteWishlistItem()
  const price = usePriceCheck()
  const queryClient = useQueryClient()
  const found = `/items/new?${new URLSearchParams({ title: item.title, formatId: String(item.formatId), fromWishlist: String(item.id) })}`

  const onRemove = () =>
    remove.mutate(item.id, {
      onSuccess: () =>
        toast(`Removed “${item.title}” from your wishlist`, {
          duration: 8000,
          action: {
            label: 'Undo',
            onClick: async () => {
              await api.post('/wishlist', { title: item.title, formatId: item.formatId, notes: item.notes ?? '', priority: item.priority })
              queryClient.invalidateQueries({ queryKey: keys.wishlist })
            },
          },
        }),
    })

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
      <Panel className="group flex h-full flex-col p-5 transition hover:border-white/15" style={{ boxShadow: `inset 3px 0 0 ${color}, 0 20px 50px -20px rgba(0,0,0,0.9)` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-2xl leading-tight tracking-[0.06em] text-white">{item.title}</h3>
            <div className="mt-1.5 flex items-center gap-2">
              <PlatformBadge name={item.format?.name} />
              <PriorityPill priority={item.priority} />
            </div>
          </div>
          <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
            <Link to={`/wishlist/${item.id}/edit`} className="rounded-md p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white" aria-label={`Edit ${item.title}`}>
              <Pencil className="size-4" />
            </Link>
            <button onClick={onRemove} className="rounded-md p-1.5 text-zinc-400 hover:bg-neon-red/10 hover:text-neon-red" aria-label={`Remove ${item.title}`}>
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        {item.notes && <p className="mt-3 text-sm text-zinc-400">{item.notes}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <ButtonLink to={found} size="sm" variant="primary" icon={<PackageCheck className="size-4" />}>
            Found it
          </ButtonLink>
          {price.data && 'average' in price.data ? (
            <span className="font-mono text-sm text-zinc-400">
              ~<span className="text-neon-green">{formatMoney(price.data.average)}</span> ({formatMoney(price.data.low)}–{formatMoney(price.data.high)})
            </span>
          ) : price.data ? (
            <span className="font-mono text-sm text-zinc-500">No listings right now</span>
          ) : (
            <Button
              size="sm"
              variant="subtle"
              loading={price.isPending}
              icon={<BadgeDollarSign className="size-4" />}
              onClick={() => price.mutate({ title: item.title, format: item.format?.name ?? '' }, { onError: () => toast.error('Price lookup is unavailable right now.') })}
            >
              Check price
            </Button>
          )}
        </div>
      </Panel>
    </motion.div>
  )
}

export function WishlistFormPage() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const { data: existing, isLoading } = useWishlistItem(id ?? NaN)
  if (id && isLoading)
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  return <WishlistForm key={id ?? 'new'} existing={existing} />
}

function WishlistForm({ existing }: { existing?: WishlistItem }) {
  const navigate = useNavigate()
  const { data: formats } = useFormats()
  const save = useSaveWishlistItem(existing?.id)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [formatId, setFormatId] = useState(existing ? String(existing.formatId) : '')
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 2)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [errors, setErrors] = useState<{ title?: string; formatId?: string; form?: string }>({})

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found: typeof errors = {}
    if (!title.trim()) found.title = 'What are you hunting for?'
    if (!formatId) found.formatId = 'Pick a format.'
    setErrors(found)
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    try {
      await save.mutateAsync({ title: title.trim(), formatId: Number(formatId), priority, notes: notes.trim() })
      toast.success(existing ? 'Hunt updated' : `“${title.trim()}” added to your wishlist`)
      navigate('/wishlist')
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Couldn’t save. Try again.' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to="/wishlist" className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
        <ArrowLeft className="size-4" /> Wishlist
      </Link>
      <h1 className="mb-8 font-display text-5xl tracking-[0.06em] text-white">{existing ? 'Edit hunt' : 'Add a hunt'}</h1>
      <Panel className="p-5 sm:p-6">
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {errors.form && (
            <div role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-4 py-3 text-neon-red">
              {errors.form}
            </div>
          )}
          <Field label="Title" error={errors.title}>
            {({ id, invalid, describedBy }) => (
              <Input id={id} invalid={invalid} aria-describedby={describedBy} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. EarthBound" autoFocus={!existing} />
            )}
          </Field>
          <Field label="Format" error={errors.formatId}>
            {({ id, invalid, describedBy }) => (
              <Select id={id} invalid={invalid} aria-describedby={describedBy} value={formatId} onChange={(e) => setFormatId(e.target.value)}>
                <option value="" disabled>
                  Choose a format…
                </option>
                {formats?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Priority">
            {() => (
              <Segmented
                name="priority"
                value={priority}
                onChange={setPriority}
                options={([3, 2, 1] as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].label, color: PRIORITIES[p].color }))}
              />
            )}
          </Field>
          <Field label="Notes" optional>
            {({ id }) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Max price, variant, complete in box…" />}
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="submit" size="lg" loading={save.isPending} icon={<Save className="size-5" />}>
              {existing ? 'Save changes' : 'Add to wishlist'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
