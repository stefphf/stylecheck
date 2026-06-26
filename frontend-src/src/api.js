const API = '/api'

export async function apiFetch(method, path, body, isFile) {
  const token = localStorage.getItem('token')
  const opts = { method, headers: {} }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body && !isFile) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  if (isFile) opts.body = body
  const r = await fetch(API + path, opts)
  if (!r.ok) {
    const e = await r.json().catch(() => ({ detail: r.statusText }))
    throw new Error(e.detail || r.statusText)
  }
  if (r.status === 204) return null
  return r.json()
}
