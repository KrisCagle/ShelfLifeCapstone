const BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const getItems = () =>
  fetch(`${BASE_URL}/items`).then(r => r.json())

export const getItemById = (id) =>
  fetch(`${BASE_URL}/items/${id}`).then(r => r.json())

export const createItem = (item) =>
  fetch(`${BASE_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(r => r.json())

export const updateItem = (id, item) =>
  fetch(`${BASE_URL}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  })

export const deleteItem = (id) =>
  fetch(`${BASE_URL}/items/${id}`, {
    method: 'DELETE'
  })

  export const getWishlist = () =>
  fetch('/api/wishlist').then(r => r.json())

export const createWishlistItem = (item) =>
  fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  }).then(r => r.json())

export const deleteWishlistItem = (id) =>
  fetch(`/api/wishlist/${id}`, {
    method: 'DELETE'
  })