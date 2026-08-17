import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * MessageBubble — WhatsApp-style chat bubble
 * - Long-press (mobile) or right-click (desktop) shows full-screen action menu overlay
 * - No buttons visible on the bubble itself at any time
 * - In-place editing via overlay
 */
export default function MessageBubble({ message, onEdit, onDelete, onDeleteForMe }) {
  const { id, text, isMine, timestamp, edited } = message
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(text)
  const holdTimer = useRef(null)
  const editInputRef = useRef(null)

  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Auto-focus edit input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      const len = editInputRef.current.value.length
      editInputRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  // ── Long-press handlers ─────────────────────────────
  function startHold(e) {
    if (isEditing) return
    // Only our own messages show menu
    if (!isMine) return
    holdTimer.current = setTimeout(() => {
      // vibrate on mobile
      if (navigator.vibrate) navigator.vibrate(40)
      setShowMenu(true)
    }, 450)
  }

  function cancelHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function handleContextMenu(e) {
    e.preventDefault()
    if (!isMine || isEditing) return
    setShowMenu(true)
  }

  // ── Edit ─────────────────────────────────────────────
  function startEdit() {
    setEditText(text)
    setIsEditing(true)
    setShowMenu(false)
  }

  function saveEdit(e) {
    e?.preventDefault()
    if (!editText.trim()) return
    onEdit(id, editText.trim())
    setIsEditing(false)
  }

  function cancelEdit() {
    setEditText(text)
    setIsEditing(false)
  }

  // ── Delete for everyone ──────────────────────────────
  function handleDeleteEveryone() {
    setShowMenu(false)
    onDelete(id)
  }

  // ── Delete for me (local only) ────────────────────────
  function handleDeleteForMe() {
    setShowMenu(false)
    onDeleteForMe(id)
  }

  return (
    <>
      <div className={`message-wrapper ${isMine ? 'sent' : 'received'}`}>
        <div
          className={`message-bubble ${isMine ? 'sent' : 'received'} ${showMenu ? 'menu-active' : ''}`}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onTouchMove={cancelHold}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onContextMenu={handleContextMenu}
        >
          {isEditing ? (
            <form className="message-edit-form" onSubmit={saveEdit}>
              <input
                ref={editInputRef}
                type="text"
                className="message-edit-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelEdit()
                }}
              />
              <div className="message-edit-actions">
                <button type="submit" className="btn-msg-action save">✓</button>
                <button type="button" className="btn-msg-action cancel" onClick={cancelEdit}>✕</button>
              </div>
            </form>
          ) : (
            <>
              <div className="message-text">{text}</div>
              <div className="message-meta-row">
                {edited && <span className="message-edited-tag">edited</span>}
                <span className="message-time">{time}</span>
                {isMine && (
                  <span className="message-tick">✓✓</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-screen overlay context menu (WhatsApp style) */}
      {showMenu && isMine && createPortal(
        <div
          className="message-hold-overlay"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="message-hold-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Message preview */}
            <div className="hold-panel-preview">
              <div className="hold-panel-preview-text">{text}</div>
            </div>

            <button className="hold-menu-item" onClick={startEdit}>
              <span className="hold-menu-item-icon">✏️</span>
              Edit message
            </button>
            {/* Delete for Everyone */}
            <button className="hold-menu-item delete" onClick={handleDeleteEveryone}>
              <span className="hold-menu-item-icon">🗑️</span>
              Delete for everyone
            </button>

            {/* Delete for Me */}
            <button className="hold-menu-item" onClick={handleDeleteForMe}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: '#f87171' }}>
              <span className="hold-menu-item-icon">👤</span>
              Delete for me
            </button>
            <button
              className="hold-menu-item"
              onClick={() => setShowMenu(false)}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="hold-menu-item-icon">✕</span>
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
