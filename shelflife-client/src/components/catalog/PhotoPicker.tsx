import { useState } from 'react'
import { Camera, ImageUp, Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { uploadPhoto } from '@/lib/photo'

interface PhotoPickerProps {
  value: string | null
  onChange: (url: string | null) => void
  /** Small text links, for tight spaces like a haul row. */
  compact?: boolean
  /** Names the item for screen readers when several pickers share a page. */
  label?: string
}

/**
 * Two buttons, not one. A single file input lets the phone choose what to offer, and newer
 * Android versions open only the photo gallery for it, with no camera. `capture` asks for
 * the camera directly, so "Take photo" always opens it; "Choose photo" leaves it off for
 * the gallery. On a computer, both open the file picker.
 */
export function PhotoPicker({ value, onChange, compact = false, label }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await uploadPhoto(file))
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? 'That’s a lot of photos. Try again in a while.' : err instanceof Error ? err.message : 'Couldn’t upload that photo.')
    } finally {
      setBusy(false)
    }
  }

  const input = (camera: boolean) => (
    <input
      type="file"
      accept="image/*"
      capture={camera ? 'environment' : undefined}
      className="sr-only"
      disabled={busy}
      aria-label={camera ? `Take a photo${label ? ` of ${label}` : ''}` : `Choose a photo${label ? ` of ${label}` : ''}`}
      onChange={(e) => {
        choose(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  if (compact)
    return (
      <>
        {busy ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs text-neon-cyan">
            <Loader2 className="size-3.5 animate-spin" /> Uploading…
          </span>
        ) : (
          <>
            <label className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-neon-cyan hover:underline focus-within:underline">
              <Camera className="size-3.5" /> {value ? 'Retake' : 'Take photo'}
              {input(true)}
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-zinc-400 hover:text-neon-cyan hover:underline focus-within:underline">
              <ImageUp className="size-3.5" /> Choose
              {input(false)}
            </label>
          </>
        )}
        {error && <span className="font-mono text-xs text-neon-red">{error}</span>}
      </>
    )

  const button = 'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 font-mono text-sm transition focus-within:ring-2 focus-within:ring-neon-cyan'
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value && <img src={value} alt="Your copy" referrerPolicy="no-referrer" className="size-20 rounded-lg object-cover ring-1 ring-white/10" />}
        <div className="flex flex-wrap gap-2">
          {busy ? (
            <span className={cn(button, 'border border-neon-cyan/40 text-neon-cyan opacity-60')}>
              <Loader2 className="size-3.5 animate-spin" /> Uploading…
            </span>
          ) : (
            <>
              <label className={cn(button, 'border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10')}>
                <Camera className="size-3.5" /> {value ? 'Retake' : 'Take photo'}
                {input(true)}
              </label>
              <label className={cn(button, 'text-zinc-300 ring-1 ring-white/10 hover:text-white hover:ring-white/25')}>
                <ImageUp className="size-3.5" /> Choose photo
                {input(false)}
              </label>
            </>
          )}
          {value && !busy && (
            <button type="button" onClick={() => onChange(null)} className={cn(button, 'text-zinc-400 hover:bg-neon-red/10 hover:text-neon-red')}>
              <Trash2 className="size-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-neon-red">
          {error}
        </p>
      )}
    </div>
  )
}
