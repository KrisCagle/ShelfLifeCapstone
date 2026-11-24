import { useState } from 'react'
import { motion } from 'motion/react'
import { ExternalLink, ShoppingBag, Users } from 'lucide-react'
import { useCollectorsPaid, useEbayListings } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import type { Item } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Misc'

/**
 * The title page's money section. Two separate things, on purpose:
 *  - What collectors paid: ShelfLife's own data.
 *  - Listed on eBay now: listings exactly as eBay shows them. eBay's license bans turning
 *    its data into a price estimate, so this never shows an average or a "value".
 */
export function MarketPanel({ item }: { item: Item }) {
  return (
    <Panel accent="#f5a623" className="space-y-6 p-5">
      <PaidSection item={item} />
      <div className="h-px bg-white/5" />
      <ListingsSection title={item.title} format={item.format?.name} />
    </Panel>
  )
}

function PaidSection({ item }: { item: Item }) {
  const shared = !item.catalogEntry.isPrivate
  const paid = useCollectorsPaid(shared ? item.catalogEntry.id : null)
  const data = paid.data

  return (
    <section aria-labelledby="paid-heading">
      <h2 id="paid-heading" className="flex items-center gap-2 font-display text-2xl tracking-[0.1em] text-white">
        <Users className="size-5 text-neon-amber" /> What collectors paid
      </h2>
      {!shared ? (
        <p className="mt-1 text-sm text-zinc-400">Titles you typed in yourself stay private, so they aren’t compared with anyone else’s.</p>
      ) : paid.isLoading ? (
        <p className="mt-1 text-sm text-zinc-500">Checking…</p>
      ) : !data || data.typical == null ? (
        <p className="mt-1 text-sm text-zinc-400">
          Not enough ShelfLife collectors have logged a price yet ({data?.collectors ?? 0} of {data?.needed ?? 5}). It appears once enough have, so
          no one’s price can be picked out.
        </p>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ['Low', data.low!, 'text-zinc-300'],
                ['Typical', data.typical, 'text-neon-green text-glow-green text-2xl'],
                ['High', data.high!, 'text-zinc-300'],
              ] as const
            ).map(([label, value, cls]) => (
              <div key={label}>
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
                <p className={`font-mono text-lg ${cls}`}>{formatMoney(value)}</p>
              </div>
            ))}
          </div>
          <RangeBar low={data.low!} high={data.high!} typical={data.typical} paid={item.purchasePrice} />
          <p className="text-sm text-zinc-400">
            Most of the {data.collectors} collectors who logged this paid between {formatMoney(data.low!)} and {formatMoney(data.high!)}.
          </p>
        </motion.div>
      )}
    </section>
  )
}

/** Current eBay listings, loaded only when asked for, so page views don't call eBay. */
function ListingsSection({ title, format }: { title: string; format?: string | null }) {
  const [open, setOpen] = useState(false)
  const listings = useEbayListings(title, format, open)
  const data = listings.data

  return (
    <section aria-labelledby="listings-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="listings-heading" className="flex items-center gap-2 font-display text-2xl tracking-[0.1em] text-white">
          <ShoppingBag className="size-5 text-neon-cyan" /> Listed on eBay now
        </h2>
        {!open && (
          <Button variant="subtle" size="sm" onClick={() => setOpen(true)}>
            Show listings
          </Button>
        )}
      </div>

      {open && listings.isLoading && <p className="mt-3 text-sm text-zinc-500">Loading listings…</p>}
      {open && (listings.isError || (data && !data.available)) && <p className="mt-3 text-sm text-neon-amber">eBay can’t be reached right now. Try again in a bit.</p>}
      {data?.available && data.listings.length === 0 && <p className="mt-3 text-sm text-zinc-400">Nothing listed right now.</p>}

      {data && data.listings.length > 0 && (
        <ul className="mt-3 divide-y divide-white/5">
          {data.listings.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer sponsored" className="flex items-center gap-3 py-2.5 hover:text-neon-cyan">
                {l.imageUrl ? (
                  <img src={l.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded object-cover ring-1 ring-white/10" />
                ) : (
                  <span className="size-12 shrink-0 rounded bg-white/5" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-zinc-200">{l.title}</span>
                  {l.condition && <span className="font-mono text-xs text-zinc-500">{l.condition}</span>}
                </span>
                <span className="shrink-0 font-mono text-neon-amber">{l.currency === 'USD' ? formatMoney(l.price) : `${l.price} ${l.currency}`}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <a href={data.searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-zinc-400 hover:text-neon-cyan">
            See all on eBay <ExternalLink className="size-3.5" />
          </a>
          {data.affiliate && <p className="text-xs text-zinc-500">ShelfLife may earn a commission if you buy through these links.</p>}
        </div>
      )}
    </section>
  )
}

/** Low→high range with markers for the typical price and what you paid. */
function RangeBar({ low, high, typical, paid }: { low: number; high: number; typical: number; paid: number }) {
  const min = Math.min(low, paid)
  const max = Math.max(high, paid)
  const pos = (v: number) => (max === min ? 50 : ((v - min) / (max - min)) * 100)
  // "You paid" labels above the bar and "typical" below, so close values never collide.
  return (
    <div className="relative py-5">
      <div className="relative h-2 rounded-full bg-white/5">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-neon-amber/40 via-neon-green/60 to-neon-amber/40"
          style={{ left: `${pos(low)}%`, width: `${pos(high) - pos(low)}%` }}
        />
        {paid > 0 && <Marker at={pos(paid)} color="#00bfff" label="you paid" above />}
        <Marker at={pos(typical)} color="#00ff88" label="typical" />
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

/** One line for a wishlist card: the typical price, when there's enough data. */
export function TypicalPaid({ catalogEntryId }: { catalogEntryId: number | null }) {
  const paid = useCollectorsPaid(catalogEntryId)
  if (paid.data?.typical == null) return null
  return (
    <span className="font-mono text-sm text-zinc-400">
      Collectors paid ~<span className="text-neon-green">{formatMoney(paid.data.typical)}</span>
    </span>
  )
}

export const ebaySearchUrl = (title: string, format?: string | null) =>
  `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent([title, format].filter(Boolean).join(' '))}`
