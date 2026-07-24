import { useState, useRef } from 'react'

const COLORS = ['#fff9b0', '#ffb3ba', '#baffc9', '#bae1ff', '#ffdfba']

function Note({ note, onDragEnd, onTextChange, onColorChange, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.text)
  const [dragPos, setDragPos] = useState(null)
  const dragState = useRef(null)

  const pos = dragPos ?? { x: note.x, y: note.y }

  function handleMouseDown(e) {
    if (editing) return
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
    }

    function handleMouseMove(ev) {
      const { startX, startY, origX, origY } = dragState.current
      setDragPos({
        x: origX + (ev.clientX - startX),
        y: origY + (ev.clientY - startY),
      })
    }

    function handleMouseUp(ev) {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      const { startX, startY, origX, origY } = dragState.current
      const finalX = origX + (ev.clientX - startX)
      const finalY = origY + (ev.clientY - startY)
      setDragPos(null)
      onDragEnd(note.id, finalX, finalY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  function finishEditing() {
    setEditing(false)
    if (text !== note.text) {
      onTextChange(note.id, text)
    }
  }

  return (
    <div
      className="note"
      style={{ left: pos.x, top: pos.y, background: note.color }}
      onMouseDown={handleMouseDown}
    >
      <button
        className="note-delete"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(note.id)}
      >
        ×
      </button>

      {editing ? (
        <textarea
          className="note-text-input"
          autoFocus
          value={text}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setText(e.target.value)}
          onBlur={finishEditing}
        />
      ) : (
        <div className="note-text" onClick={() => setEditing(true)}>
          {note.text}
        </div>
      )}

      <div className="note-colors" onMouseDown={(e) => e.stopPropagation()}>
        {COLORS.map((c) => (
          <button
            key={c}
            className="note-color-swatch"
            style={{ background: c }}
            onClick={() => onColorChange(note.id, c)}
          />
        ))}
      </div>
    </div>
  )
}

export default Note
