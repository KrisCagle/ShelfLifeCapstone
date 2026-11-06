import { useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { uploadPhoto } from '@/lib/photo'

interface PhotoPickerProps {
  value: string | null
  onChange: (url: string | null) => void
  /** A single text button, for tight spaces like a haul row. */
  compact?: boolean
  /** Names the item for screen readers when several pickers share a page. */
  label?: string
}

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

  // Leaving off `capture` lets phones offer both the camera and the gallery.
  const input = (
    <input
      type="file"
      accept="image/*"
      className="sr-only"
      disabled={busy}
      aria-label={label ?? 'Take or choose a photo'}
      onChange={(e) => {
        choose(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )
  const icon = busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />

  if (compact)
    return (
      <>
        <label className={cn('inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-neon-cyan hover:underline focus-within:underline', busy && 'opacity-60')}>
          {icon} {busy ? 'Uploading…' : value ? 'Change photo' : 'Add photo'}
          {input}
        </label>
        {error && <span className="font-mono text-xs text-neon-red">{error}</span>}
      </>
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value && <img src={value} alt="Your copy" referrerPolicy="no-referrer" className="size-20 rounded-lg object-cover ring-1 ring-white/10" />}
        <div className="flex flex-wrap gap-2">
          <label className={cn('inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-neon-cyan/40 px-3.5 py-2 font-mono text-sm text-neon-cyan transition hover:bg-neon-cyan/10 focus-within:ring-2 focus-within:ring-neon-cyan', busy && 'opacity-60')}>
            {icon} {busy ? 'Uploading…' : value ? 'Change photo' : 'Take or choose a photo'}
            {input}
          </label>
          {value && (
            <button type="button" onClick={() => onChange(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 font-mono text-sm text-zinc-400 transition hover:bg-neon-red/10 hover:text-neon-red">
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
