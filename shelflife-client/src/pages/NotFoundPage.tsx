import { motion } from 'motion/react'
import { Home, Rewind } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ rotate: -8, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="glass scanlines relative mb-8 w-72 rounded-xl p-5"
      >
        {/* A VHS tape, with its label */}
        <div className="flex items-center justify-between gap-4 rounded-md bg-ink-950 p-4">
          <div className="grid size-16 place-items-center rounded-full border-4 border-zinc-700">
            <div className="size-6 animate-spin rounded-full border-2 border-dashed border-zinc-500 [animation-duration:3s]" />
          </div>
          <div className="h-10 flex-1 rounded bg-zinc-800" />
          <div className="grid size-16 place-items-center rounded-full border-4 border-zinc-700">
            <div className="size-6 animate-spin rounded-full border-2 border-dashed border-zinc-500 [animation-duration:3s]" />
          </div>
        </div>
        <p className="mt-3 rounded bg-white/90 px-2 py-1 font-mono text-sm text-ink-900">ERROR 404 · SP · T-120</p>
      </motion.div>
      <h1 className="font-display text-6xl tracking-[0.06em] text-white">
        Be kind, <span className="text-neon-cyan text-glow-cyan">rewind.</span>
      </h1>
      <p className="mt-3 text-zinc-400">This tape is blank. The page you’re looking for isn’t on any shelf.</p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/" icon={<Home className="size-4" />}>
          Home
        </ButtonLink>
        <button onClick={() => history.back()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 font-display tracking-[0.12em] text-zinc-300 hover:bg-white/5">
          <Rewind className="size-4" /> Go back
        </button>
      </div>
    </div>
  )
}
