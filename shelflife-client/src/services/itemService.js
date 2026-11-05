import { apiFetch, getJson, sendJson } from './api'

export const getItems = () => getJson('/items')

export const getItemById = (id) => getJson(`/items/${id}`)

export const createItem = (item) =>
  sendJson('/items', 'POST', item).then(r => r.json())

export const updateItem = (id, item) => sendJson(`/items/${id}`, 'PUT', item)

export const deleteItem = (id) => apiFetch(`/items/${id}`, { method: 'DELETE' })

export const getEbayPrice = (title, format) =>
  getJson(`/ebay/price?title=${encodeURIComponent(title)}&format=${encodeURIComponent(format)}`)

export const getCollectionValue = (items) =>
  sendJson('/ebay/collection-value', 'POST', items).then(r => r.json())
