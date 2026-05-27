const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.success) {
    const err = new Error(data.message || 'Request failed')
    err.requiresPassword = data.requiresPassword  // ← pass this through
    err.status = res.status
    throw err
  }
  return data.data
}

export const api = {
  createNote: (body) => req('POST', '/notes', body),
  getNote: (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return req('GET', `/notes/${id}${q ? '?' + q : ''}`)
  },
  updateNote: (id, body) => req('PATCH', `/notes/${id}`, body),
  deleteNote: (id, body) => req('DELETE', `/notes/${id}`, body),
  getNoteStats: (id, fingerprint) => req('GET', `/notes/${id}/stats?creatorFingerprint=${fingerprint}`),
  getGlobalStats: () => req('GET', '/notes/stats/global'),
  updateSlug: (id, body) => req('PATCH', `/notes/${id}/slug`, body),
}
