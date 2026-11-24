import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CameraOff, Check, ChevronLeft, ImageUp, Loader2, SkipForward, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { keys, useItems } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import { captureFrame, setItemPhoto, uploadBlob, uploadPhoto } from '@/lib/photo'
import { collectionPath, MEDIA_TYPES, platformColor, platformMedia, separateCollection } from '@/lib/platforms'
import type { Item, MediaType } from '@/lib/types'
import { PlatformBadge } from '@/components/ui/Misc'
import { ButtonLink } from '@/components/ui/Button'

type CameraStatus = 'starting' | 'live' | 'denied' | 'unavailable'

/** Records and CDs are square sleeves; everything else is a tall case or cover. */
const ratioFor = (format?: string | null) => (format && platformMedia(format) === 'Music' ? 1 : 5 / 7)

function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus>('starting')

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('unavailable')
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        setStatus('live')
      } catch (error) {
        const name = (error as DOMException)?.name
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    }
    start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { videoRef, status }
}

/**
 * Cover session: walks through every title on a shelf that has no photo yet. Line the case
 * up in the outline, tap once, and the next title appears while the last one uploads.
 * The outline is the case's shape, so every cover on the shelf comes out framed the same.
 */
export default function CoverSessionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const media = MEDIA_TYPES.find((m) => m === params.get('media')) ?? null
  const home = collectionPath(media)
  const { data: items } = useItems()
  const { videoRef, status } = useCamera()
  const frameRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [area, setArea] = useState({ width: 0, height: 0 })
  const [capturing, setCapturing] = useState(false)

  // The outline is as big as the space allows at the case's shape, worked out in pixels:
  // a percentage height doesn't resolve reliably inside this layout.
  useEffect(() => {
    const element = areaRef.current
    if (!element) return
    const first = element.getBoundingClientRect()
    setArea({ width: first.width, height: first.height })
    const observer = new ResizeObserver(([entry]) => setArea({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Fixed when the session starts, so titles don't jump around as photos save.
  const [queue, setQueue] = useState<Item[] | null>(null)
  const [index, setIndex] = useState(0)
  const [saved, setSaved] = useState(0)
  const [saving, setSaving] = useState(0)
  const [lastShot, setLastShot] = useState<string | null>(null)
  const [flash, setFlash] = useState(0)

  useEffect(() => {
    if (!items || queue) return
    const onShelf = (i: Item) => (media ? i.format?.mediaType === media : !separateCollection(i.format?.mediaType as MediaType))
    setQueue(
      items
        .filter((i) => !i.photoUrl && onShelf(i))
        // Grouped by format, the order a shelf is usually sorted in.
        .sort((a, b) => (a.format?.name ?? '').localeCompare(b.format?.name ?? '') || a.title.localeCompare(b.title)),
    )
  }, [items, queue, media])

  // Photos show up on the shelf when you leave, whichever way you leave.
  useEffect(() => () => void queryClient.invalidateQueries({ queryKey: keys.items }), [queryClient])

  const current = queue?.[index]
  const finished = queue != null && index >= queue.length

  /** Saves in the background; a failure puts the title back at the end of the line. */
  const save = useCallback(
    (item: Item, upload: () => Promise<string>) => {
      setSaving((n) => n + 1)
      upload()
        .then((url) => setItemPhoto(item.id, url))
        .then(() => setSaved((n) => n + 1))
        .catch(() => {
          toast.error(`Couldn’t save the photo for “${item.title}”. It’s back at the end of the line.`)
          setQueue((q) => (q ? [...q, item] : q))
        })
        .finally(() => setSaving((n) => n - 1))
    },
    [],
  )

  const shoot = useCallback(async () => {
    const video = videoRef.current
    if (!current || capturing || status !== 'live' || !video || !frameRef.current) return
    // A camera that's still starting can report a tiny frame; never save that as a cover.
    if (video.videoWidth < 320 || video.videoHeight < 240) return toast('The camera is still warming up. Try again in a second.')
    const shotIndex = index
    setCapturing(true)
    let blob: Blob
    try {
      blob = await captureFrame(video, frameRef.current)
    } catch {
      setCapturing(false)
      return toast.error('Couldn’t capture that shot. Try again.')
    }
    navigator.vibrate?.(40)
    setFlash((n) => n + 1)
    setLastShot((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(blob)
    })
    setIndex(shotIndex + 1)
    setCapturing(false)
    save(current, () => uploadBlob(blob))
  }, [current, capturing, index, status, videoRef, save])

  const fromGallery = (file: File | undefined) => {
    if (!file || !current) return
    setIndex((i) => i + 1)
    save(current, () => uploadPhoto(file))
  }

  // Space or Enter takes the shot, arrows go back and skip: handy with a laptop webcam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        shoot()
      } else if (e.key === 'ArrowRight' && !capturing) setIndex((i) => i + 1)
      else if (e.key === 'ArrowLeft' && !capturing) setIndex((i) => Math.max(0, i - 1))
      else if (e.key === 'Escape') navigate(home)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shoot, navigate, home, capturing])

  const ratio = ratioFor(current?.format?.name)
  const outlineWidth = Math.min(area.width, area.height * ratio)
  const outline = { width: outlineWidth, height: outlineWidth / ratio }
  const color = platformColor(current?.format?.name)
  const remaining = queue ? Math.max(0, queue.length - index) : 0
  const cameraProblem = status === 'denied' || status === 'unavailable'
  const progress = useMemo(() => (queue?.length ? Math.min(1, index / queue.length) : 0), [index, queue])

  // Rendered at the top of the page: the page-transition wrapper is animated, and an
  // animated parent would trap a full-screen layer inside its own box.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Top: what to grab next */}
      <div className="relative z-10 flex items-start gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link to={home} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="End the cover session">
          <X className="size-5" />
        </Link>
        <div className="min-w-0 flex-1" aria-live="polite">
          {current ? (
            <>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-zinc-400">Grab this one</p>
              <p className="truncate font-display text-2xl leading-tight tracking-[0.06em]">{current.title}</p>
              <PlatformBadge name={current.format?.name} />
            </>
          ) : (
            <p className="pt-2 font-display text-2xl tracking-[0.06em]">Cover session</p>
          )}
        </div>
        {saving > 0 && (
          <span className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-xs text-zinc-300">
            <Loader2 className="size-3 animate-spin" /> Saving {saving}
          </span>
        )}
      </div>
      <div className="h-1 bg-white/10">
        <motion.div className="h-full bg-neon-cyan shadow-glow-cyan" animate={{ width: `${progress * 100}%` }} />
      </div>

      {/* Middle: the camera, with the case outline */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className={cn('absolute inset-0 size-full object-cover', status !== 'live' && 'opacity-0')} />
        <div ref={areaRef} className="absolute inset-6 flex items-center justify-center">
          {current && outline.width > 0 && (
            <div
              ref={frameRef}
              className="rounded-lg border-2 transition-[width,height] duration-300"
              style={{ width: outline.width, height: outline.height, borderColor: color, boxShadow: `0 0 0 9999px rgba(0,0,0,0.55), 0 0 24px ${color}` }}
            />
          )}
        </div>
        <AnimatePresence>
          {flash > 0 && (
            <motion.div key={flash} className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.7 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />
          )}
        </AnimatePresence>

        {cameraProblem && !finished && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div className="max-w-xs space-y-3">
              <CameraOff className="mx-auto size-10 text-zinc-500" />
              <p className="text-zinc-300">
                {status === 'denied' ? 'Camera access is blocked. Allow it in your browser settings, or pick each photo from your gallery.' : 'No camera here. You can still pick each photo from your gallery.'}
              </p>
            </div>
          </div>
        )}

        {finished && (
          <div className="absolute inset-0 grid place-items-center bg-black/80 p-8 text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-xs space-y-4">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-neon-green/15 text-neon-green">
                <Check className="size-8" />
              </span>
              <p className="font-display text-3xl tracking-[0.08em]">{queue!.length === 0 ? 'Every cover’s done' : 'Shelf’s done'}</p>
              <p className="text-zinc-400">
                {queue!.length === 0
                  ? 'Everything on this shelf already has a photo.'
                  : `${saved} ${saved === 1 ? 'cover' : 'covers'} saved${saving > 0 ? `, ${saving} still uploading` : ''}. Skipped titles will be here next time.`}
              </p>
              <ButtonLink to={home} size="lg">
                See your shelf
              </ButtonLink>
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom: back, shutter, skip */}
      {!finished && (
        <div className="relative z-10 space-y-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0 || capturing}
              className="flex w-20 flex-col items-center gap-1 text-zinc-400 disabled:opacity-30"
              aria-label="Back to the previous title, to retake it"
            >
              {lastShot && index > 0 ? (
                <img src={lastShot} alt="" className="size-12 rounded-md object-cover ring-1 ring-white/30" />
              ) : (
                <ChevronLeft className="size-7" />
              )}
              <span className="font-mono text-[0.65rem] uppercase">Retake</span>
            </button>

            {cameraProblem ? (
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={!current}
                className="grid size-20 place-items-center rounded-full bg-neon-cyan text-ink-900 shadow-glow-cyan"
                aria-label={current ? `Pick a photo of ${current.title}` : 'Pick a photo'}
              >
                <ImageUp className="size-8" />
              </button>
            ) : (
              <button
                type="button"
                onClick={shoot}
                disabled={status !== 'live' || !current || capturing}
                className="grid size-20 place-items-center rounded-full border-4 border-white/90 transition active:scale-90 disabled:opacity-40"
                aria-label={current ? `Take the cover photo for ${current.title}` : 'Take photo'}
              >
                <span className="size-14 rounded-full bg-white" />
              </button>
            )}

            <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={capturing} className="flex w-20 flex-col items-center gap-1 text-zinc-400 disabled:opacity-30" aria-label="Skip this title for now">
              <SkipForward className="size-7" />
              <span className="font-mono text-[0.65rem] uppercase">Skip</span>
            </button>
          </div>
          <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
            <span>{queue ? `${remaining} to go` : 'Loading your shelf…'}</span>
            {!cameraProblem && (
              <button type="button" onClick={() => galleryRef.current?.click()} disabled={!current} className="inline-flex items-center gap-1 hover:text-white">
                <ImageUp className="size-3.5" /> Use a saved photo
              </button>
            )}
          </div>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              fromGallery(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>,
    document.body,
  )
}
