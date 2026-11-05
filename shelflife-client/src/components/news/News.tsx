import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Disc3, Film, Gamepad2, Newspaper, Pin, RefreshCw } from 'lucide-react'
import { useHeadlines, useNewsPosts } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import { asUtc, timeAgo } from '@/lib/format'
import type { Headline, NewsCategory, NewsPost } from '@/lib/types'
import { Panel, Skeleton } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'

const CATEGORY_STYLE: Record<NewsCategory, { color: string; icon: typeof Gamepad2 }> = {
  Games: { color: '#00bfff', icon: Gamepad2 },
  Music: { color: '#f5a623', icon: Disc3 },
  Movies: { color: '#ff4fa3', icon: Film },
}

function CategoryChip({ category }: { category: NewsCategory }) {
  const { color, icon: Icon } = CATEGORY_STYLE[category]
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[0.7rem] uppercase tracking-[0.18em]" style={{ color }}>
      <Icon className="size-3.5" aria-hidden /> {category}
    </span>
  )
}

/** External thumbnail with a tinted fallback when the publisher blocks hotlinking. */
function Thumb({ headline, className }: { headline: Headline; className?: string }) {
  const [failed, setFailed] = useState(false)
  const { color, icon: Icon } = CATEGORY_STYLE[headline.category]
  if (!headline.imageUrl || failed)
    return (
      <div
        className={cn('grid place-items-center', className)}
        style={{ background: `radial-gradient(circle at 30% 20%, ${color}33, #0b0b18 70%)` }}
      >
        <Icon className="size-10 opacity-60" style={{ color }} aria-hidden />
      </div>
    )
  return (
    <img
      src={headline.imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('object-cover', className)}
    />
  )
}

/** Scrolling LED ticker of the latest headlines. Pauses on hover. */
export function NewsTicker() {
  const { data } = useHeadlines(undefined, 14)
  if (!data?.length) return null
  const loop = [...data, ...data]
  return (
    <div className="group relative overflow-hidden border-y border-neon-amber/20 bg-black/60 py-2.5 backdrop-blur">
      <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 bg-gradient-to-r from-black via-black to-transparent pl-4 pr-10">
        <span className="size-2 animate-pulse rounded-full bg-neon-red shadow-glow-red" />
        <span className="font-display text-lg tracking-[0.2em] text-neon-amber text-glow-amber">Live</span>
      </div>
      <div className="flex w-max animate-marquee gap-12 pl-32 group-hover:[animation-play-state:paused]">
        {loop.map((h, i) => (
          <a
            key={`${h.url}-${i}`}
            href={h.url}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap font-mono text-sm tracking-wide text-neon-amber/80 transition hover:text-neon-amber"
            tabIndex={i >= data.length ? -1 : undefined}
          >
            <span className="text-zinc-500">{h.source.toUpperCase()} //</span> {h.title}
          </a>
        ))}
      </div>
    </div>
  )
}

function FeaturedHeadline({ headline }: { headline: Headline }) {
  return (
    <a
      href={headline.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass group relative flex min-h-[22rem] flex-col justify-end overflow-hidden rounded-2xl"
    >
      <Thumb headline={headline} className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/25" />
      <div className="relative space-y-3 p-6">
        <div className="flex items-center gap-3">
          <CategoryChip category={headline.category} />
          <span className="font-mono text-xs text-zinc-400">{timeAgo(headline.publishedAt)}</span>
        </div>
        <h3 className="font-display text-3xl leading-none tracking-[0.06em] text-white sm:text-4xl">{headline.title}</h3>
        {headline.summary && <p className="line-clamp-2 max-w-xl text-zinc-300">{headline.summary}</p>}
        <p className="inline-flex items-center gap-1 font-mono text-sm text-neon-cyan">
          Read on {headline.source} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </p>
      </div>
    </a>
  )
}

function HeadlineCard({ headline }: { headline: Headline }) {
  return (
    <a
      href={headline.url}
      target="_blank"
      rel="noopener noreferrer"
      className="glass group flex gap-4 rounded-xl p-3 transition hover:border-white/15 hover:bg-ink-800/80"
    >
      <Thumb headline={headline} className="size-20 shrink-0 rounded-lg sm:size-24" />
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <CategoryChip category={headline.category} />
          <span className="font-mono text-[0.7rem] text-zinc-500">{timeAgo(headline.publishedAt)}</span>
        </div>
        <h3 className="line-clamp-2 font-semibold leading-snug text-zinc-100 transition group-hover:text-neon-cyan">{headline.title}</h3>
        <p className="font-mono text-xs text-zinc-500">{headline.source}</p>
      </div>
    </a>
  )
}

export function PostCard({ post }: { post: NewsPost }) {
  const body = (
    <Panel accent="#00ff88" className="flex h-full flex-col gap-3 p-5 sm:flex-row sm:items-start">
      {post.imageUrl && <img src={post.imageUrl} alt="" className="h-36 w-full rounded-lg object-cover sm:h-28 sm:w-40" />}
      <div className="space-y-2">
        <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-neon-green">
          {post.isPinned && <Pin className="size-3.5" aria-label="Pinned" />}
          From ShelfLife
          <span className="normal-case tracking-normal text-zinc-500">{timeAgo(asUtc(post.publishedAt))}</span>
        </div>
        <h3 className="font-display text-2xl tracking-[0.08em] text-white">{post.title}</h3>
        <p className="whitespace-pre-line text-zinc-300">{post.body}</p>
        {post.linkUrl && (
          <span className="inline-flex items-center gap-1 font-mono text-sm text-neon-green">
            Learn more <ArrowUpRight className="size-4" />
          </span>
        )}
      </div>
    </Panel>
  )
  return post.linkUrl ? (
    <a href={post.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
      {body}
    </a>
  ) : (
    body
  )
}

const TABS: (NewsCategory | 'All')[] = ['All', 'Games', 'Music', 'Movies']

export function NewsSection() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const category = tab === 'All' ? undefined : tab
  const { data: headlines, isLoading, isError, refetch, isFetching } = useHeadlines(category, 9)
  const { data: posts } = useNewsPosts()
  // Lead with the newest story that has art; fall back to the newest overall.
  const featured = headlines?.slice(0, 6).find((h) => h.imageUrl) ?? headlines?.[0]

  return (
    <section aria-labelledby="news-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-neon-amber">Collector news</p>
          <h2 id="news-heading" className="font-display text-4xl tracking-[0.08em] text-white sm:text-5xl">
            On the shelf this week
          </h2>
        </div>
        <div role="tablist" aria-label="News category" className="glass flex rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('relative rounded-lg px-4 py-1.5 font-display text-lg tracking-[0.12em] transition-colors', tab === t ? 'text-ink-900' : 'text-zinc-400 hover:text-white')}
            >
              {tab === t && <motion.span layoutId="news-tab" className="absolute inset-0 rounded-lg bg-neon-cyan shadow-glow-cyan" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {posts && posts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.slice(0, 2).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="min-h-[22rem] rounded-2xl" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError || !headlines?.length ? (
        <Panel className="flex flex-col items-center gap-3 p-10 text-center">
          <Newspaper className="size-8 text-zinc-500" />
          <p className="text-zinc-400">The news wire is quiet right now.</p>
          <Button variant="subtle" size="sm" icon={<RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />} onClick={() => refetch()}>
            Try again
          </Button>
        </Panel>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 lg:grid-cols-2"
          >
            <FeaturedHeadline headline={featured!} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {headlines
                .filter((h) => h !== featured)
                .slice(0, 5)
                .map((h) => (
                  <HeadlineCard key={h.url} headline={h} />
                ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  )
}
