export interface Lookup {
  id: number
  name: string
}

export type MediaType = 'Games' | 'Music' | 'Movies' | 'Books' | 'Comics'

export interface Format extends Lookup {
  mediaType: MediaType
}

export interface ItemGenre {
  genreId: number
  genre?: Lookup | null
}

export type CatalogSource = 'manual' | 'igdb' | 'musicbrainz' | 'tmdb' | 'openlibrary' | 'gcd' | 'upc'

export interface CatalogEntry {
  id: number
  title: string
  format: Format
  releaseYear: number | null
  creator: string | null
  barcode: string | null
  coverUrl: string | null
  source: CatalogSource
  externalId: string | null
  /** Hand-typed by this user: title, format and cover are editable. */
  isPrivate: boolean
  description: string | null
}

export interface Item {
  id: number
  title: string
  formatId: number
  format?: Format | null
  conditionId: number
  condition?: Lookup | null
  purchasePrice: number
  dateAcquired: string
  storeFound: string | null
  notes: string | null
  /** Effective cover: the user's photo, else the catalog cover. */
  imageUrl: string | null
  photoUrl: string | null
  barcode: string | null
  catalogEntry: CatalogEntry
  attributes: Record<string, string>
  itemGenres?: ItemGenre[] | null
}

/** Which title a save refers to (see CatalogRefDto on the API). */
export interface CatalogRef {
  id?: number
  source: CatalogSource
  externalId?: string | null
  title: string
  formatId: number
  releaseYear?: number | null
  creator?: string | null
  coverUrl?: string | null
}

export interface ItemSave {
  catalog: CatalogRef
  conditionId: number
  purchasePrice: number
  dateAcquired: string
  storeFound?: string
  notes?: string
  photoUrl?: string | null
  barcode?: string | null
  genreIds: number[]
  attributes: Record<string, string>
}

/** A search or scan result, possibly not in the catalog yet. */
export interface Candidate {
  catalogEntryId: number | null
  source: CatalogSource
  externalId: string | null
  title: string
  formatId: number | null
  formatName: string | null
  releaseYear: number | null
  creator: string | null
  coverUrl: string | null
  barcode: string | null
  ownedCount: number
  firstOwnedItemId: number | null
  wishlistId: number | null
}

export interface ProviderInfo {
  source: CatalogSource
  name: string
  mediaType: MediaType
  configured: boolean
}

export interface AttributeDefinition {
  key: string
  label: string
  kind: 'Select' | 'Toggle' | 'Text'
  options: string[] | null
  formats: string[] | null
  placeholder: string | null
  showOnCard: boolean
}

export type Priority = 1 | 2 | 3

export interface WishlistItem {
  id: number
  title: string
  formatId: number
  format?: Format | null
  notes: string | null
  priority: Priority
  catalogEntryId: number | null
  catalogSource: CatalogSource | null
  catalogIsPrivate: boolean
  coverUrl: string | null
  creator: string | null
  releaseYear: number | null
}

export interface WishlistInput {
  title: string
  formatId: number
  notes: string
  priority: Priority
  catalog?: CatalogRef | null
}

export interface Me {
  id: number
  firstName: string
  lastName: string
  userName: string
  email: string
  isAdmin: boolean
}

export interface RegisterInput {
  userName: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export type NewsCategory = 'Games' | 'Music' | 'Movies'

export interface Headline {
  title: string
  url: string
  source: string
  category: NewsCategory
  publishedAt: string | null
  imageUrl: string | null
  summary: string | null
}

export interface NewsPost {
  id: number
  title: string
  body: string
  linkUrl: string | null
  imageUrl: string | null
  isPinned: boolean
  publishedAt: string
}

export interface NewsPostInput {
  title: string
  body: string
  linkUrl: string
  imageUrl: string
  isPinned: boolean
  publishedAt?: string
}

export type PriceCheck =
  | { low: number; high: number; average: number; count: number; searchTerm: string }
  | { message: string }

export interface CollectionValue {
  totalLow: number
  totalHigh: number
  totalAverage: number
  itemsFound: number
}
