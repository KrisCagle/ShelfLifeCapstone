export interface Lookup {
  id: number
  name: string
}

export interface ItemGenre {
  id: number
  genreId: number
  genre?: Lookup | null
}

export interface Item {
  id: number
  title: string
  formatId: number
  format?: Lookup | null
  conditionId: number
  condition?: Lookup | null
  purchasePrice: number
  dateAcquired: string
  storeFound: string | null
  notes: string | null
  imageUrl: string | null
  itemGenres?: ItemGenre[] | null
}

export interface ItemInput {
  title: string
  formatId: number
  conditionId: number
  purchasePrice: number
  dateAcquired: string
  storeFound: string
  notes: string
  imageUrl: string
  genreIds: number[]
}

export type Priority = 1 | 2 | 3

export interface WishlistItem {
  id: number
  title: string
  formatId: number
  format?: Lookup | null
  notes: string | null
  priority: Priority
}

export interface WishlistInput {
  title: string
  formatId: number
  notes: string
  priority: Priority
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
