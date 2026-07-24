import { useEffect, useRef, useState } from 'react'
import './App.css'
import Note from './Note.jsx'
import {
  getBoard,
  createBoard,
  createNote,
  updateNote,
  deleteNote,
  CLIENT_ID,
  WS_BASE,
} from './api.js'

const HARDCODED_BOARD_ID = 1

function App() {
  const [board, setBoard] = useState(null)
  const [notes, setNotes] = useState([])
  const [status, setStatus] = useState('loading')
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      try {
        let b = await getBoard(HARDCODED_BOARD_ID)
        if (!b) {
          b = await createBoard('My Board')
        }
        setBoard(b)
        setNotes(b.notes)
        setStatus('ready')
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    }

    init()
  }, [])

  useEffect(() => {
    if (!board) return

    const ws = new WebSocket(
      `${WS_BASE}/ws/board/${board.id}?client_id=${CLIENT_ID}`
    )

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'note_created') {
        setNotes((prev) =>
          prev.some((n) => n.id === msg.note.id) ? prev : [...prev, msg.note]
        )
      } else if (msg.type === 'note_updated') {
        setNotes((prev) =>
          prev.map((n) => (n.id === msg.note.id ? { ...n, ...msg.note } : n))
        )
      } else if (msg.type === 'note_deleted') {
        setNotes((prev) => prev.filter((n) => n.id !== msg.note.id))
      }
    }

    ws.onerror = (err) => console.error('WebSocket error', err)

    return () => ws.close()
  }, [board])

  async function handleAddNote() {
    const note = await createNote(board.id, {
      text: 'New note',
      x: 40 + Math.random() * 200,
      y: 40 + Math.random() * 150,
      color: '#fff9b0',
    })
    setNotes((prev) => [...prev, note])
  }

  async function handleDragEnd(noteId, x, y) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, x, y } : n)))
    await updateNote(noteId, { x, y })
  }

  async function handleTextChange(noteId, text) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, text } : n)))
    await updateNote(noteId, { text })
  }

  async function handleColorChange(noteId, color) {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, color } : n)))
    await updateNote(noteId, { color })
  }

  async function handleDelete(noteId) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    await deleteNote(noteId)
  }

  if (status === 'loading') {
    return (
      <div className="app">
        <p>Loading board...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="app">
        <p>Could not reach the backend.</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{board.name}</h1>
        <button onClick={handleAddNote}>+ Add note</button>
      </header>
      <div className="canvas">
        {notes.map((note) => (
          <Note
            key={note.id}
            note={note}
            onDragEnd={handleDragEnd}
            onTextChange={handleTextChange}
            onColorChange={handleColorChange}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

export default App
