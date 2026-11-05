import type { NewsCategory } from './types'

interface PlatformStyle {
  color: string
  short?: string
  media: NewsCategory
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
}

const FALLBACK: PlatformStyle = { color: '#00bfff', media: 'Games' }

export const platformStyle = (name?: string | null) => (name && PLATFORMS[name]) || FALLBACK
export const platformColor = (name?: string | null) => platformStyle(name).color
export const platformShort = (name?: string | null) => platformStyle(name).short ?? name ?? '?'
export const platformMedia = (name?: string | null) => platformStyle(name).media
export const ALL_PLATFORMS = Object.keys(PLATFORMS)

// Genres are one shared list; this decides which ones a format's form shows first.
const GENRE_MEDIA: Record<string, NewsCategory[]> = {
  Action: ['Games', 'Movies'],
  Comedy: ['Movies'],
  Horror: ['Games', 'Movies'],
  Drama: ['Movies'],
  'Sci-Fi': ['Games', 'Movies'],
  RPG: ['Games'],
  Platformer: ['Games'],
  Shooter: ['Games'],
  Sports: ['Games', 'Movies'],
  Thriller: ['Movies'],
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
}

export const genreFitsMedia = (genre: string, media: NewsCategory) =>
  (GENRE_MEDIA[genre] ?? ['Games', 'Music', 'Movies']).includes(media)

/** Hex color to rgba() with the given alpha, for glows and tints. */
export function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
