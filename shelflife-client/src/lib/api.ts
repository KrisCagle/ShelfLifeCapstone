// Every request goes to the same origin as the page: Vite's dev proxy forwards /api
// locally, and vercel.json rewrites it in production. Same-origin means the login
// cookie is always sent, with no CORS or cross-site cookie rules involved.
const API_BASE = '/api'

/** A non-2xx response. `message` is the friendliest text the server gave us. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function parseError(response: Response): Promise<ApiError> {
  const text = await response.text()
  let message = text || response.statusText || `Request failed (${response.status})`
  let fieldErrors: Record<string, string[]> = {}
  try {
    // ASP.NET returns ProblemDetails: { title, detail, errors: { field: [msg] } }
    const body = JSON.parse(text)
    if (typeof body === 'string') message = body
    else {
      fieldErrors = body.errors ?? {}
      const firstFieldError = Object.values(fieldErrors).flat()[0] as string | undefined
      message = body.detail ?? firstFieldError ?? body.title ?? message
    }
  } catch {
    // Plain-text body; keep it as the message.
  }
  return new ApiError(response.status, message, fieldErrors)
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) throw await parseError(response)
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, json('POST', body ?? {})),
  put: <T>(path: string, body: unknown) => request<T>(path, json('PUT', body)),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
