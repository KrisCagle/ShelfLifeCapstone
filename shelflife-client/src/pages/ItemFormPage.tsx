import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowLeft, Barcode, Check, PenLine, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useConditions, useDeleteWishlistItem, useFormats, useGenres, useItem, useSaveItem, useWishlistItem } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { todayIso } from '@/lib/format'
import { genreFitsMedia, platformColor } from '@/lib/platforms'
import type { Candidate, CatalogRef, Item, MediaType } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/Form'
import { Panel, PlatformBadge, Skeleton } from '@/components/ui/Misc'
import { CaseCard, ShelfPlank } from '@/components/collection/CaseCard'
import { CatalogFinder, type FinderPick } from '@/components/catalog/CatalogFinder'
import { CoverThumb, SOURCE_LABELS } from '@/components/catalog/CandidateCard'
import { FormatOptions } from '@/components/catalog/FormatOptions'
import { AttributeFields, useCardBadges } from '@/components/catalog/AttributeFields'

const CONDITION_COLORS: Record<string, string> = { Sealed: '#00ff88', Good: '#00bfff', Fair: '#f5a623', Poor: '#ff4444' }
const CREATOR_LABEL: Record<MediaType, string> = { Games: 'Publisher', Music: 'Artist', Movies: 'Studio' }

/** The title being saved: either fixed (from a source / shared entry) or editable (typed by hand). */
interface TitleState {
  ref: CatalogRef
  editable: boolean
  ownedCount: number
  firstOwnedItemId: number | null
}

const titleFromCandidate = (c: Candidate): TitleState => ({
  ref: {
    id: c.catalogEntryId ?? undefined,
    source: c.source === 'upc' ? 'manual' : c.source,
    externalId: c.source === 'upc' || c.source === 'manual' ? null : c.externalId,
    title: c.title,
    formatId: c.formatId ?? 0,
    releaseYear: c.releaseYear,
    creator: c.creator,
    coverUrl: c.coverUrl,
  },
  // Hand-typed and product-lookup titles are the user's own; source records aren't editable.
  editable: c.source === 'manual' || c.source === 'upc',
  ownedCount: c.ownedCount,
  firstOwnedItemId: c.firstOwnedItemId,
})

const titleFromItem = (item: Item): TitleState => {
  const e = item.catalogEntry
  return {
    ref: { id: e.id, source: e.source, externalId: e.externalId, title: e.title, formatId: e.format.id, releaseYear: e.releaseYear, creator: e.creator, coverUrl: e.coverUrl },
    editable: e.isPrivate,
    ownedCount: 0,
    firstOwnedItemId: null,
  }
}

export default function ItemFormPage() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const location = useLocation()
  const [search] = useSearchParams()
  const fromWishlist = Number(search.get('fromWishlist')) || undefined
  const { data: existing, isLoading } = useItem(id ?? NaN)
  const { data: wish, isLoading: wishLoading } = useWishlistItem(fromWishlist ?? NaN)

  if ((id && isLoading) || (fromWishlist && wishLoading)) return <FormSkeleton />
  if (id && !existing)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-400">
        That title isn’t on your shelf. <Link to="/collection" className="text-neon-cyan hover:underline">Back to collection</Link>
      </div>
    )

  // A hunt linked to a catalog entry skips straight to "your copy".
  const statePick = (location.state as { pick?: FinderPick } | null)?.pick
  const wishPick: FinderPick | undefined = wish?.catalogEntryId
    ? {
        candidate: {
          catalogEntryId: wish.catalogEntryId,
          // Shared entries come back as their source so the title stays locked.
          source: wish.catalogIsPrivate ? 'manual' : (wish.catalogSource ?? 'manual'),
          externalId: null, title: wish.title, formatId: wish.formatId,
          formatName: wish.format?.name ?? null, releaseYear: wish.releaseYear, creator: wish.creator, coverUrl: wish.coverUrl,
          barcode: null, ownedCount: 0, firstOwnedItemId: null, wishlistId: wish.id,
        },
      }
    : undefined

  return (
    <ItemFlow
      key={id ?? 'new'}
      existing={existing}
      initialPick={statePick ?? wishPick}
      initialQuery={wish?.title ?? search.get('title') ?? ''}
      initialFormatId={wish?.formatId ?? (Number(search.get('formatId')) || null)}
      fromWishlist={fromWishlist}
    />
  )
}

function ItemFlow({ existing, initialPick, initialQuery, initialFormatId, fromWishlist }: {
  existing?: Item
  initialPick?: FinderPick
  initialQuery: string
  initialFormatId: number | null
  fromWishlist?: number
}) {
  const [title, setTitle] = useState<TitleState | null>(() =>
    existing ? titleFromItem(existing) : initialPick ? titleFromCandidate(initialPick.candidate) : null,
  )
  const [barcode, setBarcode] = useState(existing?.barcode ?? initialPick?.barcode ?? '')
  const [finding, setFinding] = useState(!existing && !initialPick)

  const heading = existing ? 'Edit title' : fromWishlist ? 'Found it!' : 'Add a title'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to={existing ? `/items/${existing.id}` : '/collection'} className="mb-6 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
        <ArrowLeft className="size-4" /> {existing ? 'Back to title' : 'Collection'}
      </Link>
      <h1 className="mb-2 font-display text-5xl tracking-[0.06em] text-white">{heading}</h1>
      <Steps finding={finding} />

      <AnimatePresence mode="wait">
        {finding ? (
          <motion.div key="find" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
            <Panel className="mt-6 max-w-3xl p-5 sm:p-6">
              <CatalogFinder
                initialQuery={title?.ref.title ?? initialQuery}
                initialFormatId={title?.ref.formatId || initialFormatId}
                onPick={(pick) => {
                  setTitle(titleFromCandidate(pick.candidate))
                  if (pick.barcode) setBarcode(pick.barcode)
                  setFinding(false)
                }}
              />
            </Panel>
          </motion.div>
        ) : (
          title && (
            <motion.div key="details" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
              <DetailsForm
                existing={existing}
                title={title}
                onTitleChange={setTitle}
                barcode={barcode}
                onBarcodeChange={setBarcode}
                onChangeTitle={() => setFinding(true)}
                fromWishlist={fromWishlist}
              />
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}

function Steps({ finding }: { finding: boolean }) {
  return (
    <ol className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em]">
      {['Find it', 'Your copy'].map((label, i) => {
        const active = finding ? i === 0 : i === 1
        const done = !finding && i === 0
        return (
          <li key={label} className={cn('flex items-center gap-2', active ? 'text-neon-cyan' : done ? 'text-neon-green' : 'text-zinc-600')}>
            <span className={cn('grid size-5 place-items-center rounded-full border', active ? 'border-neon-cyan' : done ? 'border-neon-green bg-neon-green/15' : 'border-zinc-700')}>
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {label}
            {i === 0 && <span className="h-px w-6 bg-zinc-700" />}
          </li>
        )
      })}
    </ol>
  )
}

interface CopyState {
  conditionId: number | null
  purchasePrice: string
  dateAcquired: string
  storeFound: string
  notes: string
  photoUrl: string
  genreIds: number[]
  attributes: Record<string, string>
}

type Errors = Partial<Record<'title' | 'formatId' | 'coverUrl' | 'conditionId' | 'purchasePrice' | 'dateAcquired' | 'photoUrl' | 'barcode' | 'form', string>>

const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v)

function DetailsForm({ existing, title, onTitleChange, barcode, onBarcodeChange, onChangeTitle, fromWishlist }: {
  existing?: Item
  title: TitleState
  onTitleChange: (t: TitleState) => void
  barcode: string
  onBarcodeChange: (b: string) => void
  onChangeTitle: () => void
  fromWishlist?: number
}) {
  const navigate = useNavigate()
  const { data: formats } = useFormats()
  const { data: conditions } = useConditions()
  const { data: genres } = useGenres()
  const save = useSaveItem(existing?.id)
  const removeFromWishlist = useDeleteWishlistItem()
  const [copy, setCopy] = useState<CopyState>(() => ({
    conditionId: existing?.conditionId ?? null,
    purchasePrice: existing ? String(existing.purchasePrice) : '',
    dateAcquired: existing?.dateAcquired.slice(0, 10) ?? todayIso(),
    storeFound: existing?.storeFound ?? '',
    notes: existing?.notes ?? '',
    photoUrl: existing?.photoUrl ?? '',
    genreIds: existing?.itemGenres?.map((g) => g.genreId) ?? [],
    attributes: existing?.attributes ?? {},
  }))
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showAllGenres, setShowAllGenres] = useState(false)

  const ref = title.ref
  const format = formats?.find((f) => f.id === ref.formatId)
  const media = format?.mediaType
  const condition = conditions?.find((c) => c.id === copy.conditionId)

  const validate = (): Errors => {
    const found: Errors = {}
    if (!ref.title.trim()) found.title = 'Give it a title.'
    if (!ref.formatId) found.formatId = 'Pick a format.'
    if (title.editable && ref.coverUrl && !isUrl(ref.coverUrl)) found.coverUrl = 'Use a full link starting with http(s)://'
    if (copy.conditionId == null) found.conditionId = 'Pick a condition.'
    const price = Number(copy.purchasePrice || 0)
    if (Number.isNaN(price) || price < 0) found.purchasePrice = 'Enter a price of 0 or more.'
    if (!copy.dateAcquired) found.dateAcquired = 'When did you get it?'
    else if (copy.dateAcquired > todayIso()) found.dateAcquired = 'That date is in the future.'
    if (copy.photoUrl && !isUrl(copy.photoUrl)) found.photoUrl = 'Use a full link starting with http(s)://'
    if (barcode && !/^\d{8,14}$/.test(barcode)) found.barcode = 'A barcode is 8 to 14 digits.'
    return found
  }

  useEffect(() => {
    if (submitted) setErrors(validate())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy, title, barcode, submitted])

  const setRef = (patch: Partial<CatalogRef>) => onTitleChange({ ...title, ref: { ...ref, ...patch } })
  const set = <K extends keyof CopyState>(key: K, value: CopyState[K]) => setCopy((c) => ({ ...c, [key]: value }))

  const visibleGenres = useMemo(() => {
    if (!genres) return []
    if (showAllGenres || !media) return genres
    return genres.filter((g) => genreFitsMedia(g.name, media) || copy.genreIds.includes(g.id))
  }, [genres, media, showAllGenres, copy.genreIds])

  const badges = useCardBadges(format, copy.attributes)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => {
        const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(first?.matches('input, select, textarea') ? first : first?.querySelector<HTMLElement>('input'))?.focus({ preventScroll: true })
      })
      return
    }

    try {
      const saved = await save.mutateAsync({
        catalog: {
          ...ref,
          title: ref.title.trim(),
          creator: ref.creator?.trim() || null,
          coverUrl: ref.coverUrl?.trim() || null,
        },
        conditionId: copy.conditionId!,
        purchasePrice: Number(copy.purchasePrice || 0),
        dateAcquired: copy.dateAcquired,
        storeFound: copy.storeFound.trim(),
        notes: copy.notes.trim(),
        photoUrl: copy.photoUrl.trim() || null,
        barcode: barcode || null,
        genreIds: copy.genreIds,
        attributes: copy.attributes,
      })
      const itemId = existing?.id ?? (saved as Item).id
      const name = existing ? ref.title : (saved as Item).title
      if (fromWishlist) {
        removeFromWishlist.mutate(fromWishlist)
        toast.success(`Found it! “${name}” moved from your wishlist to your shelf.`)
      } else toast.success(existing ? 'Changes saved' : `“${name}” added to your shelf`)
      navigate(`/items/${itemId}`)
    } catch (err) {
      setErrors({ form: err instanceof ApiError ? err.message : 'Couldn’t save. Check your connection and try again.' })
    }
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {errors.form && (
          <div role="alert" className="rounded-lg border border-neon-red/40 bg-neon-red/10 px-4 py-3 text-neon-red">
            {errors.form}
          </div>
        )}

        {!existing && title.ownedCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-neon-amber/40 bg-neon-amber/10 px-4 py-3 text-neon-amber">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>
              You already own {title.ownedCount === 1 ? 'a copy' : `${title.ownedCount} copies`} of this.{' '}
              {title.firstOwnedItemId && (
                <Link to={`/items/${title.firstOwnedItemId}`} className="font-semibold underline">
                  View it
                </Link>
              )}{' '}
              or keep going to add another copy.
            </p>
          </div>
        )}

        <Section
          title="The title"
          action={
            <Button type="button" variant="ghost" size="sm" icon={<RefreshCw className="size-4" />} onClick={onChangeTitle}>
              {title.editable ? 'Search instead' : 'Change'}
            </Button>
          }
        >
          {title.editable ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-zinc-500">
                <PenLine className="size-4" /> Entered by hand. Only you see these details.
              </p>
              <Field label="Title" error={errors.title}>
                {({ id, invalid, describedBy }) => (
                  <Input id={id} invalid={invalid} aria-describedby={describedBy} value={ref.title} maxLength={200} onChange={(e) => setRef({ title: e.target.value })} />
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Format" error={errors.formatId}>
                  {({ id, invalid, describedBy }) => (
                    <Select id={id} invalid={invalid} aria-describedby={describedBy} value={ref.formatId || ''} onChange={(e) => setRef({ formatId: Number(e.target.value) })}>
                      <option value="" disabled>
                        Choose a format…
                      </option>
                      <FormatOptions formats={formats} />
                    </Select>
                  )}
                </Field>
                <Field label="Release year" optional>
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      value={ref.releaseYear ?? ''}
                      onChange={(e) => setRef({ releaseYear: e.target.value ? Number(e.target.value) : null })}
                      className="font-mono"
                    />
                  )}
                </Field>
              </div>
              <Field label={media ? CREATOR_LABEL[media] : 'Creator'} optional>
                {({ id }) => <Input id={id} value={ref.creator ?? ''} maxLength={200} onChange={(e) => setRef({ creator: e.target.value })} />}
              </Field>
              <Field label="Cover image link" optional error={errors.coverUrl} hint="Paste an image address, or leave blank for generated box art.">
                {({ id, invalid, describedBy }) => (
                  <Input id={id} invalid={invalid} aria-describedby={describedBy} type="url" placeholder="https://…" value={ref.coverUrl ?? ''} onChange={(e) => setRef({ coverUrl: e.target.value })} />
                )}
              </Field>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <CoverThumb src={ref.coverUrl ?? null} title={ref.title} format={format?.name} className="w-20" />
              <div className="min-w-0 space-y-1.5">
                <p className="font-display text-3xl leading-none tracking-[0.05em] text-white">{ref.title}</p>
                <p className="text-zinc-400">{[ref.creator, ref.releaseYear].filter(Boolean).join(' · ')}</p>
                <div className="flex items-center gap-2">
                  <PlatformBadge name={format?.name} />
                  <span className="font-mono text-[0.7rem] uppercase tracking-wider text-zinc-500">via {SOURCE_LABELS[ref.source]}</span>
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Your copy">
          <Field label="Condition" error={errors.conditionId}>
            {({ invalid }) => (
              <Segmented
                name="condition"
                invalid={invalid}
                value={copy.conditionId}
                onChange={(v) => set('conditionId', v)}
                options={(conditions ?? []).map((c) => ({ value: c.id, label: c.name, color: CONDITION_COLORS[c.name] }))}
              />
            )}
          </Field>
          <AttributeFields format={format} values={copy.attributes} onChange={(v) => set('attributes', v)} />
        </Section>

        <Section title="The deal">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price paid" error={errors.purchasePrice}>
              {({ id, invalid, describedBy }) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-500">$</span>
                  <Input id={id} invalid={invalid} aria-describedby={describedBy} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="pl-7 font-mono" value={copy.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
                </div>
              )}
            </Field>
            <Field label="Date acquired" error={errors.dateAcquired}>
              {({ id, invalid, describedBy }) => (
                <Input id={id} invalid={invalid} aria-describedby={describedBy} type="date" max={todayIso()} className="font-mono" value={copy.dateAcquired} onChange={(e) => set('dateAcquired', e.target.value)} />
              )}
            </Field>
          </div>
          <Field label="Where you found it" optional>
            {({ id }) => <Input id={id} value={copy.storeFound} maxLength={200} onChange={(e) => set('storeFound', e.target.value)} placeholder="Goodwill, flea market, eBay…" />}
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
                const on = copy.genreIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('genreIds', on ? copy.genreIds.filter((x) => x !== g.id) : [...copy.genreIds, g.id])}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Photo of your copy" optional error={errors.photoUrl} hint="Shown instead of the stock cover.">
              {({ id, invalid, describedBy }) => (
                <Input id={id} invalid={invalid} aria-describedby={describedBy} type="url" placeholder="https://…" value={copy.photoUrl} onChange={(e) => set('photoUrl', e.target.value)} />
              )}
            </Field>
            <Field label="Barcode" optional error={errors.barcode} hint={barcode ? 'Scanned from your copy.' : undefined}>
              {({ id, invalid, describedBy }) => (
                <div className="relative">
                  <Barcode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                  <Input id={id} invalid={invalid} aria-describedby={describedBy} inputMode="numeric" className="pl-9 font-mono" value={barcode} onChange={(e) => onBarcodeChange(e.target.value.replace(/\D/g, ''))} />
                </div>
              )}
            </Field>
          </div>
          <Field label="Notes" optional>
            {({ id }) => <Textarea id={id} value={copy.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Anything worth remembering about this copy." maxLength={2000} />}
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
                title: ref.title || 'Your title',
                format: format?.name,
                condition: condition?.name,
                price: Number(copy.purchasePrice || 0),
                imageUrl: isUrl(copy.photoUrl) ? copy.photoUrl : ref.coverUrl && isUrl(ref.coverUrl) ? ref.coverUrl : null,
                genres: genres?.filter((g) => copy.genreIds.includes(g.id)).map((g) => g.name),
                badges,
              }}
            />
          </motion.div>
          <ShelfPlank />
          {format && (
            <p className="mt-4 text-center font-mono text-xs" style={{ color: platformColor(format.name) }}>
              Shelved under {format.name}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Panel className="space-y-5 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-[0.1em] text-neon-cyan">{title}</h2>
        {action}
      </div>
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
