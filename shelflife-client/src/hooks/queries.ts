import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CollectionValue,
  Headline,
  Item,
  ItemInput,
  Lookup,
  NewsCategory,
  NewsPost,
  NewsPostInput,
  PriceCheck,
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
}

// ── Lookups (formats, conditions, genres never change at runtime) ──────────

const useLookup = (kind: 'formats' | 'conditions' | 'genres') =>
  useQuery({
    queryKey: keys.lookup(kind),
    queryFn: () => api.get<Lookup[]>(`/${kind}`),
    staleTime: Infinity,
  })

export const useFormats = () => useLookup('formats')
export const useConditions = () => useLookup('conditions')
export const useGenres = () => useLookup('genres')

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
    mutationFn: (input: ItemInput) =>
      id ? api.put<void>(`/items/${id}`, input).then(() => undefined) : api.post<Item>('/items', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.items }),
  })
}

export function useDeleteItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.items }),
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
