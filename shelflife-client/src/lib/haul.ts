import { api } from './api'
import { todayIso } from './format'
import type { Candidate, CatalogRef } from './types'

export type HaulRowStatus = 'loading' | 'ready' | 'failed'

/** One scanned item in a haul, from the moment it's read until it's saved. */
export interface HaulRow {
  key: string
  barcode: string | null
  status: HaulRowStatus
  candidates: Candidate[]
  chosen: number
  include: boolean
  /** Used for titles typed in or fixed by hand. */
  title: string
  formatId: number | null
  conditionId: number | null
  price: string
  /** Older saved drafts don't have this. */
  photoUrl?: string | null
}

export interface HaulDraft {
  rows: HaulRow[]
  store: string
  date: string
}

const emptyDraft = (): HaulDraft => ({ rows: [], store: '', date: todayIso() })
const draftKey = (userId: number) => `shelflife:haul-draft:${userId}`

// The draft lives in the browser so a refresh or dropped connection can't lose a long scan.
export function loadDraft(userId: number): HaulDraft {
  try {
    const raw = localStorage.getItem(draftKey(userId))
    if (!raw) return emptyDraft()
    const draft = { ...emptyDraft(), ...(JSON.parse(raw) as Partial<HaulDraft>) }
    // A lookup doesn't survive a reload, so offer a retry instead of spinning forever.
    return { ...draft, rows: draft.rows.map((r) => (r.status === 'loading' ? { ...r, status: 'failed' as const } : r)) }
  } catch {
    return emptyDraft()
  }
}

export function saveDraft(userId: number, draft: HaulDraft) {
  // An emptied haul shouldn't leave its store and date behind for the next one.
  if (draft.rows.length === 0) return clearDraft(userId)
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft))
  } catch {
    // Storage blocked or full; the haul still works until the page closes.
  }
}

export function clearDraft(userId: number) {
  try {
    localStorage.removeItem(draftKey(userId))
  } catch {
    // Nothing to clear.
  }
}

export const lookupBarcode = (code: string) =>
  api.get<{ barcode: string; results: Candidate[] }>(`/catalog/barcode/${code}`)

export const newRow = (barcode: string | null): HaulRow => ({
  key: barcode ?? crypto.randomUUID(),
  barcode,
  status: 'loading',
  candidates: [],
  chosen: 0,
  include: true,
  title: '',
  formatId: null,
  conditionId: null,
  price: '',
})

/** Fills a row from lookup results. Titles you already own start unticked. */
export function withResults(row: HaulRow, results: Candidate[]): HaulRow {
  const first = results[0]
  return {
    ...row,
    status: 'ready',
    candidates: results,
    chosen: 0,
    title: first?.title ?? row.title,
    formatId: first?.formatId ?? row.formatId,
    include: !results.some((r) => r.ownedCount > 0),
  }
}

export const chosenCandidate = (row: HaulRow): Candidate | null => row.candidates[row.chosen] ?? null

/** True when the title came from a real source and can't be edited on the row. */
export const isLocked = (row: HaulRow) => {
  const c = chosenCandidate(row)
  return !!c && c.source !== 'manual' && c.source !== 'upc'
}

export function catalogRefFor(row: HaulRow): CatalogRef {
  const c = chosenCandidate(row)
  if (c && isLocked(row))
    return {
      id: c.catalogEntryId ?? undefined,
      source: c.source,
      externalId: c.externalId,
      title: c.title,
      formatId: c.formatId ?? row.formatId ?? 0,
      releaseYear: c.releaseYear,
      creator: c.creator,
      coverUrl: c.coverUrl,
    }
  // Unmatched or retail-only rows become the user's own private titles.
  return {
    id: c?.catalogEntryId ?? undefined,
    source: 'manual',
    title: row.title.trim(),
    formatId: row.formatId ?? 0,
    creator: c?.creator,
    coverUrl: c?.coverUrl,
  }
}

/** Splits a total across rows to the cent; the first rows absorb any remainder. */
export function splitTotal(total: number, count: number): string[] {
  const cents = Math.round(total * 100)
  const each = Math.floor(cents / count)
  const extra = cents - each * count
  return Array.from({ length: count }, (_, i) => ((each + (i < extra ? 1 : 0)) / 100).toFixed(2))
}
