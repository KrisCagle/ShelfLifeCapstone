import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Flashlight, ImageUp, Keyboard, X } from 'lucide-react'
import { BarcodeDetector as BarcodeDetectorPonyfill, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { cn } from '@/lib/cn'

// Serve the decoder from our own bundle instead of a third-party CDN.
prepareZXingModule({
  overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
})

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>
}

// Use the browser's own detector when it has one (Android Chrome, macOS Safari);
// otherwise the WebAssembly build of ZXing.
async function createDetector(): Promise<Detector> {
  const Native = (window as unknown as { BarcodeDetector?: { new (o: object): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats()
      if (FORMATS.every((f) => supported.includes(f))) return new Native({ formats: FORMATS })
    } catch {
      // Fall through to the ponyfill.
    }
  }
  return new BarcodeDetectorPonyfill({ formats: FORMATS as never })
}

/** US products often read as EAN-13 with a leading 0; databases mostly store the 12-digit UPC. */
/** Older books print a 10-character ISBN, which can end in X. Lookups all use ISBN-13. */
function isbn10To13(isbn: string) {
  const check = [...isbn].reduce((sum, c, i) => sum + (c === 'X' ? 10 : Number(c)) * (10 - i), 0)
  if (check % 11 !== 0) return null
  const core = `978${isbn.slice(0, 9)}`
  const total = [...core].reduce((sum, c, i) => sum + Number(c) * (i % 2 ? 3 : 1), 0)
  return `${core}${(10 - (total % 10)) % 10}`
}

export const normalizeBarcode = (raw: string) => {
  const compact = raw.replace(/[\s-]/g, '').toUpperCase()
  if (/^\d{9}[\dX]$/.test(compact)) return isbn10To13(compact) ?? compact
  const digits = raw.replace(/\D/g, '')
  return digits.length === 13 && digits.startsWith('0') ? digits.slice(1) : digits
}

type Status = 'starting' | 'scanning' | 'denied' | 'unavailable' | 'insecure'

interface BarcodeScannerProps {
  open: boolean
  onClose: () => void
  onDetected: (barcode: string) => void
  /** Keep scanning after each read, and read every barcode in a photo. */
  continuous?: boolean
  title?: string
  /** Shown above the controls, e.g. the running list of a batch. */
  children?: ReactNode
}

/** A short tick, so a batch can be scanned without watching the screen. */
function beep() {
  try {
    const audio = new AudioContext()
    const tone = audio.createOscillator()
    const volume = audio.createGain()
    volume.gain.value = 0.06
    tone.frequency.value = 1500
    tone.connect(volume).connect(audio.destination)
    tone.onended = () => audio.close()
    tone.start()
    tone.stop(audio.currentTime + 0.08)
  } catch {
    // No audio available; the flash and vibration still confirm the read.
  }
}

export default function BarcodeScanner({ open, onClose, onDetected, continuous = false, title = 'Scan a barcode', children }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<Detector | null>(null)
  const [status, setStatus] = useState<Status>('starting')
  const [torch, setTorch] = useState<boolean | null>(null)
  const [manual, setManual] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [flash, setFlash] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // Held in a ref so a parent re-render (a batch list growing) can't restart the camera.
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const finish = useCallback(
    (raw: string) => {
      const code = normalizeBarcode(raw)
      if (code.length < 8) return
      navigator.vibrate?.(60)
      setFlash(true)
      if (continuous) {
        beep()
        onDetectedRef.current(code)
        window.setTimeout(() => setFlash(false), 250)
      } else {
        window.setTimeout(() => onDetectedRef.current(code), 180)
      }
    },
    [continuous],
  )

  // Camera + detection loop. A code must read the same twice in a row to count,
  // which filters out partial reads while the camera is still focusing.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    let timer = 0
    let last = ''
    let accepted = ''

    const start = async () => {
      if (!window.isSecureContext) return setStatus('insecure')
      if (!navigator.mediaDevices?.getUserMedia) return setStatus('unavailable')
      try {
        detectorRef.current ??= await createDetector()
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        const capabilities = (track.getCapabilities?.() ?? {}) as { torch?: boolean }
        setTorch(capabilities.torch ? false : null)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setStatus('scanning')

        const tick = async () => {
          if (cancelled) return
          const video = videoRef.current
          if (video && video.readyState >= 2 && detectorRef.current) {
            try {
              const [hit] = await detectorRef.current.detect(video)
              if (hit?.rawValue) {
                if (hit.rawValue === last) {
                  if (!continuous) return finish(hit.rawValue)
                  // Ignore the code still in frame; give time to move to the next item.
                  if (hit.rawValue !== accepted) {
                    accepted = hit.rawValue
                    finish(hit.rawValue)
                    timer = window.setTimeout(tick, 900)
                    return
                  }
                }
                last = hit.rawValue
              }
            } catch {
              // A frame that fails to decode is normal; keep going.
            }
          }
          timer = window.setTimeout(tick, 180)
        }
        tick()
      } catch (error) {
        const name = (error as DOMException)?.name
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    }
    start()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, finish, continuous])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track || torch === null) return
    await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }).catch(() => undefined)
    setTorch(!torch)
  }

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError('')
    try {
      detectorRef.current ??= await createDetector()
      const hits = await detectorRef.current.detect(await createImageBitmap(file))
      const codes = [...new Set(hits.map((h) => h.rawValue).filter(Boolean))]
      if (codes.length === 0) setPhotoError('No barcode found in that photo. Try a closer, sharper shot.')
      else if (continuous) codes.forEach(finish)
      else finish(codes[0])
    } catch {
      setPhotoError('Couldn’t read that image.')
    }
  }

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const code = normalizeBarcode(manual)
    if (code.length >= 8 && code.length <= 14) {
      finish(code)
      setManual('')
    }
  }

  const message: Record<Exclude<Status, 'scanning'>, string> = {
    starting: 'Starting camera…',
    denied: 'Camera access was blocked. Allow it in your browser settings, or enter the number below.',
    unavailable: 'No camera available here. Upload a photo of the barcode or type the number.',
    insecure: 'The camera needs a secure (https) connection. Upload a photo or type the number instead.',
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Scan a barcode"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-display text-2xl tracking-[0.15em] text-white">{title}</p>
            <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Close scanner">
              <X className="size-5" />
            </button>
          </div>

          <div className="relative mx-auto flex w-full max-w-2xl flex-1 items-center justify-center overflow-hidden">
            <video ref={videoRef} playsInline muted className={cn('absolute inset-0 size-full object-cover', status !== 'scanning' && 'opacity-0')} />
            {status === 'scanning' ? (
              <div className="relative h-40 w-[82%] max-w-md">
                {/* Reticle: dimmed surround, neon corners and a sweeping laser line */}
                <div className="absolute inset-0 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
                {['left-0 top-0 border-l-4 border-t-4 rounded-tl-xl', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map((c) => (
                  <span key={c} className={cn('absolute size-8 border-neon-cyan drop-shadow-[0_0_8px_#00bfff]', c)} />
                ))}
                <motion.div
                  className="absolute inset-x-3 h-0.5 rounded-full bg-neon-red shadow-[0_0_14px_3px_rgba(255,68,68,0.8)]"
                  animate={{ top: ['12%', '88%', '12%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <AnimatePresence>{flash && <motion.div className="absolute inset-0 rounded-xl bg-neon-green/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}</AnimatePresence>
              </div>
            ) : (
              <div className="max-w-sm px-6 text-center">
                <Camera className="mx-auto mb-3 size-10 text-zinc-500" />
                <p className="text-zinc-300">{message[status]}</p>
              </div>
            )}
          </div>

          <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-6 pt-4">
            {children}
            {status === 'scanning' && !continuous && <p className="text-center text-sm text-zinc-400">Line the barcode up inside the frame. It’ll read on its own.</p>}
            <div className="flex flex-wrap justify-center gap-2">
              {torch !== null && (
                <button onClick={toggleTorch} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 font-display tracking-wider', torch ? 'bg-neon-amber text-ink-900' : 'bg-white/10 text-white')}>
                  <Flashlight className="size-4" /> Light
                </button>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-display tracking-wider text-white hover:bg-white/20">
                <ImageUp className="size-4" /> Photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    fromPhoto(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </label>
              <button onClick={() => setShowManual((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-display tracking-wider text-white hover:bg-white/20">
                <Keyboard className="size-4" /> Type it
              </button>
            </div>
            {photoError && <p className="text-center text-sm text-neon-red">{photoError}</p>}
            {(showManual || status === 'denied' || status === 'unavailable' || status === 'insecure') && (
              <form onSubmit={submitManual} className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                  placeholder="Barcode or ISBN"
                  aria-label="Barcode number"
                  className="h-11 flex-1 rounded-lg border border-white/15 bg-ink-800 px-3 font-mono text-lg tracking-widest text-white placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-zinc-500 focus:border-neon-cyan focus:outline-none"
                />
                <button type="submit" disabled={normalizeBarcode(manual).length < 8} className="rounded-lg bg-neon-cyan px-4 font-display tracking-wider text-ink-900 disabled:opacity-40">
                  Look up
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
