import { MEDIA_TYPES } from '@/lib/platforms'
import type { Format } from '@/lib/types'

/** Options for a format <select>, grouped by media type and sorted within each group. */
export function FormatOptions({ formats }: { formats?: Format[] }) {
  return (
    <>
      {MEDIA_TYPES.map((media) => (
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
