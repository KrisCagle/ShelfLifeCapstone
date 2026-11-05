import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, Check, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useConditions, useDeleteWishlistItem, useFormats, useGenres, useItem, useSaveItem } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { todayIso } from '@/lib/format'
import { genreFitsMedia, platformColor, platformMedia } from '@/lib/platforms'
import type { Item } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Panel, Skeleton } from '@/components/ui/Misc'
import { CaseCard, ShelfPlank } from '@/components/collection/CaseCard'

interface FormState {
  title: string
  formatId: string
  conditionId: number | null
  purchasePrice: string
  dateAcquired: string
  storeFound: string
  notes: string
  imageUrl: string
  genreIds: number[]
}

type Errors = Partial<Record<keyof FormState | 'form', string>>

const CONDITION_COLORS: Record<string, string> = { Sealed: '#00ff88', Good: '#00bfff', Fair: '#f5a623', Poor: '#ff4444' }

const fromItem = (item: Item): FormState => ({
  title: item.title,
  formatId: String(item.formatId),
  conditionId: item.conditionId,
  purchasePrice: String(item.purchasePrice ?? ''),
  dateAcquired: item.dateAcquired?.slice(0, 10) ?? todayIso(),
  storeFound: item.storeFound ?? '',
  notes: item.notes ?? '',
  imageUrl: item.imageUrl ?? '',
  genreIds: item.itemGenres?.map((g) => g.genreId) ?? [],
})

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.title.trim()) errors.title = 'Give it a title.'
  if (!form.formatId) errors.formatId = 'Pick a format.'
  if (form.conditionId == null) errors.conditionId = 'Pick a condition.'
  const price = Number(form.purchasePrice || 0)
  if (Number.isNaN(price) || price < 0) errors.purchasePrice = 'Enter a price of 0 or more.'
  if (!form.dateAcquired) errors.dateAcquired = 'When did you get it?'
  else if (form.dateAcquired > todayIso()) errors.dateAcquired = 'That date is in the future.'
  if (form.imageUrl && !/^https?:\/\/\S+$/i.test(form.imageUrl)) errors.imageUrl = 'Use a full link starting with http(s)://'
  return errors
}

export default function ItemFormPage() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const { data: existing, isLoading } = useItem(id ?? NaN)
  if (id && isLoading) return <FormSkeleton />
  if (id && !existing)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-400">
        That title isn’t on your shelf. <Link to="/collection" className="text-neon-cyan hover:underline">Back to collection</Link>
      </div>
    )
  return <ItemForm key={id ?? 'new'} existing={existing} />
}

function ItemForm({ existing }: { existing?: Item }) {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const fromWishlist = Number(search.get('fromWishlist')) || undefined
  const { data: formats } = useFormats()
  const { data: conditions } = useConditions()
  const { data: genres } = useGenres()
  const save = useSaveItem(existing?.id)
  const removeFromWishlist = useDeleteWishlistItem()

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? fromItem(existing)
      : {
          title: search.get('title') ?? '',
          formatId: search.get('formatId') ?? '',
          conditionId: null,
          purchasePrice: '',
          dateAcquired: todayIso(),
          storeFound: '',
          notes: '',
          imageUrl: '',
          genreIds: [],
        },
  )
  const [errors, setErrors] = useState<Errors>({})
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (submitted) setErrors((e) => ({ ...e, [key]: undefined, form: undefined }))
  }

  useEffect(() => {
    if (submitted) setErrors(validate(form))
  }, [form, submitted])

  const formatName = formats?.find((f) => String(f.id) === form.formatId)?.name
  const conditionName = conditions?.find((c) => c.id === form.conditionId)?.name
  const media = formatName ? platformMedia(formatName) : undefined
  const visibleGenres = useMemo(() => {
    if (!genres) return []
    if (showAllGenres || !media) return genres
    return genres.filter((g) => genreFitsMedia(g.name, media) || form.genreIds.includes(g.id))
  }, [genres, media, showAllGenres, form.genreIds])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Wait for React to mark the fields invalid, then bring the first one into view.
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(first?.matches('input, select, textarea') ? first : first?.querySelector<HTMLElement>('input'))?.focus({ preventScroll: true })
      })
      return
    }

    try {
      const created = await save.mutateAsync({
        title: form.title.trim(),
        formatId: Number(form.formatId),
        conditionId: form.conditionId!,
        purchasePrice: Number(form.purchasePrice || 0),
        dateAcquired: form.dateAcquired,
        storeFound: form.storeFound.trim(),
        notes: form.notes.trim(),
        imageUrl: form.imageUrl.trim(),
        genreIds: form.genreIds,
      })
      const itemId = existing?.id ?? (created as Item).id
      if (fromWishlist) {
        removeFromWishlist.mutate(fromWishlist)
        toast.success(`Found it! “${form.title.trim()}” moved from your wishlist to your shelf.`)
      } else toast.success(existing ? 'Changes saved' : `“${form.title.trim()}” added to your shelf`)
      navigate(`/items/${itemId}`)
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Couldn’t save. Check your connection and try again.' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to={existing ? `/items/${existing.id}` : '/collection'} className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
        <ArrowLeft className="size-4" /> {existing ? 'Back to title' : 'Collection'}
      </Link>
      <h1 className="mb-8 font-display text-5xl tracking-[0.06em] text-white">{existing ? 'Edit title' : fromWishlist ? 'Found it!' : 'Add a title'}</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {errors.form && (
            <div role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-4 py-3 text-neon-red">
              {errors.form}
            </div>
          )}

          <Section title="The basics">
            <Field label="Title" error={errors.title}>
              {({ id, invalid, describedBy }) => (
                <Input id={id} invalid={invalid} aria-describedby={describedBy} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Chrono Trigger" autoFocus={!existing && !form.title} maxLength={200} />
              )}
            </Field>
            <Field label="Format" error={errors.formatId}>
              {({ id, invalid, describedBy }) => (
                <Select id={id} invalid={invalid} aria-describedby={describedBy} value={form.formatId} onChange={(e) => set('formatId', e.target.value)}>
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
            <Field label="Condition" error={errors.conditionId}>
              {({ invalid }) => (
                <Segmented
                  name="condition"
                  invalid={invalid}
                  value={form.conditionId}
                  onChange={(v) => set('conditionId', v)}
                  options={(conditions ?? []).map((c) => ({ value: c.id, label: c.name, color: CONDITION_COLORS[c.name] }))}
                />
              )}
            </Field>
          </Section>

          <Section title="The deal">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price paid" error={errors.purchasePrice}>
                {({ id, invalid, describedBy }) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-500">$</span>
                    <Input id={id} invalid={invalid} aria-describedby={describedBy} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="pl-7 font-mono" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                  </div>
                )}
              </Field>
              <Field label="Date acquired" error={errors.dateAcquired}>
                {({ id, invalid, describedBy }) => (
                  <Input id={id} invalid={invalid} aria-describedby={describedBy} type="date" max={todayIso()} className="font-mono" value={form.dateAcquired} onChange={(e) => set('dateAcquired', e.target.value)} />
                )}
              </Field>
            </div>
            <Field label="Where you found it" optional>
              {({ id }) => <Input id={id} value={form.storeFound} onChange={(e) => set('storeFound', e.target.value)} placeholder="Goodwill, flea market, eBay…" />}
            </Field>
          </Section>

          <Section title="Details">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-400">Genres</span>
                {media && (
                  <button type="button" onClick={() => setShowAllGenres((v) => !v)} className="font-mono text-xs text-neon-cyan hover:underline">
                    {showAllGenres ? `Only ${media.toLowerCase()} genres` : 'Show all genres'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Genres">
                {visibleGenres.map((g) => {
                  const on = form.genreIds.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('genreIds', on ? form.genreIds.filter((x) => x !== g.id) : [...form.genreIds, g.id])}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wider transition',
                        on ? 'border-neon-cyan bg-neon-cyan/15 text-neon-cyan shadow-glow-cyan' : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200',
                      )}
                    >
                      {on && <Check className="size-3" />}
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <Field label="Cover image link" optional error={errors.imageUrl} hint="Paste an image address. A cover is generated if you leave this blank.">
              {({ id, invalid, describedBy }) => (
                <Input id={id} invalid={invalid} aria-describedby={describedBy} type="url" placeholder="https://…" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} />
              )}
            </Field>
            <Field label="Notes" optional>
              {({ id }) => <Textarea id={id} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Complete in box? Variant? Anything worth remembering." maxLength={2000} />}
            </Field>
          </Section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" loading={save.isPending} icon={<Save className="size-5" />}>
              {existing ? 'Save changes' : 'Add to shelf'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>

        <aside className="hidden lg:block" aria-label="Preview">
          <div className="sticky top-24">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Live preview</p>
            <motion.div layout className="px-4">
              <CaseCard
                item={{
                  title: form.title || 'Your title',
                  format: formatName,
                  condition: conditionName,
                  price: Number(form.purchasePrice || 0),
                  imageUrl: /^https?:\/\//i.test(form.imageUrl) ? form.imageUrl : null,
                  genres: genres?.filter((g) => form.genreIds.includes(g.id)).map((g) => g.name),
                }}
              />
            </motion.div>
            <ShelfPlank />
            {formatName && (
              <p className="mt-4 text-center font-mono text-xs" style={{ color: platformColor(formatName) }}>
                Shelved under {formatName}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="space-y-5 p-5 sm:p-6">
      <h2 className="font-display text-2xl tracking-[0.1em] text-neon-cyan">{title}</h2>
      {children}
    </Panel>
  )
}

function FormSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-16 sm:px-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 w-full max-w-3xl rounded-2xl" />
      <Skeleton className="h-48 w-full max-w-3xl rounded-2xl" />
    </div>
  )
}
