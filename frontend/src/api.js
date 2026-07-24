const API_BASE = 'http://localhost:8000'
export const WS_BASE = 'ws://localhost:8000'

export const CLIENT_ID = crypto.randomUUID()

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
    ...options,
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`${options?.method || 'GET'} ${path} failed: ${res.status}`)
  }
  return res
}

export async function getBoard(boardId) {
  const res = await request(`/boards/${boardId}`)
  if (res.status === 404) return null
  return res.json()
}

export async function createBoard(name) {
  const res = await request('/boards', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export async function createNote(boardId, note) {
  const res = await request(`/boards/${boardId}/notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  })
  return res.json()
}

export async function updateNote(noteId, patch) {
  const res = await request(`/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
  return res.json()
}

export async function deleteNote(noteId) {
  await request(`/notes/${noteId}`, { method: 'DELETE' })
}
