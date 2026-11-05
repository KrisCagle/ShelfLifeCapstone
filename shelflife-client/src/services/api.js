// Every request goes to the same origin as the page: Vite's dev proxy forwards /api
// locally, and vercel.json rewrites it in production. Same-origin means the login
// cookie is always sent, with no CORS or cross-site cookie rules involved.
const API_BASE = '/api'

export const apiFetch = (path, options) => fetch(`${API_BASE}${path}`, options)

export const getJson = (path) => apiFetch(path).then(r => r.json())

export const sendJson = (path, method, body) =>
  apiFetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
