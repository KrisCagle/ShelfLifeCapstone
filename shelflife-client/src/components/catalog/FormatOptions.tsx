import type { Format, MediaType } from '@/lib/types'

const MEDIA_ORDER: MediaType[] = ['Games', 'Music', 'Movies']

/** Options for a format <select>, grouped by media type and sorted within each group. */
export function FormatOptions({ formats }: { formats?: Format[] }) {
  return (
    <>
      {MEDIA_ORDER.map((media) => (
        <optgroup key={media} label={media}>
          {(formats ?? [])
            .filter((f) => f.mediaType === media)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
            .map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  )
}
