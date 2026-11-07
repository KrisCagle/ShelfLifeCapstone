import type { MediaType } from './types'

/** Every kind of thing people collect, in display order. */
export const MEDIA_TYPES: MediaType[] = ['Games', 'Music', 'Movies', 'Books', 'Comics']

/** Share the main shelf, with a tab each. */
export const MAIN_MEDIA: MediaType[] = ['Games', 'Music', 'Movies']

/** Collections with a page and shelf of their own under Collection. */
export const SEPARATE_COLLECTIONS: { media: MediaType; path: string; noun: string }[] = [
  { media: 'Books', path: '/collection/books', noun: 'book' },
  { media: 'Comics', path: '/collection/comics', noun: 'comic' },
]

export const separateCollection = (media?: MediaType | null) => SEPARATE_COLLECTIONS.find((c) => c.media === media)

/** The page a title lives on. */
export const collectionPath = (media?: MediaType | null) => separateCollection(media)?.path ?? '/collection'

/** Which formats make sense for a title, from where it came from. Undefined means any. */
export function mediaForTitle(source?: string | null, barcode?: string | null): MediaType[] | undefined {
  if (source === 'openlibrary') return ['Books']
  if (source === 'gcd') return ['Comics']
  return barcode && /^97[89]\d{10}$/.test(barcode) ? ['Books', 'Comics'] : undefined
}

interface PlatformStyle {
  color: string
  short?: string
  media: MediaType
}

// Brand colors carried over from the original shelf cards.
const PLATFORMS: Record<string, PlatformStyle> = {
  VHS: { color: '#01ccff', media: 'Movies' },
  CD: { color: '#c9b52b', media: 'Music' },
  Vinyl: { color: '#e9e50e', media: 'Music' },
  NES: { color: '#8fae0c', media: 'Games' },
  SNES: { color: '#f28304', media: 'Games' },
  N64: { color: '#e01b1b', media: 'Games' },
  PS1: { color: '#ff00f7', media: 'Games' },
  PS2: { color: '#2f5bff', media: 'Games' },
  GameBoy: { color: '#00a37a', short: 'GB', media: 'Games' },
  'GameBoy Advance': { color: '#00a37a', short: 'GBA', media: 'Games' },
  GameCube: { color: '#8a3cff', short: 'GCN', media: 'Games' },
  'Sega Genesis': { color: '#1f6fd6', short: 'Genesis', media: 'Games' },
  'Nintendo Switch': { color: '#e60012', short: 'Switch', media: 'Games' },
  'Nintendo Switch 2': { color: '#ff3b47', short: 'Switch 2', media: 'Games' },
  PS3: { color: '#7f8cff', media: 'Games' },
  PS4: { color: '#2f8fe0', media: 'Games' },
  PS5: { color: '#dbe6ff', media: 'Games' },
  'Xbox 360': { color: '#8cc63f', short: 'X360', media: 'Games' },
  'Xbox One': { color: '#2ca02c', short: 'XB1', media: 'Games' },
  'Xbox Series X|S': { color: '#16c60c', short: 'Series X|S', media: 'Games' },
  Wii: { color: '#b8c7d9', media: 'Games' },
  'Wii U': { color: '#00a6d6', media: 'Games' },
  'Nintendo DS': { color: '#9aa4b1', short: 'DS', media: 'Games' },
  'Nintendo 3DS': { color: '#d6324a', short: '3DS', media: 'Games' },
  DVD: { color: '#c77dff', media: 'Movies' },
  'Blu-ray': { color: '#2aa7e6', media: 'Movies' },
  '4K Ultra HD': { color: '#ffcc33', short: '4K', media: 'Movies' },
  Cassette: { color: '#ff8a65', media: 'Music' },
  Hardcover: { color: '#d4a373', media: 'Books' },
  Paperback: { color: '#e9c46a', media: 'Books' },
  'Mass Market Paperback': { color: '#f4a261', short: 'Mass Market', media: 'Books' },
  Manga: { color: '#ff5c8a', media: 'Books' },
  'Single Issue': { color: '#ff3d3d', short: 'Issue', media: 'Comics' },
  'Trade Paperback': { color: '#ffb703', short: 'TPB', media: 'Comics' },
  'Graphic Novel': { color: '#fb5607', short: 'GN', media: 'Comics' },
  Omnibus: { color: '#3a86ff', media: 'Comics' },
}

const FALLBACK: PlatformStyle = { color: '#00bfff', media: 'Games' }

export const platformStyle = (name?: string | null) => (name && PLATFORMS[name]) || FALLBACK
export const platformColor = (name?: string | null) => platformStyle(name).color
export const platformShort = (name?: string | null) => platformStyle(name).short ?? name ?? '?'
export const platformMedia = (name?: string | null) => platformStyle(name).media
export const ALL_PLATFORMS = Object.keys(PLATFORMS)

// Genres are one shared list; this decides which ones a format's form shows first.
const GENRE_MEDIA: Record<string, MediaType[]> = {
  Action: ['Games', 'Movies', 'Comics'],
  Comedy: ['Movies', 'Books', 'Comics'],
  Horror: ['Games', 'Movies', 'Books', 'Comics'],
  Drama: ['Movies'],
  'Sci-Fi': ['Games', 'Movies', 'Books', 'Comics'],
  RPG: ['Games'],
  Platformer: ['Games'],
  Shooter: ['Games'],
  Sports: ['Games', 'Movies'],
  Thriller: ['Movies', 'Books'],
  Animation: ['Movies'],
  Documentary: ['Movies'],
  Rock: ['Music'],
  'Hip Hop': ['Music'],
  Jazz: ['Music'],
  Electronic: ['Music'],
  Classical: ['Music'],
  Country: ['Music'],
  'R&B': ['Music'],
  Pop: ['Music'],
  Fiction: ['Books'],
  'Non-fiction': ['Books'],
  Fantasy: ['Books', 'Comics'],
  Superhero: ['Comics'],
  Mystery: ['Books', 'Movies'],
  Romance: ['Books', 'Movies'],
  Biography: ['Books'],
  History: ['Books'],
  "Children's": ['Books'],
}

export const genreFitsMedia = (genre: string, media: MediaType) => (GENRE_MEDIA[genre] ?? MEDIA_TYPES).includes(media)

/** Hex color to rgba() with the given alpha, for glows and tints. */
export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
