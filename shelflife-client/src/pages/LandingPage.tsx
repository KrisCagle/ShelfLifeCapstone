import { useMemo, type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowRight, BadgeDollarSign, Barcode, BellRing, Heart, Layers, Library, Plus, ScanSearch, Sparkles } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useItems, useWishlist } from '@/hooks/queries'
import { formatMoney } from '@/lib/format'
import { ALL_PLATFORMS, platformColor, withAlpha } from '@/lib/platforms'
import type { Item, Me, WishlistItem } from '@/lib/types'
import { ButtonLink } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { CountUp } from '@/components/ui/CountUp'
import { Panel, PlatformBadge, Stat } from '@/components/ui/Misc'
import { CaseCard, ShelfPlank, type CaseCardData } from '@/components/collection/CaseCard'
import { PriorityPill } from '@/components/collection/PriorityPill'
import { NewsSection, NewsTicker } from '@/components/news/News'

const DEMO_SHELF: CaseCardData[][] = [
  [
    { title: 'Chrono Trigger', format: 'SNES' },
    { title: 'Rumours', format: 'Vinyl' },
    { title: 'Metal Gear Solid', format: 'PS1' },
    { title: 'Jurassic Park', format: 'VHS' },
  ],
  [
    { title: 'Sonic the Hedgehog 2', format: 'Sega Genesis' },
    { title: 'GoldenEye 007', format: 'N64' },
    { title: 'Pokémon Red', format: 'GameBoy' },
    { title: 'Thriller', format: 'CD' },
  ],
]

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
}

export default function LandingPage() {
  const { user } = useAuth()
  const { data: items } = useItems(!!user)
  const { data: wishlist } = useWishlist(!!user)

  const shelves = useMemo(() => {
    if (!items || items.length < 4) return DEMO_SHELF
    const recent = [...items].sort((a, b) => b.id - a.id).slice(0, 8).map(toCard)
    return [recent.slice(0, 4), recent.slice(4, 8)].filter((row) => row.length > 0)
  }, [items])

  return (
    <div className="overflow-x-clip">
      <Hero user={user} items={items} shelves={shelves} />
      <NewsTicker />

      <div className="mx-auto max-w-7xl space-y-24 px-4 py-16 sm:px-6 sm:py-20">
        {user && items && <ShelfSnapshot items={items} wishlist={wishlist ?? []} />}

        <motion.div {...reveal}>
          <NewsSection />
        </motion.div>

        {!user && (
          <>
            <Features />
            <HowItWorks />
            <FinalCta />
          </>
        )}
      </div>
    </div>
  )
}

const toCard = (item: Item): CaseCardData => ({
  id: item.id,
  title: item.title,
  format: item.format?.name,
  imageUrl: item.imageUrl,
})

// ── Hero ───────────────────────────────────────────────────────────────────

function Hero({ user, items, shelves }: { user: Me | null; items?: Item[]; shelves: CaseCardData[][] }) {
  const invested = items?.reduce((sum, i) => sum + (i.purchasePrice || 0), 0) ?? 0
  const formats = new Set(items?.map((i) => i.format?.name)).size

  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(0,191,255,0.14),transparent_55%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          {user ? (
            <>
              <p className="mb-3 font-mono text-sm uppercase tracking-[0.3em] text-neon-amber">Welcome back</p>
              <h1 className="font-display text-6xl leading-[0.9] tracking-[0.04em] text-white sm:text-7xl">
                Hey {user.firstName}, <span className="text-neon-cyan text-glow-cyan">the shelf missed you.</span>
              </h1>
              <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
                <Stat label="Titles" value={<CountUp value={items?.length ?? 0} />} />
                <Stat label="Invested" color="#f5a623" value={<CountUp value={invested} format={(n) => formatMoney(n).replace('.00', '')} />} />
                <Stat label="Formats" color="#00ff88" value={<CountUp value={formats} />} />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to="/collection" size="lg" icon={<Library className="size-5" />}>
                  Open my collection
                </ButtonLink>
                <ButtonLink to="/items/new" size="lg" variant="secondary" icon={<Plus className="size-5" />}>
                  Add a title
                </ButtonLink>
              </div>
            </>
          ) : (
            <>
              <Logo flicker className="mb-8 w-full max-w-md drop-shadow-[0_0_30px_rgba(0,191,255,0.35)]" />
              <h1 className="font-display text-5xl leading-[0.92] tracking-[0.04em] text-white sm:text-7xl">
                One app for the <span className="text-neon-cyan text-glow-cyan">whole retro shelf.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-zinc-300">
                Catalog your games, vinyl, tapes, books and comics in one place. See what they’re worth, track what you spent, and never buy a
                duplicate at the flea market again.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to="/register" size="lg" className="animate-pulse-glow" icon={<Sparkles className="size-5" />}>
                  Start your collection
                </ButtonLink>
                <ButtonLink to="/login" size="lg" variant="secondary">
                  Sign in
                </ButtonLink>
              </div>
              <p className="mt-4 font-mono text-sm text-zinc-500">Free to start. No credit card.</p>
            </>
          )}

          <div className="mt-10 flex flex-wrap gap-1.5" aria-label="Supported formats">
            {ALL_PLATFORMS.map((p, i) => (
              <motion.span key={p} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.04 }}>
                <PlatformBadge name={p} />
              </motion.span>
            ))}
          </div>
        </motion.div>

        <HeroShelf shelves={shelves} linkItems={!!user} />
      </div>
    </section>
  )
}

/** Two shelves of cases on a 3D stage that leans toward the cursor. */
function HeroShelf({ shelves, linkItems }: { shelves: CaseCardData[][]; linkItems: boolean }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rotateY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 80, damping: 20 })
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 80, damping: 20 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0.5)
        my.set(0.5)
      }}
      className="relative"
      style={{ perspective: 1400 }}
    >
      <div className="absolute -inset-10 rounded-full bg-neon-cyan/10 blur-3xl" />
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="glass scanlines relative rounded-3xl p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">{linkItems ? 'Recently added' : 'Your shelf, digitized'}</span>
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-neon-red/80" />
            <span className="size-2.5 rounded-full bg-neon-amber/80" />
            <span className="size-2.5 rounded-full bg-neon-green/80" />
          </span>
        </div>
        <div className="space-y-6">
          {shelves.map((row, r) => (
            <div key={r}>
              <div className="grid grid-cols-4 items-end gap-2.5 px-2 sm:gap-3.5">
                {row.map((card, i) => (
                  <motion.div
                    key={`${card.title}-${i}`}
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + (r * 4 + i) * 0.07, type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <CaseCard item={card} compact showInfo={false} to={linkItems && card.id ? `/items/${card.id}` : undefined} />
                  </motion.div>
                ))}
              </div>
              <ShelfPlank className="mt-0" />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Signed-in snapshot ─────────────────────────────────────────────────────

function ShelfSnapshot({ items, wishlist }: { items: Item[]; wishlist: WishlistItem[] }) {
  const byFormat = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((i) => i.format?.name && counts.set(i.format.name, (counts.get(i.format.name) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [items])
  const hunts = [...wishlist].sort((a, b) => b.priority - a.priority).slice(0, 4)
  const max = byFormat[0]?.[1] ?? 1

  return (
    <motion.section {...reveal} aria-labelledby="snapshot-heading" className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <Panel className="p-6" accent="#00bfff">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="snapshot-heading" className="font-display text-3xl tracking-[0.08em] text-white">Shelf breakdown</h2>
          <Link to="/collection" className="inline-flex items-center gap-1 font-mono text-sm text-neon-cyan hover:underline">
            View all <ArrowRight className="size-4" />
          </Link>
        </div>
        {byFormat.length === 0 ? (
          <p className="text-zinc-400">Add your first title to see your breakdown.</p>
        ) : (
          <ul className="space-y-3">
            {byFormat.map(([format, count], i) => {
              const color = platformColor(format)
              return (
                <li key={format} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3">
                  <PlatformBadge name={format} className="justify-self-start" />
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 12px ${withAlpha(color, 0.6)}` }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(count / max) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-right font-mono text-zinc-300">{count}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel className="p-6" accent="#ff4444">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-3xl tracking-[0.08em] text-white">Top hunts</h2>
          <Link to="/wishlist" className="inline-flex items-center gap-1 font-mono text-sm text-neon-cyan hover:underline">
            Wishlist <ArrowRight className="size-4" />
          </Link>
        </div>
        {hunts.length === 0 ? (
          <div className="space-y-3 text-zinc-400">
            <p>Nothing on the hunt list yet. Add the grails you’re looking for.</p>
            <ButtonLink to="/wishlist/new" variant="subtle" size="sm" icon={<Heart className="size-4" />}>
              Add a hunt
            </ButtonLink>
          </div>
        ) : (
          <ul className="space-y-2">
            {hunts.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-100">{h.title}</p>
                  <PlatformBadge name={h.format?.name} className="mt-1" />
                </div>
                <PriorityPill priority={h.priority} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </motion.section>
  )
}

// ── Visitor sections ───────────────────────────────────────────────────────

const FEATURES: { icon: ReactNode; title: string; body: string; color: string; soon?: boolean }[] = [
  { icon: <Layers />, title: 'Every format, one shelf', body: 'Cartridges, discs, vinyl and VHS side by side, each styled after its platform.', color: '#00bfff' },
  { icon: <BadgeDollarSign />, title: 'What’s it worth?', body: 'Check live market prices for a single title or estimate your whole collection.', color: '#f5a623' },
  { icon: <Heart />, title: 'Wishlist hunts', body: 'Prioritize your grails and move them to the shelf the moment you find them.', color: '#ff4444' },
  { icon: <ScanSearch />, title: 'Find it fast', body: 'Search, filter and sort a collection of thousands in a blink.', color: '#00ff88' },
  { icon: <Barcode />, title: 'Barcode scanning', body: 'Point your phone at a case and it’s on your shelf. Got a stack? Scan them all in a row.', color: '#8a3cff' },
  { icon: <BellRing />, title: 'Price alerts', body: 'Get pinged when a wishlist title drops under your price.', color: '#ff4fa3', soon: true },
]

function Features() {
  return (
    <section aria-labelledby="features-heading">
      <motion.div {...reveal} className="mb-10 max-w-2xl">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-neon-amber">Why ShelfLife</p>
        <h2 id="features-heading" className="font-display text-4xl tracking-[0.08em] text-white sm:text-5xl">
          Built for collectors who dig
        </h2>
      </motion.div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }}>
            <Panel className="group h-full p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15">
              <div
                className="mb-4 grid size-12 place-items-center rounded-xl transition duration-300 group-hover:scale-110 [&>svg]:size-6"
                style={{ color: f.color, backgroundColor: withAlpha(f.color, 0.12), boxShadow: `0 0 24px ${withAlpha(f.color, 0.25)}` }}
              >
                {f.icon}
              </div>
              <h3 className="flex items-center gap-2 font-display text-2xl tracking-[0.08em] text-white">
                {f.title}
                {f.soon && <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[0.65rem] tracking-wider text-zinc-400">SOON</span>}
              </h3>
              <p className="mt-2 text-zinc-400">{f.body}</p>
            </Panel>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Stock the shelf', body: 'Add titles with their format, condition, price and where you found them.' },
    { n: '02', title: 'Know your value', body: 'Check market prices and watch what your collection is worth.' },
    { n: '03', title: 'Hunt smarter', body: 'Keep a prioritized wishlist and check it before you buy.' },
  ]
  return (
    <section aria-labelledby="how-heading">
      <motion.h2 {...reveal} id="how-heading" className="mb-10 font-display text-4xl tracking-[0.08em] text-white sm:text-5xl">
        How it works
      </motion.h2>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div key={s.n} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="relative">
            <span className="font-mono text-6xl text-neon-cyan/20">{s.n}</span>
            <h3 className="-mt-4 font-display text-3xl tracking-[0.08em] text-white">{s.title}</h3>
            <p className="mt-2 text-zinc-400">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <motion.section {...reveal}>
      <Panel accent="#00bfff" className="scanlines relative flex flex-col items-center gap-6 overflow-hidden px-6 py-14 text-center">
        <div className="pointer-events-none absolute -top-24 size-72 rounded-full bg-neon-cyan/20 blur-3xl" />
        <h2 className="relative font-display text-5xl tracking-[0.06em] text-white sm:text-6xl">Your shelf is waiting.</h2>
        <p className="relative max-w-lg text-zinc-300">Set up your collection in minutes. It’s free while we’re in early access.</p>
        <ButtonLink to="/register" size="lg" className="relative" icon={<ArrowRight className="size-5" />}>
          Create your free account
        </ButtonLink>
      </Panel>
    </motion.section>
  )
}
