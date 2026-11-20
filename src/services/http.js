// The one place that talks HTTP to the Mangla backend. Every endpoint is
// POST <VITE_API_BASE_URL><path> with a JSON body (see the backend's docs/End-Points.md).

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(status, message, requestId = null) {
    super(message)
    this.status = status
    this.requestId = requestId
  }
}

// FastAPI's `detail` is a string, or a list of {loc, msg} for a 422 validation error.
function describe(detail, fallback) {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((e) => `${(e.loc ?? []).filter((p) => p !== 'body').join('.')}: ${e.msg}`).join('; ')
  }
  return fallback
}

export async function post(path, body) {
  if (!API_BASE_URL) throw new ApiError(0, 'VITE_API_BASE_URL is not set (see .env.example)')
  let res
  try {
    res = await fetch(API_BASE_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const requestId = data?.request_id ?? res.headers.get('X-Request-ID')
    throw new ApiError(res.status, describe(data?.detail, `Request failed (${res.status})`), requestId)
  }
  return data
}

// Message for a Toast, with the request ID so a failure can be found in the backend logs.
export function errorText(err) {
  const msg = err?.message || 'Something went wrong'
  return err?.requestId ? `${msg} (ref ${String(err.requestId).slice(0, 8)})` : msg
}
