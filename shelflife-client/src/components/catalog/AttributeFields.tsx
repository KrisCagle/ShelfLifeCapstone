import { useAttributeDefinitions } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { AttributeDefinition, Format, MediaType } from '@/lib/types'
import { Field, Input, Select } from '@/components/ui/Form'

/** Collector details for this format (completeness, pressing, case type…). */
export function useAttributesFor(format?: Format | null): AttributeDefinition[] {
  const { data } = useAttributeDefinitions()
  if (!format || !data) return []
  return (data[format.mediaType] ?? []).filter((d) => !d.formats || d.formats.includes(format.name))
}

interface AttributeFieldsProps {
  format?: Format | null
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function AttributeFields({ format, values, onChange }: AttributeFieldsProps) {
  const definitions = useAttributesFor(format)
  if (definitions.length === 0) return null

  const set = (key: string, value: string) => {
    const next = { ...values }
    if (value) next[key] = value
    else delete next[key]
    onChange(next)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions.map((def) =>
        def.kind === 'Toggle' ? (
          <label key={def.key} className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-white/10 bg-ink-800/60 px-3.5 py-2.5 text-zinc-200 hover:border-white/20">
            <span
              className={cn('relative h-5 w-9 rounded-full transition', values[def.key] === 'true' ? 'bg-neon-cyan shadow-glow-cyan' : 'bg-white/15')}
              aria-hidden
            >
              <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition-all', values[def.key] === 'true' ? 'left-[1.1rem]' : 'left-0.5')} />
            </span>
            <input
              type="checkbox"
              className="sr-only"
              checked={values[def.key] === 'true'}
              onChange={(e) => set(def.key, e.target.checked ? 'true' : '')}
            />
            {def.label}
          </label>
        ) : (
          <Field key={def.key} label={def.label} optional>
            {({ id }) =>
              def.kind === 'Select' ? (
                <Select id={id} value={values[def.key] ?? ''} onChange={(e) => set(def.key, e.target.value)}>
                  <option value="">Not specified</option>
                  {def.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              ) : (
                <Input id={id} value={values[def.key] ?? ''} maxLength={120} placeholder={def.placeholder ?? ''} onChange={(e) => set(def.key, e.target.value)} />
              )
            }
          </Field>
        ),
      )}
    </div>
  )
}

/** Short labels for case-card badges ("Complete in box" → "CIB"). */
const SHORT: Record<string, string> = {
  'Complete in box': 'CIB',
  'New / sealed': 'Sealed',
  'Game + box': 'Boxed',
  'Game + manual': 'w/ Manual',
}

export function cardBadges(
  definitions: Record<MediaType, AttributeDefinition[]> | undefined,
  format: Format | null | undefined,
  values: Record<string, string> | undefined,
) {
  if (!definitions || !format || !values) return []
  return (definitions[format.mediaType] ?? [])
    .filter((d) => d.showOnCard && values[d.key] && (!d.formats || d.formats.includes(format.name)))
    .map((d) => SHORT[values[d.key]] ?? values[d.key])
}

export function useCardBadges(format: Format | null | undefined, values: Record<string, string> | undefined) {
  const { data } = useAttributeDefinitions()
  return cardBadges(data, format, values)
}
