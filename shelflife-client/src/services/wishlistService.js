import { apiFetch, getJson, sendJson } from './api'

export const getWishlist = () => getJson('/wishlist')

export const getWishlistItemById = (id) => getJson(`/wishlist/${id}`)

export const createWishlistItem = (item) =>
  sendJson('/wishlist', 'POST', item).then(r => r.json())

export const updateWishlistItem = (id, item) => sendJson(`/wishlist/${id}`, 'PUT', item)

export const deleteWishlistItem = (id) => apiFetch(`/wishlist/${id}`, { method: 'DELETE' })
