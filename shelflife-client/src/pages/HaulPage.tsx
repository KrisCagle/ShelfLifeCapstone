import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Layers, RefreshCw, ScanLine, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthProvider'
import { useConditions, useFormats, useSaveBatch } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney, todayIso } from '@/lib/format'
import { catalogRefFor, chosenCandidate, clearDraft, isLocked, loadDraft, lookupBarcode, saveDraft, splitTotal, withResults, type HaulDraft, type HaulRow } from '@/lib/haul'
import type { ItemSave } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field, Input, Segmented, Select } from '@/components/ui/Form'
import { EmptyState, PageHeader, Panel, PlatformBadge } from '@/components/ui/Misc'
import { CoverThumb, OwnershipBadges } from '@/components/catalog/CandidateCard'
import { FormatOptions } from '@/components/catalog/FormatOptions'

const HaulScanner = lazy(() => import('@/components/catalog/HaulScanner'))

/** The API's limit for one all-or-nothing save. */
const BATCH_SIZE = 100

const CONDITION_COLORS: Record<string, string> = { Sealed: '#00ff88', Good: '#00bfff', Fair: '#f5a623', Poor: '#ff4444' }

export default function HaulPage() {
  const { user } = useAuth()
  const userId = user!.id
  const location = useLocation()
  const navigate = useNavigate()
  const { data: formats } = useFormats()
  const { data: conditions } = useConditions()
  const save = useSaveBatch()
  // The ref is the live copy; state only mirrors it for rendering. Saving inside a
  // setState updater would run later and could undo clearDraft.
  const draftRef = useRef<HaulDraft | null>(null)
  draftRef.current ??= loadDraft(userId)
  const [draft, setDraft] = useState<HaulDraft>(draftRef.current)
  const [conditionId, setConditionId] = useState<number | null>(null)
  const [total, setTotal] = useState('')
  const [scanning, setScanning] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    draftRef.current = loadDraft(userId)
    setDraft(draftRef.current)
  }, [userId])

  const update = (change: (current: HaulDraft) => HaulDraft) => {
    draftRef.current = change(draftRef.current!)
    saveDraft(userId, draftRef.current)
    setDraft(draftRef.current)
  }

  // Reload when arriving from the nav-bar scanner while already on this page.
  useEffect(reload, [reload, location.key])

  const condition = conditionId ?? conditions?.find((c) => c.name === 'Good')?.id ?? null

  const change = (next: Partial<HaulDraft>) => update((current) => ({ ...current, ...next }))
  const changeRow = (key: string, patch: Partial<HaulRow>) =>
    update((current) => ({ ...current, rows: current.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))

  const included = useMemo(() => draft.rows.filter((r) => r.include), [draft.rows])
  const incomplete = included.filter((r) => !r.title.trim() || !r.formatId)
  const spent = included.reduce((sum, r) => sum + (Number(r.price) || 0), 0)

  const split = () => {
    const amount = Number(total)
    if (!amount || amount < 0 || included.length === 0) return
    const shares = splitTotal(amount, included.length)
    const byKey = new Map(included.map((r, i) => [r.key, shares[i]]))
    change({ rows: draft.rows.map((r) => (byKey.has(r.key) ? { ...r, price: byKey.get(r.key)! } : r)) })
  }

  const retry = async (row: HaulRow) => {
    if (!row.barcode) return
    changeRow(row.key, { status: 'loading' })
    try {
      const data = await lookupBarcode(row.barcode)
      update((current) => ({ ...current, rows: current.rows.map((r) => (r.key === row.key ? withResults(r, data.results) : r)) }))
    } catch {
      changeRow(row.key, { status: 'failed' })
    }
  }

  const discard = () => {
    if (!window.confirm(`Discard all ${draft.rows.length} scanned items?`)) return
    clearDraft(userId)
    reload()
  }

  const onSave = async () => {
    setError('')
    if (incomplete.length > 0) {
      setShowErrors(true)
      return
    }
    const toItem = (row: HaulRow): ItemSave => ({
      catalog: catalogRefFor(row),
      conditionId: row.conditionId ?? condition!,
      purchasePrice: Number(row.price) || 0,
      dateAcquired: draft.date,
      storeFound: draft.store.trim(),
      barcode: row.barcode,
      genreIds: [],
      attributes: {},
    })

    // Each chunk is all-or-nothing, and saved rows leave the draft right away, so a
    // failure part-way can be retried without adding anything twice.
    let added = 0
    let crossedOff = 0
    for (let i = 0; i < included.length; i += BATCH_SIZE) {
      const chunk = included.slice(i, i + BATCH_SIZE)
      // Anything found on the wishlist is no longer a hunt.
      const wishlistIds = chunk.map((r) => chosenCandidate(r)?.wishlistId).filter((id): id is number => !!id)
      try {
        await save.mutateAsync({ items: chunk.map(toItem), wishlistIds })
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : 'Check your connection and try again.'
        setError(added > 0 ? `Added ${added}. The rest are still here: ${reason}` : reason)
        return
      }
      added += chunk.length
      crossedOff += wishlistIds.length
      const saved = new Set(chunk.map((r) => r.key))
      update((current) => ({ ...current, rows: current.rows.filter((r) => !saved.has(r.key)) }))
    }

    clearDraft(userId)
    toast.success(`${added} ${added === 1 ? 'title' : 'titles'} added to your shelf${crossedOff ? `, ${crossedOff} crossed off your wishlist` : ''}`)
    navigate('/collection')
  }

  const closeScanner = () => {
    setScanning(false)
    reload()
  }

  const scanner = scanning && (
    <Suspense fallback={null}>
      <HaulScanner onClose={closeScanner} onReview={closeScanner} />
    </Suspense>
  )

  if (draft.rows.length === 0)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Panel>
          <EmptyState
            icon={<Layers className="size-8" />}
            title="No haul in progress"
            description="Scan a stack of titles one after another, then add them all in one go."
            action={
              <Button size="lg" icon={<ScanLine className="size-5" />} onClick={() => setScanning(true)}>
                Start scanning
              </Button>
            }
          />
        </Panel>
        {scanner}
      </div>
    )

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-8 sm:px-6">
      <PageHeader
        eyebrow="Haul"
        title="Review your haul"
        description="Everything below is saved on this device until you add it."
        actions={
          <Button variant="secondary" icon={<ScanLine className="size-4" />} onClick={() => setScanning(true)}>
            Scan more
          </Button>
        }
      />

      <Panel className="mt-6 space-y-5 p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-[0.1em] text-neon-cyan">The whole haul</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where you found them" optional>
            {({ id }) => <Input id={id} value={draft.store} maxLength={200} placeholder="Goodwill, flea market…" onChange={(e) => change({ store: e.target.value })} />}
          </Field>
          <Field label="Date">
            {({ id }) => <Input id={id} type="date" max={todayIso()} className="font-mono" value={draft.date} onChange={(e) => change({ date: e.target.value })} />}
          </Field>
        </div>
        <Field label="Condition for all" hint="Change any single title below.">
          {() => (
            <Segmented
              name="haul-condition"
              value={condition}
              onChange={setConditionId}
              options={(conditions ?? []).map((c) => ({ value: c.id, label: c.name, color: CONDITION_COLORS[c.name] }))}
            />
          )}
        </Field>
        <Field label="Total paid" optional hint={`Splits evenly across the ${included.length} ticked ${included.length === 1 ? 'title' : 'titles'}. You can adjust each one below.`}>
          {({ id, describedBy }) => (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-500">$</span>
                <Input id={id} aria-describedby={describedBy} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="pl-7 font-mono" value={total} onChange={(e) => setTotal(e.target.value)} />
              </div>
              <Button type="button" variant="subtle" disabled={!Number(total) || included.length === 0} onClick={split}>
                Split evenly
              </Button>
            </div>
          )}
        </Field>
      </Panel>

      <ul className="mt-6 space-y-3">
        {draft.rows.map((row) => {
          const c = chosenCandidate(row)
          const locked = isLocked(row)
          const formatName = formats?.find((f) => f.id === row.formatId)?.name
          const missing = showErrors && row.include && (!row.title.trim() || !row.formatId)
          return (
            <li key={row.key}>
              <Panel className={cn('p-3 transition sm:p-4', !row.include && 'opacity-50', missing && 'ring-1 ring-neon-red/70')}>
                <div className="flex gap-3">
                  <label className="flex shrink-0 cursor-pointer items-start pt-1">
                    <input type="checkbox" className="sr-only" checked={row.include} aria-label={`Include ${row.title || row.barcode}`} onChange={(e) => changeRow(row.key, { include: e.target.checked })} />
                    <span className={cn('grid size-6 place-items-center rounded-md border transition', row.include ? 'border-neon-cyan bg-neon-cyan text-ink-900' : 'border-white/20')}>
                      {row.include && <Check className="size-4" />}
                    </span>
                  </label>
                  <CoverThumb src={c?.coverUrl ?? null} title={row.title || '?'} format={formatName} className="w-14" />
                  <div className="min-w-0 flex-1 space-y-2">
                    {locked ? (
                      <div>
                        <p className="font-semibold leading-tight text-zinc-100">{row.title}</p>
                        {(c?.creator || c?.releaseYear) && <p className="text-sm text-zinc-400">{[c.creator, c.releaseYear].filter(Boolean).join(' · ')}</p>}
                      </div>
                    ) : (
                      <Input
                        aria-label="Title"
                        invalid={missing && !row.title.trim()}
                        value={row.title}
                        placeholder={row.status === 'failed' ? 'Lookup failed: type the title' : 'No match: type the title'}
                        onChange={(e) => changeRow(row.key, { title: e.target.value })}
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {locked && <PlatformBadge name={formatName} />}
                      {c && <OwnershipBadges candidate={c} />}
                      {row.status === 'failed' && (
                        <button type="button" onClick={() => retry(row)} className="inline-flex items-center gap-1 font-mono text-xs text-neon-cyan hover:underline">
                          <RefreshCw className="size-3" /> Retry lookup
                        </button>
                      )}
                    </div>
                    {row.candidates.length > 1 && (
                      <Select
                        aria-label="Choose the right match"
                        value={row.chosen}
                        className="py-1.5 text-sm"
                        onChange={(e) => {
                          const chosen = Number(e.target.value)
                          const next = row.candidates[chosen]
                          changeRow(row.key, { chosen, title: next.title, formatId: next.formatId ?? row.formatId })
                        }}
                      >
                        {row.candidates.map((candidate, i) => (
                          <option key={i} value={i}>
                            {[candidate.title, candidate.releaseYear].filter(Boolean).join(' · ')}
                          </option>
                        ))}
                      </Select>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {!locked && (
                        <Select aria-label="Format" invalid={missing && !row.formatId} value={row.formatId ?? ''} className="py-1.5 text-sm" onChange={(e) => changeRow(row.key, { formatId: Number(e.target.value) })}>
                          <option value="" disabled>
                            Format…
                          </option>
                          <FormatOptions formats={formats} />
                        </Select>
                      )}
                      <Select aria-label="Condition" value={row.conditionId ?? condition ?? ''} className="py-1.5 text-sm" onChange={(e) => changeRow(row.key, { conditionId: Number(e.target.value) })}>
                        {conditions?.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </Select>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm text-zinc-500">$</span>
                        <Input aria-label="Price" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" className="py-1.5 pl-6 font-mono text-sm" value={row.price} onChange={(e) => changeRow(row.key, { price: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => change({ rows: draft.rows.filter((r) => r.key !== row.key) })} className="h-fit rounded-md p-1 text-zinc-500 hover:bg-neon-red/10 hover:text-neon-red" aria-label={`Remove ${row.title || row.barcode}`}>
                    <X className="size-4" />
                  </button>
                </div>
              </Panel>
            </li>
          )
        })}
      </ul>

      <button type="button" onClick={discard} className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm text-zinc-500 hover:text-neon-red">
        <Trash2 className="size-4" /> Discard this haul
      </button>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 font-mono text-sm">
            {showErrors && incomplete.length > 0 ? (
              <p className="text-neon-red">
                {incomplete.length} need a title and format, or untick {incomplete.length === 1 ? 'it' : 'them'}.
              </p>
            ) : error ? (
              <p role="alert" className="text-neon-red">
                {error}
              </p>
            ) : (
              <p className="text-zinc-300">
                {included.length} {included.length === 1 ? 'title' : 'titles'} · <span className="text-neon-amber">{formatMoney(spent)}</span>
              </p>
            )}
          </div>
          <Button size="lg" className="shrink-0" loading={save.isPending} disabled={included.length === 0} icon={<Save className="size-5" />} onClick={onSave}>
            Add to shelf
          </Button>
        </div>
      </div>
      {scanner}
    </div>
  )
}
