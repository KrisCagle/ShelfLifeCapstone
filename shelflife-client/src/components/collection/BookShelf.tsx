import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useElementWidth } from '@/hooks/useElementWidth'
import { cn } from '@/lib/cn'
import type { Item } from '@/lib/types'
import { ShelfPlank } from './CaseCard'

// Dark cloth-binding colors, so the pale spine lettering stays readable on all of them.
const BINDINGS = ['#6d2a2a', '#2c4356', '#35503f', '#4d3f66', '#6e5526', '#1f3556', '#463a33', '#7a3048', '#2f4d4d', '#54422a']

const GAP = 3

const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** A spine's look comes from its title, so each book keeps the same one on every visit. */
function spineFor(item: Item) {
  const h = hash(item.title)
  return {
    color: BINDINGS[h % BINDINGS.length],
    width: 38 + ((h >> 4) % 20) + Math.min(Math.floor(item.title.length / 8), 8),
    heightPercent: 84 + ((h >> 9) % 17),
  }
}

const lastName = (creator?: string | null) => creator?.split(',')[0].trim().split(' ').pop() ?? ''

/** Books standing spine-out on wooden shelves. Each shelf fills until the next book won't fit. */
export function BookShelf({ items }: { items: Item[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const shelfHeight = width < 640 ? 200 : 250

  const shelves = useMemo(() => {
    const room = width - 24
    const rows: { item: Item; spine: ReturnType<typeof spineFor> }[][] = [[]]
    let used = 0
    for (const item of items) {
      const spine = spineFor(item)
      if (used + spine.width > room && rows[rows.length - 1].length > 0) {
        rows.push([])
        used = 0
      }
      rows[rows.length - 1].push({ item, spine })
      used += spine.width + GAP
    }
    return rows
  }, [items, width])

  return (
    <div ref={ref} className="space-y-6">
      {width > 0 &&
        shelves.map((row, r) => (
          <div key={r}>
            <div className="flex items-end rounded-t-md bg-black/30 px-3 pt-3 shadow-inner" style={{ height: shelfHeight, gap: GAP }}>
              {row.map(({ item, spine }, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -10 }}
                  transition={{ delay: Math.min(r * 0.04 + i * 0.015, 0.4), duration: 0.25 }}
                  className="shrink-0"
                  style={{ width: spine.width, height: `${spine.heightPercent}%` }}
                >
                  <Link
                    to={`/items/${item.id}`}
                    aria-label={[item.title, item.catalogEntry.creator].filter(Boolean).join(' by ')}
                    title={item.title}
                    className="flex size-full flex-col items-center gap-2 overflow-hidden rounded-t-[3px] border-y-2 border-[#c9a55c]/60 px-0.5 py-2.5 text-[#efe3c8] shadow-[2px_0_5px_rgba(0,0,0,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
                    style={{
                      backgroundColor: spine.color,
                      backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.4), rgba(255,255,255,0.1) 28%, rgba(0,0,0,0.04) 68%, rgba(0,0,0,0.42))',
                    }}
                  >
                    <span className={cn('min-h-0 flex-1 truncate font-display leading-none tracking-wider [writing-mode:vertical-rl]', item.title.length > 18 ? 'text-sm' : 'text-lg')}>{item.title}</span>
                    <span className="max-h-[35%] shrink-0 truncate font-mono text-[0.6rem] uppercase tracking-wider opacity-75 [writing-mode:vertical-rl]">
                      {lastName(item.catalogEntry.creator)}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
            <ShelfPlank />
          </div>
        ))}
    </div>
  )
}
