import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AttributeDefinition,
  Candidate,
  CollectionValue,
  Format,
  Headline,
  Item,
  ItemSave,
  Lookup,
  MediaType,
  NewsCategory,
  NewsPost,
  NewsPostInput,
  PriceCheck,
  ProviderInfo,
  WishlistInput,
  WishlistItem,
} from '@/lib/types'

export const keys = {
  me: ['me'] as const,
  items: ['items'] as const,
  item: (id: number) => ['items', id] as const,
  wishlist: ['wishlist'] as const,
  wishlistItem: (id: number) => ['wishlist', id] as const,
  lookup: (kind: string) => ['lookup', kind] as const,
  headlines: (category?: NewsCategory) => ['news', 'headlines', category ?? 'all'] as const,
  posts: ['news', 'posts'] as const,
  allPosts: ['news', 'posts', 'all'] as const,
  catalogSearch: (q: string, formatId: number) => ['catalog', 'search', formatId, q.trim().toLowerCase()] as const,
  barcode: (code: string) => ['catalog', 'barcode', code] as const,
}

// ── Lookups (formats, conditions, genres never change at runtime) ──────────

export const useFormats = () =>
  useQuery({ queryKey: keys.lookup('formats'), queryFn: () => api.get<Format[]>('/formats'), staleTime: Infinity })

export const useConditions = () =>
  useQuery({ queryKey: keys.lookup('conditions'), queryFn: () => api.get<Lookup[]>('/conditions'), staleTime: Infinity })

export const useGenres = () =>
  useQuery({ queryKey: keys.lookup('genres'), queryFn: () => api.get<Lookup[]>('/genres'), staleTime: Infinity })

export const useAttributeDefinitions = () =>
  useQuery({
    queryKey: keys.lookup('attributes'),
    queryFn: () => api.get<Record<MediaType, AttributeDefinition[]>>('/catalog/attributes'),
    staleTime: Infinity,
  })

// ── Catalog ────────────────────────────────────────────────────────────────

interface SearchResponse {
  results: Candidate[]
  provider: ProviderInfo | null
}

export const useCatalogSearch = (q: string, formatId: number | null) =>
  useQuery({
    queryKey: keys.catalogSearch(q, formatId ?? 0),
    queryFn: ({ signal }) =>
      fetchJson<SearchResponse>(`/catalog/search?q=${encodeURIComponent(q.trim())}&formatId=${formatId}`, signal),
    enabled: !!formatId && q.trim().length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  })

export const useBarcodeLookup = (code: string | null) =>
  useQuery({
    queryKey: keys.barcode(code ?? ''),
    queryFn: () => api.get<{ barcode: string; results: Candidate[] }>(`/catalog/barcode/${code}`),
    enabled: !!code,
    staleTime: 60_000,
  })

export const useProviders = () =>
  useQuery({ queryKey: ['catalog', 'providers'], queryFn: () => api.get<ProviderInfo[]>('/catalog/providers'), staleTime: Infinity })

// Search requests are cancelled when the user keeps typing.
const fetchJson = async <T,>(path: string, signal: AbortSignal) => {
  const response = await fetch(`/api${path}`, { signal })
  if (!response.ok) throw new Error(`Search failed (${response.status})`)
  return (await response.json()) as T
}

// ── Collection ─────────────────────────────────────────────────────────────

export const useItems = (enabled = true) =>
  useQuery({ queryKey: keys.items, queryFn: () => api.get<Item[]>('/items'), enabled })

export const useItem = (id: number) =>
  useQuery({
    queryKey: keys.item(id),
    queryFn: () => api.get<Item>(`/items/${id}`),
    enabled: Number.isFinite(id),
  })

export function useSaveItem(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ItemSave) =>
      id ? api.put<void>(`/items/${id}`, input).then(() => undefined) : api.post<Item>('/items', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.items })
      // Ownership badges in search/scan results depend on the collection.
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

/** Adds up to 100 items, all or none, then clears any that were on the wishlist. */
export function useSaveBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, wishlistIds }: { items: ItemSave[]; wishlistIds: number[] }) => {
      await api.post<Item[]>('/items/batch', { items })
      // The items are safely saved; a wishlist entry left behind is harmless.
      await Promise.allSettled(wishlistIds.map((id) => api.delete(`/wishlist/${id}`)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.items })
      queryClient.invalidateQueries({ queryKey: keys.wishlist })
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.items })
      queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
}

export const usePriceCheck = () =>
  useMutation({
    mutationFn: ({ title, format }: { title: string; format: string }) =>
      api.get<PriceCheck>(`/ebay/price?title=${encodeURIComponent(title)}&format=${encodeURIComponent(format)}`),
  })

export const useCollectionValue = () =>
  useMutation({
    mutationFn: (items: { title: string; format: string }[]) =>
      api.post<CollectionValue>('/ebay/collection-value', items),
  })

// ── Wishlist ───────────────────────────────────────────────────────────────

export const useWishlist = (enabled = true) =>
  useQuery({ queryKey: keys.wishlist, queryFn: () => api.get<WishlistItem[]>('/wishlist'), enabled })

export const useWishlistItem = (id: number) =>
  useQuery({
    queryKey: keys.wishlistItem(id),
    queryFn: () => api.get<WishlistItem>(`/wishlist/${id}`),
    enabled: Number.isFinite(id),
  })

export function useSaveWishlistItem(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: WishlistInput) =>
      id
        ? api.put<void>(`/wishlist/${id}`, input).then(() => undefined)
        : api.post<WishlistItem>('/wishlist', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.wishlist }),
  })
}

export function useDeleteWishlistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/wishlist/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.wishlist }),
  })
}

// ── News ───────────────────────────────────────────────────────────────────

export const useHeadlines = (category?: NewsCategory, limit = 24) =>
  useQuery({
    queryKey: [...keys.headlines(category), limit],
    queryFn: () =>
      api.get<Headline[]>(`/news/headlines?limit=${limit}${category ? `&category=${category}` : ''}`),
    staleTime: 10 * 60_000,
  })

export const useNewsPosts = () =>
  useQuery({ queryKey: keys.posts, queryFn: () => api.get<NewsPost[]>('/news/posts'), staleTime: 60_000 })

export const useAllNewsPosts = () =>
  useQuery({ queryKey: keys.allPosts, queryFn: () => api.get<NewsPost[]>('/news/posts/all') })

export function useSaveNewsPost(id?: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewsPostInput) =>
      id ? api.put<NewsPost>(`/news/posts/${id}`, input) : api.post<NewsPost>('/news/posts', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.posts }),
  })
}

export function useDeleteNewsPost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/news/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.posts }),
  })
}
