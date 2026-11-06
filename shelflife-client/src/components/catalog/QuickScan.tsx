import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CircleCheckBig, Heart, PackagePlus, RefreshCw, ScanLine, Sparkles, WifiOff } from 'lucide-react'
import { useBarcodeLookup } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Candidate } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Misc'
import { CandidateCard } from './CandidateCard'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

type Verdict = 'owned' | 'wishlist' | 'new' | 'unknown'

const VERDICTS: Record<Verdict, { title: string; body: string; color: string; icon: typeof Heart }> = {
  owned: { title: 'You own this', body: 'Already on your shelf. Put it back… unless it’s a better copy.', color: '#00ff88', icon: CircleCheckBig },
  wishlist: { title: 'On your wishlist!', body: 'This is one of your hunts. Grab it!', color: '#ff4444', icon: Heart },
  new: { title: 'Not in your collection', body: 'You don’t have this one yet.', color: '#00bfff', icon: Sparkles },
  unknown: { title: 'No match found', body: 'We couldn’t identify that barcode. You can still add it by hand.', color: '#f5a623', icon: ScanLine },
}

/** Nav-bar scanner answering "do I already own this?" while you're out hunting. */
export function QuickScan({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [barcode, setBarcode] = useState<string | null>(null)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const lookup = useBarcodeLookup(barcode)
  const results = lookup.data?.results ?? []

  const verdict: Verdict = results.some((r) => r.ownedCount > 0)
    ? 'owned'
    : results.some((r) => r.wishlistId)
      ? 'wishlist'
      : results.length > 0
        ? 'new'
        : 'unknown'
  const pick = selected ?? results.find((r) => r.ownedCount > 0) ?? results.find((r) => r.wishlistId) ?? results[0] ?? null

  const close = () => {
    setBarcode(null)
    setSelected(null)
    onClose()
  }
  const go = (to: string, state?: unknown) => {
    close()
    navigate(to, { state })
  }

  if (!open) return null

  if (!barcode)
    return (
      <Suspense fallback={null}>
        <BarcodeScanner open onClose={close} onDetected={setBarcode} />
      </Suspense>
    )

  const v = VERDICTS[verdict]
  return (
    <Modal open onClose={close} title="Scan result">
      {lookup.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-[5.5rem] rounded-xl" />
          <p className="text-center font-mono text-sm text-zinc-500">Looking up {barcode}…</p>
        </div>
      ) : lookup.isError ? (
        <div className="space-y-4 text-center">
          <WifiOff className="mx-auto size-10 text-neon-amber" aria-hidden />
          <div>
            <p className="font-display text-3xl tracking-[0.08em] text-neon-amber">Couldn’t look that up</p>
            <p className="mt-1 text-sm text-zinc-300">We read barcode {barcode}, but couldn’t reach ShelfLife. Check your connection and try again.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => lookup.refetch()} loading={lookup.isFetching} icon={<RefreshCw className="size-4" />}>
              Try again
            </Button>
            <Button variant="subtle" onClick={() => setBarcode(null)} icon={<ScanLine className="size-4" />}>
              Scan another
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-4 rounded-xl p-4"
            style={{ backgroundColor: `${v.color}1a`, boxShadow: `inset 0 0 0 1px ${v.color}66, 0 0 30px ${v.color}22` }}
          >
            <v.icon className="size-10 shrink-0" style={{ color: v.color, filter: `drop-shadow(0 0 8px ${v.color})` }} />
            <div>
              <p className="font-display text-3xl leading-none tracking-[0.08em]" style={{ color: v.color }}>
                {v.title}
              </p>
              <p className="mt-1 text-sm text-zinc-300">{v.body}</p>
            </div>
          </motion.div>

          {results.length > 1 && <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">Matches · tap the right one</p>}
          <div className="space-y-2">
            {results.map((c, i) => (
              <CandidateCard key={`${c.source}-${c.externalId}-${c.formatId}-${i}`} candidate={c} selected={results.length > 1 && c === pick} onPick={() => setSelected(c)} />
            ))}
          </div>

          <div className={cn('grid gap-2', pick?.ownedCount ? 'grid-cols-2' : 'sm:grid-cols-2')}>
            {pick?.ownedCount && pick.firstOwnedItemId ? (
              <Button onClick={() => go(`/items/${pick.firstOwnedItemId}`)} icon={<CircleCheckBig className="size-4" />}>
                View my copy
              </Button>
            ) : (
              <Button
                onClick={() => go(pick?.wishlistId ? `/items/new?fromWishlist=${pick.wishlistId}` : '/items/new', pick ? { pick: { candidate: pick, barcode } } : undefined)}
                icon={<PackagePlus className="size-4" />}
              >
                {pick?.wishlistId ? 'Found it! Add to shelf' : 'Add to collection'}
              </Button>
            )}
            {!pick?.wishlistId && !pick?.ownedCount && pick && (
              <Button variant="secondary" onClick={() => go('/wishlist/new', { pick: { candidate: pick } })} icon={<Heart className="size-4" />}>
                Add to wishlist
              </Button>
            )}
            <Button variant="subtle" onClick={() => { setBarcode(null); setSelected(null) }} icon={<ScanLine className="size-4" />}>
              Scan another
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
