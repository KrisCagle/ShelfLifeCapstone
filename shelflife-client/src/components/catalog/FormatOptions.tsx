import { MEDIA_TYPES } from '@/lib/platforms'
import type { Format, MediaType } from '@/lib/types'

/** Options for a format <select>, grouped by media type and sorted within each group. */
export function FormatOptions({ formats, only }: { formats?: Format[]; only?: MediaType[] }) {
  const groups = MEDIA_TYPES.filter((media) => !only || only.includes(media))
  const options = (media: MediaType) =>
    (formats ?? [])
      .filter((f) => f.mediaType === media)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))

  if (groups.length === 1) return <>{options(groups[0])}</>
  return (
    <>
      {groups.map((media) => (
        <optgroup key={media} label={media}>
          {options(media)}
        </optgroup>
      ))}
    </>
  )
}
