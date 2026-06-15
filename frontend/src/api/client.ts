const BASE_URL = 'http://localhost:8000'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

// Injected by AuthProvider on mount so the client can attach Bearer tokens
// without creating a circular dependency on the auth context.
let getToken: (() => string | null) | null = null

export function setTokenGetter(fn: () => string | null): void {
  getToken = fn
}

function buildAuthHeader(): Record<string, string> {
  const token = getToken?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeader(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Unknown error')
  }

  return res.json() as Promise<T>
}

async function postForm<T>(path: string, params: URLSearchParams): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...buildAuthHeader(),
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? 'Unknown error')
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, params: URLSearchParams) => postForm<T>(path, params),
}
