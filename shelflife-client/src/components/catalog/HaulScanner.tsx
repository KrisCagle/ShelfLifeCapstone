import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Heart, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthProvider'
import { keys } from '@/hooks/queries'
import { chosenCandidate, loadDraft, lookupBarcode, newRow, saveDraft, withResults, type HaulRow } from '@/lib/haul'
import type { Candidate } from '@/lib/types'
import { Button } from '@/components/ui/Button'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

function RowStatus({ row }: { row: HaulRow }) {
  if (row.status === 'loading') return <Loader2 className="size-4 shrink-0 animate-spin text-neon-cyan" aria-label="Looking up" />
  if (row.status === 'failed' || row.candidates.length === 0) return <CircleAlert className="size-4 shrink-0 text-neon-amber" aria-label="Needs attention" />
  if (row.candidates.some((c) => c.ownedCount > 0)) return <span className="shrink-0 font-mono text-[0.65rem] uppercase text-neon-green">Owned</span>
  if (row.candidates.some((c) => c.wishlistId)) return <Heart className="size-4 shrink-0 text-neon-red" aria-label="On your wishlist" />
  return <Check className="size-4 shrink-0 text-neon-green" aria-hidden />
}

interface HaulScannerProps {
  /** The item already scanned before batch mode started. */
  seed?: { barcode: string; results: Candidate[] }
  onClose: () => void
  onReview: () => void
}

/** The camera stays open and each barcode joins a running list, saved as it goes. */
export default function HaulScanner({ seed, onClose, onReview }: HaulScannerProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user!.id

  const draftRef = useRef(loadDraft(userId))
  const [rows, setRows] = useState<HaulRow[]>(draftRef.current.rows)
  const [notice, setNotice] = useState('')
  const queue = useRef<string[]>([])
  const pumping = useRef(false)
  const alive = useRef(true)

  // Once closed, the review page owns the draft; a late lookup mustn't write over it.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const update = useCallback(
    (change: (rows: HaulRow[]) => HaulRow[]) => {
      draftRef.current = { ...draftRef.current, rows: change(draftRef.current.rows) }
      saveDraft(userId, draftRef.current)
      setRows(draftRef.current.rows)
    },
    [userId],
  )

  // One lookup at a time: the free barcode databases allow only a few requests a minute.
  const pump = useCallback(async () => {
    if (pumping.current) return
    pumping.current = true
    while (alive.current && queue.current.length > 0) {
      const code = queue.current.shift()!
      try {
        const data = await queryClient.fetchQuery({ queryKey: keys.barcode(code), queryFn: () => lookupBarcode(code), staleTime: 60_000 })
        if (alive.current) update((list) => list.map((r) => (r.barcode === code ? withResults(r, data.results) : r)))
      } catch {
        if (alive.current) update((list) => list.map((r) => (r.barcode === code ? { ...r, status: 'failed' } : r)))
      }
    }
    pumping.current = false
  }, [queryClient, update])

  const add = useCallback(
    (code: string) => {
      if (draftRef.current.rows.some((r) => r.barcode === code)) {
        setNotice(`Already in this batch: ${code}`)
        return
      }
      setNotice('')
      update((list) => [newRow(code), ...list])
      queue.current.push(code)
      pump()
    },
    [pump, update],
  )

  // Start the batch with the item from the result screen, if it's not already there.
  const seeded = useRef(false)
  useEffect(() => {
    if (!seed || seeded.current) return
    seeded.current = true
    if (draftRef.current.rows.some((r) => r.barcode === seed.barcode)) return
    update((list) => [withResults(newRow(seed.barcode), seed.results), ...list])
  }, [seed, update])

  const looking = rows.filter((r) => r.status === 'loading').length

  return (
    <Suspense fallback={null}>
      <BarcodeScanner open continuous onClose={onClose} onDetected={add} title="Scan a batch">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-sm text-zinc-300" aria-live="polite">
              {rows.length} scanned{looking > 0 ? ` · looking up ${looking}…` : ''}
            </p>
            <Button size="sm" disabled={rows.length === 0 || looking > 0} onClick={onReview}>
              Review {rows.length > 0 ? rows.length : ''}
            </Button>
          </div>
          {notice && <p className="text-sm text-neon-amber">{notice}</p>}
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {rows.map((row) => {
              const c = chosenCandidate(row)
              return (
                <li key={row.key} className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-sm text-zinc-200">
                  <span className="min-w-0 flex-1 truncate">
                    {row.status === 'loading' ? `Looking up ${row.barcode}…` : c?.title || row.title || `No match for ${row.barcode}`}
                  </span>
                  <RowStatus row={row} />
                </li>
              )
            })}
          </ul>
        </div>
      </BarcodeScanner>
    </Suspense>
  )
}
